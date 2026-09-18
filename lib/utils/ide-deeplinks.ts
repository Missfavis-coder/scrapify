interface IdeLinks {
  cursor: string;
  vscode: string;
  claudeCode: string;
}

export function buildIdeLinks(skillSlug: string, skillMd: string | null): IdeLinks {
  const filename = `${skillSlug || "skill"}.md`;
  const encoded = encodeURIComponent(skillMd ?? "");

  return {
    cursor: `cursor://anysphere.cursor-deeplink/file?name=${encodeURIComponent(filename)}&content=${encoded}`,
    vscode: `vscode://file?name=${encodeURIComponent(filename)}&content=${encoded}`,
    claudeCode: `claude-code://skill?name=${encodeURIComponent(filename)}&content=${encoded}`,
  };
}

export function buildShareUrl(origin: string, id: string): string {
  return `${origin}/g/${id}`;
}
