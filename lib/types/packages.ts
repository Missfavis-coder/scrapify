export type PackageInstallKind = "dependency" | "dev" | "setup";

export interface SuggestedPackage {
  name: string;
  purpose: string;
  kind: PackageInstallKind;
  curated: boolean;
  command?: string;
}
