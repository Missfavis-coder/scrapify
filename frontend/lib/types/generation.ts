export type GenerationMode = "design" | "motion" | "api" | "library" | "generic";

export type GenerationStatus =
  | "pending"
  | "extracting"
  | "generating"
  | "done"
  | "failed";

export type SourceKind =
  | "public_url"
  | "dribbble"
  | "pinterest"
  | "figma"
  | "image"
  | "merge";

export interface Generation {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  description: string;
  status: GenerationStatus;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  parentGenerationId: string | null;
  feedback: string | null;
  archivedAt: string | null;
}

export interface GenerationArtifacts {
  generationId: string;
  screenshotAbove: string | null;
  screenshotFull: string | null;
  extractedData: ExtractedDataSnapshot;
  skillMd: string | null;
  skillName: string | null;
  skillDescription: string | null;
  quality: import("@/lib/types/skill").SkillQuality | null;
}

export interface ExtractedSummary {
  colors?: string[];
  fonts?: string[];
  favicon?: string | null;
  ogImage?: string | null;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ExtractedDataSnapshot {
  colors?: string[];
  coreColors?: string[];
  primary?: string | null;
  fonts?: string[];
  fontRoles?: import("@/lib/types/extraction").FontRoles;
  cursors?: import("@/lib/types/extraction").CursorTokens;
  buttons?: import("@/lib/types/extraction").ButtonStyles;
  buttonsPreview?: import("@/lib/types/extraction").ButtonStyles | null;
  fontSizes?: number[];
  fontWeights?: number[];
  borderRadii?: string[];
  shadows?: string[];
  usesShadows?: boolean;
  spacing?: string[];
  transitions?: string[];
  easings?: string[];
  durations?: string[];
  colorScheme?: import("@/lib/types/extraction").ColorScheme;
  headings?: string[];
  codeBlocks?: number;
  metaTitle?: string;
  metaDescription?: string;
  favicon?: string | null;
  ogImage?: string | null;
  twitterImage?: string | null;
  logo?: string | null;
  assets?: string[];
  motion?: import("@/lib/types/extraction").MotionSignals | null;
}

export interface GenerationWithArtifacts extends Generation {
  artifacts: GenerationArtifacts;
  lazyRefreshing?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export interface CrawledPageSummary {
  url: string;
  finalUrl: string;
  title: string;
  isRoot: boolean;
}

export interface CrawledPagesResponse {
  pages: CrawledPageSummary[];
}

export interface CreateGenerationDto {
  url: string;
  description: string;
  mode: GenerationMode;
}

export interface CreateGenerationResponse {
  id: string;
  cached?: boolean;
}

export interface PublicGenerationCard {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  createdAt: string;
  screenshotAbove: string | null;
  skillName: string | null;
  skillDescription: string | null;
  palette: string[];
  favicon: string | null;
  viewCount: number;
  bookmarkCount: number;
}

export interface UpdateVisibilityDto {
  isPublic: boolean;
}

export interface UpdateVisibilityResponse {
  id: string;
  isPublic: boolean;
}

export interface ArchiveGenerationDto {
  archive: boolean;
}

export interface ArchiveGenerationResponse {
  id: string;
  archived: boolean;
}

export interface DeleteGenerationResponse {
  id: string;
  deleted: true;
}

export interface ModeDetection {
  mode: GenerationMode;
  reason: string;
}

export interface ImproveGenerationDto {
  feedback: string;
}

export interface ImproveGenerationResponse {
  id: string;
}

