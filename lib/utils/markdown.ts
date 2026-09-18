import type { SkillFile, SkillFrontmatter } from "@/lib/types/skill";
import type {
  PackageInstallKind,
  SuggestedPackage,
} from "@/lib/types/packages";

const PACKAGES_SECTION_HEADING = "## Suggested Packages";

export function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\n[\s\S]*?\n---\n*/, "");
}

export function buildSkillFile(
  frontmatter: SkillFrontmatter,
  body: string,
  packages?: SuggestedPackage[]
): SkillFile {
  const yamlLines = [
    "---",
    `name: ${frontmatter.name}`,
    `description: ${escapeYamlString(frontmatter.description)}`,
  ];

  if (packages && packages.length > 0) {
    yamlLines.push("packages:");
    for (const pkg of packages) {
      yamlLines.push(`  - name: ${escapeYamlString(pkg.name)}`);
      yamlLines.push(`    purpose: ${escapeYamlString(pkg.purpose)}`);
      yamlLines.push(`    kind: ${pkg.kind}`);
      yamlLines.push(`    curated: ${pkg.curated}`);
      if (pkg.command) {
        yamlLines.push(`    command: ${escapeYamlString(pkg.command)}`);
      }
    }
  }

  yamlLines.push("---", "");
  const yaml = yamlLines.join("\n");

  const withSection =
    packages && packages.length > 0
      ? appendPackagesSection(body, packages)
      : body;

  const raw = `${yaml}${withSection.trimEnd()}\n`;
  return { frontmatter, body: withSection, raw };
}

export function parseFrontmatter(raw: string): SkillFrontmatter | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const lines = match[1].split("\n");
  const data: Record<string, string> = {};
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    data[key] = value;
  }

  if (!data.name || !data.description) return null;
  return {
    name: data.name,
    description: data.description,
    slug: data.slug ?? data.name,
  };
}

export function parseSuggestedPackages(raw: string): SuggestedPackage[] {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  const lines = match[1].split("\n");
  const packagesIndex = lines.findIndex((line) => line.trim() === "packages:");
  if (packagesIndex === -1) return [];

  const packages: SuggestedPackage[] = [];
  let current: Partial<SuggestedPackage> | null = null;

  const commit = () => {
    if (
      current &&
      current.name &&
      current.purpose &&
      current.kind &&
      current.curated !== undefined
    ) {
      packages.push(current as SuggestedPackage);
    }
    current = null;
  };

  for (let i = packagesIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("  ")) break;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      commit();
      current = {};
      assignPackageField(current, trimmed.slice(2).trim());
      continue;
    }
    if (current) {
      assignPackageField(current, trimmed);
    }
  }
  commit();

  return packages;
}

function assignPackageField(
  pkg: Partial<SuggestedPackage>,
  entry: string
): void {
  const idx = entry.indexOf(":");
  if (idx === -1) return;
  const key = entry.slice(0, idx).trim();
  const value = unquoteYamlString(entry.slice(idx + 1).trim());
  if (key === "name") pkg.name = value;
  else if (key === "purpose") pkg.purpose = value;
  else if (key === "kind") pkg.kind = value as PackageInstallKind;
  else if (key === "curated") pkg.curated = value === "true";
  else if (key === "command") pkg.command = value;
}

function appendPackagesSection(
  body: string,
  packages: SuggestedPackage[]
): string {
  if (body.includes(PACKAGES_SECTION_HEADING)) return body;

  const autoInstall = packages.filter(
    (pkg) => pkg.curated && (pkg.kind === "dependency" || pkg.kind === "dev")
  );
  const setup = packages.filter((pkg) => pkg.kind === "setup");
  const review = packages.filter((pkg) => !pkg.curated);

  const lines: string[] = ["", PACKAGES_SECTION_HEADING, ""];
  lines.push(
    "Packages that help implement this skill well. Install them with your package manager (examples use pnpm)."
  );
  lines.push("");

  for (const pkg of autoInstall) {
    const flag = pkg.kind === "dev" ? "-D " : "";
    lines.push(
      `- **${pkg.name}** — ${pkg.purpose}. \`pnpm add ${flag}${pkg.name}\``
    );
  }
  for (const pkg of setup) {
    const command = pkg.command ?? `pnpm dlx ${pkg.name}@latest init`;
    lines.push(`- **${pkg.name}** — ${pkg.purpose}. \`${command}\``);
  }

  if (review.length > 0) {
    lines.push("");
    lines.push("Also worth considering (verify before installing):");
    lines.push("");
    for (const pkg of review) {
      lines.push(`- **${pkg.name}** — ${pkg.purpose}. \`pnpm add ${pkg.name}\``);
    }
  }

  return `${body.trimEnd()}\n${lines.join("\n")}\n`;
}

function escapeYamlString(value: string): string {
  if (/[":\n]/.test(value)) {
    return `"${value.replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
  }
  return value;
}

function unquoteYamlString(value: string): string {
  const match = value.match(/^"(.*)"$/);
  if (!match) return value;
  return match[1].replace(/\\"/g, '"');
}
