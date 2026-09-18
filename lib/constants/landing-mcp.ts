import Claude from "@lobehub/icons/es/Claude";
import Cline from "@lobehub/icons/es/Cline";
import Copilot from "@lobehub/icons/es/Copilot";
import Cursor from "@lobehub/icons/es/Cursor";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Windsurf from "@lobehub/icons/es/Windsurf";
import type { McpIde, McpRotationAgent, options } from "@/lib/types/landing-mcp";
import CliDocsPage from "@/app/(public)/mcp-cli/page";
import { CLICard } from "@/app/components/shared/cli-mcp";
import { LandingMcp } from "@/app/components/home/landing-mcp";

const CLI_PACKAGE_NAME = "@getskillmd/cli";
const KEY_PLACEHOLDER = "your API key";
const NPM_PACKAGE = "@getskillmd/mcp";
const HOSTED_URL = "https://getskillmd.com/api/mcp";
const ACCOUNT_URL = "https://getskillmd.com/account";
const API_KEY_ENV = "GETSKILLMD_API_KEY";
const LOGIN_COMMAND = `npx ${CLI_PACKAGE_NAME} login`;

const CLAUDE_CONFIG_PATH = "~/.claude.json";
const CURSOR_CONFIG_PATH = "~/.cursor/mcp.json";
const WINDSURF_CONFIG_PATH = "~/.codeium/windsurf/mcp_config.json";
const VSCODE_CONFIG_PATH = ".vscode/mcp.json";

const STDIO_JSON = `{
  "mcpServers": {
    "skillmd": {
      "command": "npx",
      "args": ["-y", "${NPM_PACKAGE}"]
    }
  }
}`;

const VSCODE_JSON = `{
  "servers": {
    "skillmd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "${NPM_PACKAGE}"]
    }
  }
}`;

const CLAUDE_CLI = `claude mcp add skillmd -- npx -y ${NPM_PACKAGE}`;

const STDIO_JSON_API_KEY = `{
  "mcpServers": {
    "skillmd": {
      "command": "npx",
      "args": ["-y", "${NPM_PACKAGE}"],
      "env": { "${API_KEY_ENV}": "${KEY_PLACEHOLDER}" }
    }
  }
}`;

const VSCODE_JSON_API_KEY = `{
  "servers": {
    "skillmd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "${NPM_PACKAGE}"],
      "env": { "${API_KEY_ENV}": "${KEY_PLACEHOLDER}" }
    }
  }
}`;

const CLAUDE_CLI_API_KEY = `claude mcp add skillmd \\
  --env ${API_KEY_ENV}=${KEY_PLACEHOLDER} \\
  -- npx -y ${NPM_PACKAGE}`;


const CI_NOTE_LABEL = "No Browser?";
const CI_NOTE_DESCRIPTION = `If you can't open a browser to sign in, create an API key from your ${ACCOUNT_URL} and use that instead.`;

export const LANDING_MCP = {
  eyebrow: "MCP",
  title: "Plug skillmd into",
  titleAccent: "any agent",
  description:
    "Add the skillmd MCP and your coding agent can generate, search, and read skill.md files without leaving the editor.",
  rotation: [
    { id: "claude", label: "Claude Code", Icon: Claude },
    { id: "cursor", label: "Cursor", Icon: Cursor },
    { id: "chatgpt", label: "ChatGPT", Icon: OpenAI },
    { id: "windsurf", label: "Windsurf", Icon: Windsurf },
    { id: "copilot", label: "VS Code", Icon: Copilot },
    { id: "gemini", label: "Gemini", Icon: Gemini },
    { id: "cline", label: "Cline", Icon: Cline },
  ] as McpRotationAgent[],
  tools: [
    {
      name: "Generate Skills",
      description:
        "Turn websites, documentation, APIs, or GitHub repositories into reusable AI skills.",
    },
    {
      name: "Import Design Inspiration",
      description:
        "Extract colors, typography, layouts, and components from websites, Figma, Dribbble, Pinterest, or images.",
    },
    {
      name: "Extract API & Library Docs",
      description:
        "Convert API references and library documentation into structured skills your AI can understand.",
    },
    {
      name: "Explore Your Skill Library",
      description:
        "Browse, search, and instantly access your saved and bookmarked skills.",
    },
    {
      name: "Preview Brand Assets",
      description:
        "View screenshots and visual references to recreate designs with greater accuracy.",
    },
    {
      name: "Verify Your Implementation",
      description:
        "Compare your work with the original design and get actionable suggestions for improvement.",
    },
  
  ],
  ides: [
    {
      id: "claude",
      label: "Claude Code",
      Icon: Claude,
      configPath: CLAUDE_CONFIG_PATH,
      blocks: [
        { language: "bash", label: "CLI", code: CLAUDE_CLI },
        { language: "json", label: "JSON", code: STDIO_JSON },
      ],
      ciNote: {
        label: CI_NOTE_LABEL,
        description: CI_NOTE_DESCRIPTION,
        block: { language: "bash", label: "CLI", code: CLAUDE_CLI_API_KEY },
      },
      prompt: `Add the skillmd MCP to my Claude Code config. First run \`${LOGIN_COMMAND}\` to sign in through the browser, then run \`${CLAUDE_CLI}\` — no API key needed. For CI or headless setups, add \`--env ${API_KEY_ENV}=<my-key>\` to that command instead (create a key at ${ACCOUNT_URL}).`,
    },
    {
      id: "cursor",
      label: "Cursor",
      Icon: Cursor,
      configPath: CURSOR_CONFIG_PATH,
      blocks: [{ language: "json", label: "JSON", code: STDIO_JSON }],
      ciNote: {
        label: CI_NOTE_LABEL,
        description: CI_NOTE_DESCRIPTION,
        block: { language: "json", label: "JSON", code: STDIO_JSON_API_KEY },
      },
      prompt: `Set up the skillmd MCP server in Cursor. First run \`${LOGIN_COMMAND}\` so I can sign in through the browser, then add this to ${CURSOR_CONFIG_PATH} — no API key needed:\n\n${STDIO_JSON}\n\nFor CI or headless setups, add an "env" block with ${API_KEY_ENV} (create a key at ${ACCOUNT_URL}).`,
    },
    {
      id: "windsurf",
      label: "Windsurf",
      Icon: Windsurf,
      configPath: WINDSURF_CONFIG_PATH,
      blocks: [{ language: "json", label: "JSON", code: STDIO_JSON }],
      ciNote: {
        label: CI_NOTE_LABEL,
        description: CI_NOTE_DESCRIPTION,
        block: { language: "json", label: "JSON", code: STDIO_JSON_API_KEY },
      },
      prompt: `Install the skillmd MCP server in Windsurf. First run \`${LOGIN_COMMAND}\` so I can sign in through the browser, then add this JSON to ${WINDSURF_CONFIG_PATH} — no API key needed:\n\n${STDIO_JSON}\n\nFor CI or headless setups, add an "env" block with ${API_KEY_ENV} (create a key at ${ACCOUNT_URL}).`,
    },
    {
      id: "copilot",
      label: "VS Code",
      Icon: Copilot,
      configPath: VSCODE_CONFIG_PATH,
      blocks: [{ language: "json", label: "JSON", code: VSCODE_JSON }],
      ciNote: {
        label: CI_NOTE_LABEL,
        description: CI_NOTE_DESCRIPTION,
        block: { language: "json", label: "JSON", code: VSCODE_JSON_API_KEY },
      },
      prompt: `Configure the skillmd MCP in VS Code with GitHub Copilot. First run \`${LOGIN_COMMAND}\` so I can sign in through the browser, then create ${VSCODE_CONFIG_PATH} with this config — no API key needed:\n\n${VSCODE_JSON}\n\nFor CI or headless setups, add an "env" block with ${API_KEY_ENV} (create a key at ${ACCOUNT_URL}).`,
    },
  ] as McpIde[],
  options: [
    {
      id: "mcp",
      label: "MCP",
      Icon: Claude,
      component: LandingMcp,
      prompt: `Add the skillmd MCP to my Claude Code config. First run \`${LOGIN_COMMAND}\` to sign in through the browser, then run \`${CLAUDE_CLI}\` — no API key needed. For CI or headless setups, add \`--env ${API_KEY_ENV}=<my-key>\` to that command instead (create a key at ${ACCOUNT_URL}).`,
    },
    {
      id: "cli",
      label: "CLI",
      Icon: Cursor,
      component: CLICard,
      prompt: `Set up the skillmd MCP server in Cursor. First run \`${LOGIN_COMMAND}\` so I can sign in through the browser, then add this to ${CURSOR_CONFIG_PATH} — no API key needed:\n\n${STDIO_JSON}\n\nFor CI or headless setups, add an "env" block with ${API_KEY_ENV} (create a key at ${ACCOUNT_URL}).`,
    }
  ] as options[] ,
  universalPrompt: `Install the skillmd MCP server in this IDE. First run \`${LOGIN_COMMAND}\` so I can sign in through the browser, then add the ${NPM_PACKAGE} package via \`npx -y ${NPM_PACKAGE}\` over stdio — no API key needed. For CI or headless setups, skip the login and set ${API_KEY_ENV} (create a key at ${ACCOUNT_URL}) in the server's env block instead.`,
  hosted: {
    url: HOSTED_URL,
    description:
      "Or skip the install. Connect any Streamable HTTP MCP client directly to this hosted endpoint. OAuth clients sign in through your browser automatically, while other clients can authenticate using a Bearer API key.",
  },
  npmPackage: NPM_PACKAGE,
  accountUrl: ACCOUNT_URL,
} as const;

export const LANDING_MCP_TEASER = {
  primaryLabel: "View MCP setup",
  primaryHref: "/mcp-cli",
  secondaryLabel: "Hosted endpoint",
  secondaryHref: "/mcp-cli#hosted",
} as const;
