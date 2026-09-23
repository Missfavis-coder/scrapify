export type ColorScheme = "light" | "dark";

export interface FontRoles {
  heading: string | null;
  body: string | null;
  button: string | null;
  mono: string | null;
}

export interface CursorTokens {
  interactive: string;
  custom: string | null;
}

export interface ButtonVariantStyle {
  backgroundColor: string | null;
  textColor: string | null;
  border: string | null;
  borderRadius: string | null;
  padding: string | null;
  fontSize: string | null;
  fontWeight: string | null;
  fontFamily: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textTransform: string | null;
  textDecoration: string | null;
  boxShadow: string | null;
  height: string | null;
}

export interface ButtonStyles {
  primary: ButtonVariantStyle | null;
  secondary: ButtonVariantStyle | null;
  link: ButtonVariantStyle | null;
}

export interface CssTokens {
  colors: string[];
  coreColors: string[];
  primary: string | null;
  fonts: string[];
  fontRoles: FontRoles;
  cursors: CursorTokens;
  buttons: ButtonStyles;
  fontSizes: number[];
  fontWeights: number[];
  borderRadii: string[];
  shadows: string[];
  usesShadows: boolean;
  spacing: string[];
  transitions: string[];
  easings: string[];
  durations: string[];
  colorScheme: ColorScheme;
}

export interface ContentTokens {
  metaTitle: string;
  metaDescription: string;
  headings: { level: number; text: string }[];
  codeBlocks: { language: string; snippet: string }[];
  paragraphs: string[];
  favicon: string | null;
  ogImage: string | null;
  twitterImage: string | null;
  logo: string | null;
  assets: string[];
  motion?: MotionSignals | null;
}

export type MediaAssetKind =
  | "image"
  | "video"
  | "poster"
  | "audio"
  | "background"
  | "iframe"
  | "lottie";

export type MediaAssetRole = "hero" | "logo" | "gallery" | "background" | null;

export interface MediaAsset {
  url: string;
  kind: MediaAssetKind;
  role: MediaAssetRole;
  width: number | null;
  height: number | null;
}

export interface NetworkAsset {
  url: string;
  type: string;
}

export interface StackSignals {
  webgl: boolean;
  canvasCount: number;
  libraries: string[];
  scrollLibraries: string[];
}

export interface MotionSignals {
  stack: StackSignals;
  media: MediaAsset[];
  networkAssets: NetworkAsset[];
  docScrollHeight: number;
}

export interface DomQuietOptions {
  quietMs: number;
  maxWaitMs: number;
}

export interface DomQuietResult {
  quiet: boolean;
  elapsedMs: number;
}

export interface DeepScrollOptions {
  stepRatio: number;
  maxSteps: number;
  settleMs: number;
  quietMs: number;
  maxMs: number;
}

export interface VisualStabilityOptions {
  minWaitMs: number;
  intervalMs: number;
  maxWaitMs: number;
  stableFrames: number;
  sampleQuality: number;
}

export interface VisualStabilityResult {
  stable: boolean;
  elapsedMs: number;
  samples: number;
}

export interface HeroReadyOptions {
  maxWaitMs: number;
  pollMs: number;
  loaderSelectors: string[];
}

export interface HeroReadyResult {
  ready: boolean;
  elapsedMs: number;
}

export interface RootLinkCandidate {
  url: string;
  anchorText: string;
  navDepth: number;
  navIndex: number;
}

export interface ExtractionResult {
  url: string;
  finalUrl: string;
  host: string;
  pageTitle: string;
  screenshotAboveBuffer: Buffer;
  screenshotFullBuffer: Buffer;
  cssTokens: CssTokens;
  contentTokens: ContentTokens;
  linkCandidates: RootLinkCandidate[];
}

export interface ExtractedPage {
  url: string;
  finalUrl: string;
  pageTitle: string;
  contentTokens: ContentTokens;
  score?: number;
}

export interface CrawlResult {
  pages: ExtractedPage[];
  totalChars: number;
}
