class BrowserTools:

    def __init__(self, browser):
        self.browser = browser

    async def open_url(self, url: str):
        return await self.browser.open_url(url)

    async def search(self, query: str):
        return await self.browser.search(query)

    async def click(self, selector: str):
        return await self.browser.click(selector)

    async def extract(self, fields: list[str]):
        return await self.browser.extract(fields)

    async def wait(self, seconds: int = 2):
        return await self.browser.wait(seconds)