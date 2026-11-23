import asyncio
import ipaddress
import socket
from typing import Any
from urllib.parse import urlsplit, urljoin

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Route,
    async_playwright,
)


class BrowserRuntime:
    """
    Scrapify browser runtime.

    Provides browser navigation, interaction, extraction, pagination,
    downloads, and network destination validation.

    Security verification pages are detected by the agent's Observer.
    This runtime does not attempt to bypass website security challenges.
    """

    NAVIGATION_TIMEOUT = 30_000
    ACTION_TIMEOUT = 15_000
    MAX_PAGES = 20

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._playwright = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self._blocked_requests: list[dict[str, str]] = []

    async def start(self) -> None:
        if self.page is not None and not self.page.is_closed():
            return

        self._playwright = await async_playwright().start()

        try:
            self.browser = await self._playwright.chromium.launch(
                headless=self.headless
            )

            self.context = await self.browser.new_context(
                accept_downloads=True,
                service_workers="block",
            )

            # Validate browser requests, including redirects and subresources.
            await self.context.route("**/*", self._guard_request)

            self.page = await self.context.new_page()

        except Exception:
            if self.browser is not None:
                await self.browser.close()
                self.browser = None

            await self._playwright.stop()
            self._playwright = None
            self.context = None
            self.page = None
            raise

    def _require_page(self) -> Page:
        if self.page is None or self.page.is_closed():
            raise RuntimeError(
                "Browser is not running. Call start() first."
            )

        return self.page

    @staticmethod
    def _is_public_ip(value: str) -> bool:
        try:
            address = ipaddress.ip_address(value)

            if isinstance(address, ipaddress.IPv6Address):
                if address.ipv4_mapped is not None:
                    address = address.ipv4_mapped

            return address.is_global

        except ValueError:
            return False

    @classmethod
    def _validate_network_url(cls, url: str) -> None:
        """Allow HTTP(S) URLs resolving exclusively to public IP addresses."""

        if not isinstance(url, str) or not url.strip():
            raise ValueError("A non-empty URL is required.")

        try:
            parsed = urlsplit(url.strip())
            scheme = parsed.scheme.lower()
            hostname = parsed.hostname
            port = parsed.port

        except ValueError as exc:
            raise ValueError("Invalid URL.") from exc

        if scheme not in {"http", "https"}:
            raise ValueError("Only HTTP and HTTPS URLs are allowed.")

        if not hostname:
            raise ValueError("URL must include a hostname.")

        if parsed.username is not None or parsed.password is not None:
            raise ValueError(
                "URLs containing embedded credentials are not allowed."
            )

        if port is not None and not 1 <= port <= 65535:
            raise ValueError("Invalid URL port.")

        hostname = hostname.rstrip(".").lower()

        if (
            hostname in {"localhost", "localhost.localdomain"}
            or hostname.endswith(
                (
                    ".localhost",
                    ".local",
                    ".internal",
                    ".test",
                    ".invalid",
                )
            )
        ):
            raise ValueError(
                "Local and internal hostnames are not allowed."
            )

        # Reject non-public literal IP addresses.
        try:
            ipaddress.ip_address(hostname)

        except ValueError:
            pass

        else:
            if not cls._is_public_ip(hostname):
                raise ValueError(
                    "Private, local, or reserved IP addresses are not allowed."
                )
            return

        # Resolve all DNS records and reject mixed public/private answers.
        try:
            records = socket.getaddrinfo(
                hostname,
                port or (443 if scheme == "https" else 80),
                type=socket.SOCK_STREAM,
            )

        except socket.gaierror as exc:
            raise ValueError(
                "The URL hostname could not be resolved."
            ) from exc

        addresses = {record[4][0] for record in records}

        if not addresses:
            raise ValueError(
                "The hostname did not resolve to an IP address."
            )

        if any(
            not cls._is_public_ip(address)
            for address in addresses
        ):
            raise ValueError(
                "The URL resolves to a private, local, or reserved IP address."
            )

    async def _guard_request(self, route: Route) -> None:
        """Validate each routed browser request before allowing it."""

        request_url = route.request.url

        try:
            parsed = urlsplit(request_url)
        except ValueError as exc:
            self._blocked_requests.append(
                {"url": request_url, "reason": str(exc)}
            )
            await route.abort("blockedbyclient")
            return

        # These schemes do not initiate ordinary network requests.
        if parsed.scheme.lower() in {"data", "blob", "about"}:
            await route.continue_()
            return

        try:
            await asyncio.to_thread(
                self._validate_network_url,
                request_url,
            )

        except Exception as exc:
            self._blocked_requests.append(
                {"url": request_url, "reason": str(exc)}
            )
            await route.abort("blockedbyclient")
            return

        await route.continue_()

    async def open_url(self, url: str) -> None:
        page = self._require_page()

        await asyncio.to_thread(
            self._validate_network_url,
            url,
        )

        self._blocked_requests = []

        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=self.NAVIGATION_TIMEOUT,
        )

        # Validate the final URL after navigation in case of redirects.
        await asyncio.to_thread(
            self._validate_network_url,
            page.url,
        )

    async def search(self, query: str) -> None:
        if not isinstance(query, str) or not query.strip():
            raise ValueError("Search query must be a non-empty string.")

        page = self._require_page()

        selectors = (
            'input[type="search"], '
            'input[name="q"], '
            'input[name="query"], '
            'input[placeholder*="search" i]'
        )

        search_input = page.locator(selectors).first
        await search_input.fill(query)
        await search_input.press("Enter")

        await page.wait_for_load_state(
            "domcontentloaded",
            timeout=self.NAVIGATION_TIMEOUT,
        )

        await asyncio.to_thread(
            self._validate_network_url,
            page.url,
        )

    async def click(self, selector: str) -> None:
        if not isinstance(selector, str) or not selector.strip():
            raise ValueError("A valid CSS selector is required.")

        page = self._require_page()

        await page.locator(selector).first.click(
            timeout=self.ACTION_TIMEOUT
        )

    async def fill(self, selector: str, value: str) -> None:
        if not isinstance(selector, str) or not selector.strip():
            raise ValueError("A valid CSS selector is required.")

        if not isinstance(value, str):
            raise ValueError("The input value must be a string.")

        page = self._require_page()

        await page.locator(selector).first.fill(
            value,
            timeout=self.ACTION_TIMEOUT,
        )

    async def extract(self, fields: list[str]) -> dict[str, Any]:
        page = self._require_page()

        if not isinstance(fields, list) or not all(
            isinstance(field, str) and field.strip()
            for field in fields
        ):
            raise ValueError(
                "fields must be a list of non-empty strings."
            )

        data: dict[str, Any] = {}

        for field in fields:
            if field == "title":
                data["title"] = await page.title()

            elif field == "url":
                data["url"] = page.url

            elif field in {"text", "page_text"}:
                data[field] = await page.locator("body").inner_text()

            elif field == "links":
                data["links"] = await page.locator("a").evaluate_all(
                    """elements => {
                        const seen = new Set();
                        const results = [];

                        for (const a of elements) {
                            const href = a.href || "";
                            const text = (
                                a.innerText ||
                                a.getAttribute("aria-label") ||
                                ""
                            ).trim();

                            if (!href || (!text && !a.querySelector("img"))) {
                                continue;
                            }

                            if (seen.has(href)) continue;
                            seen.add(href);

                            results.push({
                                text: text || a.querySelector("img")?.alt || "",
                                href
                            });
                        }

                        return results;
                    }"""
                )

            elif field == "images":
                data["images"] = await page.locator("img").evaluate_all(
                    """elements => {
                        const seen = new Set();
                        const results = [];

                        for (const img of elements) {
                            const src =
                                img.currentSrc ||
                                img.getAttribute("data-src") ||
                                img.getAttribute("data-lazy-src") ||
                                img.src ||
                                "";

                            if (!src || seen.has(src)) continue;
                            seen.add(src);

                            results.push({
                                alt: img.alt || "",
                                src
                            });
                        }

                        return results;
                    }"""
                )

            elif field == "products":
                data["products"] = await page.locator("body").evaluate(
                    """body => {
                        const selectors = [
                            '[data-product]',
                            '[data-product-id]',
                            '[data-testid*="product" i]',
                            '[class*="product-card" i]',
                            '[class*="product-item" i]',
                            'li.product',
                            '.grid-product',
                            '.card-wrapper'
                        ];

                        const candidates = new Set();

                        for (const selector of selectors) {
                            for (const element of body.querySelectorAll(selector)) {
                                candidates.add(element);
                            }
                        }

                        const getProduct = card => {
                            const text = (card.innerText || "").trim();

                            const link = card.matches("a[href]")
                                ? card
                                : card.querySelector(
                                    'a[href*="/products/"], ' +
                                    'a[href*="/product/"], a[href]'
                                );

                            const image = card.querySelector("img");

                            const heading = card.querySelector(
                                '[itemprop="name"], h1, h2, h3, h4, ' +
                                '[class*="product-title" i], ' +
                                '[class*="product-name" i]'
                            );

                            const priceElement = card.querySelector(
                                '[itemprop="price"], [data-price], ' +
                                '[class*="price" i], ' +
                                '[data-testid*="price" i], ' +
                                '[aria-label*="price" i]'
                            );

                            const name = (
                                heading?.innerText ||
                                heading?.getAttribute("content") ||
                                image?.alt ||
                                link?.innerText ||
                                card.getAttribute("aria-label") ||
                                ""
                            ).trim();

                            let price = (
                                priceElement?.getAttribute("content") ||
                                priceElement?.getAttribute("data-price") ||
                                priceElement?.innerText ||
                                priceElement?.getAttribute("aria-label") ||
                                ""
                            ).trim();

                            const imageUrl = image
                                ? (
                                    image.currentSrc ||
                                    image.getAttribute("data-src") ||
                                    image.getAttribute("data-lazy-src") ||
                                    image.getAttribute("data-original") ||
                                    image.src ||
                                    ""
                                )
                                : "";

                            const hasProductClass =
                                /product|grid-product|card-wrapper/i.test(
                                    String(card.className || "")
                                ) ||
                                card.hasAttribute("data-product") ||
                                card.hasAttribute("data-product-id") ||
                                card.matches('[data-testid*="product" i]');

                            const hasPrice = Boolean(
                                priceElement ||
                                /[$£€₦]\\s?\\d|\\d[.,]\\d{2}\\s?[$£€₦]/.test(text)
                            );

                            if (!name && !hasPrice) return null;
                            if (!hasProductClass && !hasPrice) return null;

                            if (!price && hasPrice) {
                                const match = text.match(
                                    /(?:[$£€₦]\\s?\\d[\\d,.]*|\\d[\\d,.]*\\s?[$£€₦])/
                                );

                                price = match ? match[0] : "";
                            }

                            return {
                                name,
                                price,
                                url: link?.href || "",
                                image: imageUrl,
                                text
                            };
                        };

                        let products = Array.from(candidates)
                            .map(getProduct)
                            .filter(Boolean);

                        if (products.length === 0) {
                            for (const link of body.querySelectorAll("a[href]")) {
                                const image = link.querySelector("img");
                                const text = (link.innerText || "").trim();

                                if (!image || !text) continue;

                                products.push({
                                    name: image.alt || text,
                                    price: "",
                                    url: link.href,
                                    image:
                                        image.currentSrc ||
                                        image.getAttribute("data-src") ||
                                        image.src ||
                                        "",
                                    text
                                });
                            }
                        }

                        const seen = new Set();

                        return products.filter(product => {
                            const key = product.url
                                ? product.url
                                : `${product.name}|${product.price}`;

                            if (!product.name && !product.url) return false;
                            if (seen.has(key)) return false;

                            seen.add(key);
                            return true;
                        });
                    }"""
                )

            else:
                # Treat unknown field names as CSS selectors.
                data[field] = await page.locator(field).all_inner_texts()

        return data

    async def scroll(self, direction: str) -> None:
        if direction not in {"up", "down"}:
            raise ValueError("Direction must be 'up' or 'down'.")

        page = self._require_page()
        distance = -600 if direction == "up" else 600

        await page.evaluate(
            "(distance) => window.scrollBy(0, distance)",
            distance,
        )

    async def wait(self, seconds: int | float = 2) -> None:
        if (
            isinstance(seconds, bool)
            or not isinstance(seconds, (int, float))
            or seconds < 0
        ):
            raise ValueError(
                "Wait duration must be a non-negative number."
            )

        await asyncio.sleep(seconds)

    async def get_page_text(self) -> str:
        page = self._require_page()
        return await page.locator("body").inner_text()

    async def get_current_url(self) -> str:
        return self._require_page().url

    async def get_page_title(self) -> str:
        return await self._require_page().title()

    async def download(
        self,
        selector: str,
        save_path: str,
    ) -> dict[str, str]:
        page = self._require_page()

        async with page.expect_download() as download_info:
            await page.locator(selector).first.click(
                timeout=self.ACTION_TIMEOUT
            )

        download = await download_info.value
        await download.save_as(save_path)

        return {
            "filename": download.suggested_filename,
            "path": save_path,
        }

    async def paginate(
        self,
        fields: list[str] | None = None,
        next_selector: str | None = None,
        max_pages: int = 5,
    ) -> dict[str, Any]:
        """Extract and combine data from multiple pages."""

        page = self._require_page()

        if fields is None:
            fields = ["products"]

        if not fields or not all(
            isinstance(field, str) and field.strip()
            for field in fields
        ):
            raise ValueError(
                "fields must be a non-empty list of strings."
            )

        if (
            isinstance(max_pages, bool)
            or not isinstance(max_pages, int)
            or not 1 <= max_pages <= self.MAX_PAGES
        ):
            raise ValueError(
                f"max_pages must be between 1 and {self.MAX_PAGES}."
            )

        collected: dict[str, Any] = {}
        visited_urls: set[str] = set()
        pages_visited = 0

        def merge_values(field: str, old: Any, new: Any) -> Any:
            if not isinstance(old, list) or not isinstance(new, list):
                return new

            combined = old + new

            if field not in {"products", "links", "images"}:
                return combined

            seen = set()
            unique = []

            for item in combined:
                if not isinstance(item, dict):
                    unique.append(item)
                    continue

                if field == "products":
                    key = item.get("url") or (
                        f"{item.get('name', '')}|{item.get('price', '')}"
                    )
                elif field == "links":
                    key = item.get("href") or item.get("text", "")
                else:
                    key = item.get("src") or item.get("alt", "")

                if key not in seen:
                    seen.add(key)
                    unique.append(item)

            return unique

        while pages_visited < max_pages:
            current_url = page.url

            if current_url in visited_urls:
                break

            visited_urls.add(current_url)
            pages_visited += 1

            page_data = await self.extract(fields)

            for field, value in page_data.items():
                if field not in collected:
                    collected[field] = value
                else:
                    collected[field] = merge_values(
                        field,
                        collected[field],
                        value,
                    )

            if pages_visited >= max_pages:
                break

            selectors = (
                [next_selector]
                if next_selector
                else [
                    'a[rel="next"]',
                    'a[aria-label*="next" i]',
                    'a[title*="next" i]',
                    'a.pagination-next',
                    '.pagination a.next',
                    'button[aria-label*="next" i]',
                ]
            )

            next_url = None

            for selector in selectors:
                locator = page.locator(selector).last

                try:
                    if await locator.count() == 0:
                        continue

                    if not await locator.is_visible():
                        continue

                    if await locator.is_disabled():
                        continue

                    href = await locator.get_attribute("href")

                    if href:
                        candidate = urljoin(page.url, href)

                        await asyncio.to_thread(
                            self._validate_network_url,
                            candidate,
                        )

                        if candidate not in visited_urls:
                            next_url = candidate
                            break

                    else:
                        # JavaScript pagination: click and inspect the result.
                        old_url = page.url
                        old_text = await page.locator("body").inner_text()

                        await locator.click(timeout=5_000)

                        try:
                            await page.wait_for_function(
                                "(old) => window.location.href !== old",
                                arg=old_url,
                                timeout=2_000,
                            )
                        except Exception:
                            await page.wait_for_timeout(500)

                        new_url = page.url
                        new_text = await page.locator("body").inner_text()

                        if new_url != old_url or new_text != old_text:
                            await asyncio.to_thread(
                                self._validate_network_url,
                                new_url,
                            )

                            if new_url not in visited_urls:
                                next_url = new_url
                                break

                except Exception:
                    continue

            if not next_url or next_url in visited_urls:
                break

            # The browser request guard validates the destination and redirects.
            await page.goto(
                next_url,
                wait_until="domcontentloaded",
                timeout=self.NAVIGATION_TIMEOUT,
            )

            await asyncio.to_thread(
                self._validate_network_url,
                page.url,
            )

        collected["pages_visited"] = pages_visited
        collected["pages"] = list(visited_urls)

        return collected

    async def close(self) -> None:
        """Close browser resources safely."""

        try:
            if self.context is not None:
                await self.context.close()
        finally:
            self.context = None
            self.page = None

            try:
                if self.browser is not None:
                    await self.browser.close()
            finally:
                self.browser = None

                if self._playwright is not None:
                    await self._playwright.stop()
                    self._playwright = None