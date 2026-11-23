class ToolRegistry:

    def __init__(self):
        self._tools = {}

    def register(self, name: str, tool):
        if name in self._tools:
            raise ValueError(
                f"Tool '{name}' is already registered."
            )

        self._tools[name] = tool

    def get(self, name: str):
        tool = self._tools.get(name)

        if tool is None:
            raise KeyError(
                f"Tool '{name}' is not registered."
            )

        return tool

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())