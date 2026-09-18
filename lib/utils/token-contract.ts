import type { DesignTokens } from "@/lib/utils/tokens";
import type { TokenContract } from "@/lib/types/skill-bundle";

interface NamedColor {
  name: string;
  hex: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function flattenColors(colors: DesignTokens["colors"]): NamedColor[] {
  const result: NamedColor[] = [];
  const seen = new Set<string>();

  const add = (name: string, hex: string) => {
    if (!hex || seen.has(name)) return;
    seen.add(name);
    result.push({ name, hex: hex.toUpperCase() });
  };

  if (Array.isArray(colors)) {
    colors.forEach((hex, index) => add(`palette-${index + 1}`, hex));
    return result;
  }

  for (const [group, values] of Object.entries(colors)) {
    const groupSlug = slugify(group);
    values.forEach((hex, index) => {
      const name = values.length === 1 ? groupSlug : `${groupSlug}-${index + 1}`;
      add(name, hex);
    });
  }
  return result;
}

function pickPrimary(named: NamedColor[]): string | null {
  return (
    named.find((c) => /primary/.test(c.name))?.hex ??
    named.find((c) => /accent|brand/.test(c.name))?.hex ??
    named[0]?.hex ??
    null
  );
}

function normalizeRadii(radii: string[]): string[] {
  const valid = radii.filter((r) => /^[0-9.]+(px|rem|em)$/.test(r.trim()));
  return Array.from(new Set(valid)).slice(0, 6);
}

function resolveFonts(tokens: DesignTokens): { display: string; body: string; mono: string | null } {
  const families = tokens.typography.families;
  const display = tokens.typography.heading ?? families[0] ?? "system-ui";
  const body =
    tokens.typography.body ?? families[1] ?? tokens.typography.heading ?? families[0] ?? "system-ui";
  return { display, body, mono: tokens.typography.mono };
}

function buildCssVars(tokens: DesignTokens, named: NamedColor[]): string {
  const lines: string[] = [];
  const radii = normalizeRadii(tokens.radii);
  const fonts = resolveFonts(tokens);

  const primary = pickPrimary(named);
  if (primary) lines.push(`  --color-primary: ${primary};`);

  for (const color of named) lines.push(`  --color-${color.name}: ${color.hex};`);

  lines.push(`  --font-display: "${fonts.display}", system-ui, sans-serif;`);
  lines.push(`  --font-body: "${fonts.body}", system-ui, sans-serif;`);
  if (fonts.mono) {
    lines.push(`  --font-mono: "${fonts.mono}", ui-monospace, monospace;`);
  }

  radii.forEach((radius, index) => {
    lines.push(`  --radius-${index + 1}: ${radius};`);
  });

  tokens.motion.durations.forEach((duration, index) => {
    lines.push(`  --duration-${index + 1}: ${duration};`);
  });
  tokens.motion.easings.forEach((easing, index) => {
    lines.push(`  --ease-${index + 1}: ${easing};`);
  });

  const selector = tokens.scheme === "dark" ? ":root,\n.dark {" : ":root {";
  return `${selector}\n${lines.join("\n")}\n}`;
}

function buildTailwindPreset(tokens: DesignTokens, named: NamedColor[]): string {
  const colorEntries = named
    .map((c) => `        "${c.name}": "${c.hex}",`)
    .join("\n");
  const radiusEntries = normalizeRadii(tokens.radii)
    .map((radius, index) => `        "${index + 1}": "${radius}",`)
    .join("\n");
  const durationEntries = tokens.motion.durations
    .map((duration, index) => `        "${index + 1}": "${duration}",`)
    .join("\n");
  const easingEntries = tokens.motion.easings
    .map((easing, index) => `        "${index + 1}": "${easing}",`)
    .join("\n");
  const fonts = resolveFonts(tokens);
  const monoLine = fonts.mono
    ? `\n        mono: ["${fonts.mono}", "ui-monospace", "monospace"],`
    : "";

  return `import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
${colorEntries}
      },
      fontFamily: {
        display: ["${fonts.display}", "system-ui", "sans-serif"],
        body: ["${fonts.body}", "system-ui", "sans-serif"],${monoLine}
      },
      borderRadius: {
${radiusEntries}
      },
      transitionDuration: {
${durationEntries}
      },
      transitionTimingFunction: {
${easingEntries}
      },
    },
  },
};

export default preset;
`;
}

export function buildTokenContract(tokens: DesignTokens): TokenContract {
  const named = flattenColors(tokens.colors);
  return {
    tokensJson: JSON.stringify(tokens, null, 2),
    cssVars: buildCssVars(tokens, named),
    tailwindPreset: buildTailwindPreset(tokens, named),
  };
}
