
import asyncio
from typing import Any

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)


class BrowserRuntime:
    """
    Real browser runtime for Scrapify.

    Provides browser operations for the Executor and Observer.
    Each runtime instance owns its browser session.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._playwright = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None

    async def start(self) -> None:
        if self.page is not None and not self.page.is_closed():
            return

        self._playwright = await async_playwright().start()

        try:
            self.browser = await self._playwright.chromium.launch(
                headless=self.headless
            )
            self.context = await self.browser.new_context(
                accept_downloads=True
            )
            self.page = await self.context.new_page()
        except Exception:
            await self._playwright.stop()
            self._playwright = None
            raise

    def _require_page(self) -> Page:
        if self.page is None or self.page.is_closed():
            raise RuntimeError(
                "Browser is not running. Call start() first."
            )
        return self.page

    async def open_url(self, url: str) -> None:
        page = self._require_page()
        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30_000,
        )

    async def search(self, query: str) -> None:
        page = self._require_page()

        # Search the current page's active search input.
        search_input = page.locator(
            'input[type="search"], '
            'input[name="q"], '
            'input[name="query"], '
            'input[placeholder*="search" i]'
        ).first

        await search_input.fill(query)
        await search_input.press("Enter")
        await page.wait_for_load_state(
            "domcontentloaded",
            timeout=15_000,
        )

    async def click(self, selector: str) -> None:
        page = self._require_page()
        await page.locator(selector).first.click(timeout=15_000)

    async def fill(self, selector: str, value: str) -> None:
        page = self._require_page()
        await page.locator(selector).first.fill(
            value,
            timeout=15_000,
        )

    
    
    async def extract(self, fields: list[str]) -> dict[str, Any]:
        page = self._require_page()
        data: dict[str, Any] = {}

        for field in fields:
            if field == "title":
                data["title"] = await page.title()

            elif field == "url":
                data["url"] = page.url

            elif field in ("text", "page_text"):
                data[field] = await page.locator("body").inner_text()

            elif field == "links":
                data["links"] = await page.locator("a").evaluate_all(
                    """elements => {
                        const seen = new Set();
                        const results = [];

                        for (const a of elements) {
                            const href = a.href || "";
                            const text = (a.innerText || a.getAttribute("aria-label") || "").trim();

                            if (!href || (!text && !a.querySelector("img"))) continue;
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
                            '[class~="product"]',
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
                                '[itemprop="price"], ' +
                                '[data-price], ' +
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

                            const hasProductClass = (
                                /product|grid-product|card-wrapper/i.test(
                                    String(card.className || "")
                                ) ||
                                card.hasAttribute("data-product") ||
                                card.hasAttribute("data-product-id") ||
                                card.matches('[data-testid*="product" i]')
                            );

                            const hasPrice = Boolean(priceElement || (
                                /[$£€₦]\\s?\\d|\\d[.,]\\d{2}\\s?[$£€₦]/.test(text)
                            ));

                            // Avoid treating generic page sections as products.
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

                        // Prefer the most specific nested product cards.
                        products = products.filter(product => {
                            return !Array.from(candidates).some(parent => {
                                if (parent === undefined) return false;

                                const nested = Array.from(
                                    parent.querySelectorAll(
                                        selectors.join(",")
                                    )
                                );

                                if (nested.length === 0) return false;

                                return nested.some(child => {
                                    if (child === parent) return false;

                                    const childProduct = getProduct(child);
                                    return childProduct &&
                                        (
                                            childProduct.url === product.url ||
                                            (
                                                childProduct.name === product.name &&
                                                childProduct.price === product.price
                                            )
                                        );
                                });
                            });
                        });

                        // Fallback for stores without recognizable product classes.
                        if (products.length === 0) {
                            const fallback = [];

                            for (const link of body.querySelectorAll("a[href]")) {
                                const image = link.querySelector("img");
                                const text = (link.innerText || "").trim();

                                const parent = link.closest(
                                    '[class*="product" i], li, article'
                                );

                                const card = parent || link;
                                const product = getProduct(card);

                                if (product && (image || product.price)) {
                                    fallback.push(product);
                                } else if (image && text) {
                                    fallback.push({
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

                            products = fallback;
                        }

                        // Deduplicate by URL, or by name and price if URL is absent.
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
                # Treat other fields as CSS selectors.
                data[field] = await page.locator(field).all_inner_texts()

        return data

    async def scroll(self, direction: str) -> None:
        if direction not in ("up", "down"):
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
                timeout=15_000
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
        """Extract data across pages using a next-page link."""
        page = self._require_page()

        if fields is None:
            fields = ["products"]

        if not fields or not all(isinstance(field, str) for field in fields):
            raise ValueError("fields must be a non-empty list of strings.")

        if (
            isinstance(max_pages, bool)
            or not isinstance(max_pages, int)
            or not 1 <= max_pages <= 20
        ):
            raise ValueError("max_pages must be between 1 and 20.")

        collected: dict[str, Any] = {}
        visited_urls: set[str] = set()
        pages_visited = 0

        def merge_values(field: str, old: Any, new: Any) -> Any:
            if isinstance(old, list) and isinstance(new, list):
                combined = old + new

                if field == "products":
                    seen = set()
                    unique = []

                    for item in combined:
                        if not isinstance(item, dict):
                            unique.append(item)
                            continue

                        key = (
                            item.get("url")
                            or f"{item.get('name', '')}|{item.get('price', '')}"
                        )

                        if key not in seen:
                            seen.add(key)
                            unique.append(item)

                    return unique

                if field == "links":
                    seen = set()
                    unique = []

                    for item in combined:
                        if not isinstance(item, dict):
                            unique.append(item)
                            continue

                        key = item.get("href") or item.get("text", "")

                        if key not in seen:
                            seen.add(key)
                            unique.append(item)

                    return unique

                if field == "images":
                    seen = set()
                    unique = []

                    for item in combined:
                        if not isinstance(item, dict):
                            unique.append(item)
                            continue

                        key = item.get("src") or item.get("alt", "")

                        if key not in seen:
                            seen.add(key)
                            unique.append(item)

                    return unique

                return combined

            return new

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

            # Use the supplied selector, or try common next-page patterns.
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
                        candidate = await page.evaluate(
                            "(href) => new URL(href, window.location.href).href",
                            href,
                        )

                        if candidate not in visited_urls:
                            next_url = candidate
                            break
                    else:
                        # Buttons may trigger JavaScript pagination.
                        old_url = page.url
                        old_text = await page.locator("body").inner_text()

                        await locator.click(timeout=5_000)

                        try:
                            await page.wait_for_function(
                                """old => window.location.href !== old""",
                                arg=old_url,
                                timeout=2_000,
                            )
                        except Exception:
                            await page.wait_for_timeout(500)

                        new_url = page.url
                        new_text = await page.locator("body").inner_text()

                        if (
                            new_url != old_url
                            or new_text != old_text
                        ):
                            next_url = new_url
                            break

                except Exception:
                    continue

            if not next_url or next_url in visited_urls:
                break

            await page.goto(
                next_url,
                wait_until="domcontentloaded",
                timeout=30_000,
            )

        collected["pages_visited"] = pages_visited
        collected["pages"] = list(visited_urls)

        return collected

    async def close(self) -> None:
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
