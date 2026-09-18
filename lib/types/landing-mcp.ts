import type { ComponentType } from "react";

export interface McpIdeIconProps {
  className?: string;
  "aria-label"?: string;
}

export type McpIdeIcon = ComponentType<McpIdeIconProps>;

export interface McpIdeBlock {
  language: "json" | "toml" | "bash";
  label: string;
  code: string;
}

export interface McpIdeNote {
  label: string;
  description: string;
  block: McpIdeBlock;
}

export interface McpIde {
  id: string;
  label: string;
  Icon: McpIdeIcon;
  configPath: string;
  blocks: McpIdeBlock[];
  ciNote: McpIdeNote;
  prompt: string;
}

export interface options {
  id: string;
  label: string;
  Icon: McpIdeIcon;
  component: ComponentType;
  prompt: string;
}


export interface McpRotationAgent {
  id: string;
  label: string;
  Icon: McpIdeIcon;
}
