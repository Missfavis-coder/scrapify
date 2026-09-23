import {
  GITHUB_API_BASE,
  GITHUB_RAW_BASE,
  SKILL_FILE_NAMES,
} from "@/lib/server/ingest/constants";
import { httpGet, httpGetJson, httpGetText } from "@/lib/server/ingest/http";
import { parseFrontmatter } from "@/lib/server/ingest/parse-frontmatter";
import type { RepoTreeEntry } from "@/lib/types/curated";

interface RepoMeta {
  full_name: string;
  default_branch: string;
  private: boolean;
  message?: string;
}

interface TreeResponse {
  sha: string;
  tree: Array<{ path: string; type: string; sha: string; size?: number }>;
  truncated: boolean;
  message?: string;
}

interface CachedRepo {
  defaultBranch: string;
  files: RepoTreeEntry[];
  fetchedAt: number;
  skillsByName?: Map<string, { path: string; contentMd: string }>;
  skillsByDir?: Map<string, { path: string; contentMd: string }>;
}

const repoCache = new Map<string, CachedRepo>();

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function fetchRepoMeta(owner: string, repo: string): Promise<RepoMeta | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const res = await httpGet(url, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub repo meta ${owner}/${repo}: HTTP ${res.status}`);
  const json = (await res.json()) as RepoMeta;
  if (json.message === "Not Found") return null;
  return json;
}

async function tryFetchTree(
  owner: string,
  repo: string,
  branch: string
): Promise<RepoTreeEntry[] | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await httpGet(url, { headers: authHeaders() });
  if (res.status === 404 || res.status === 409) return null;
  if (!res.ok) throw new Error(`GitHub tree ${owner}/${repo}@${branch}: HTTP ${res.status}`);
  const tree = (await res.json()) as TreeResponse;
  if (!tree.tree) return null;
  return tree.tree
    .filter((node) => node.type === "blob")
    .map((node) => ({ path: node.path, sha: node.sha, size: node.size }));
}

export async function getRepoTree(owner: string, repo: string): Promise<CachedRepo | null> {
  const key = `${owner}/${repo}`;
  const cached = repoCache.get(key);
  if (cached) return cached;

  for (const branch of ["main", "master"]) {
    const files = await tryFetchTree(owner, repo, branch);
    if (files !== null) {
      const entry: CachedRepo = { defaultBranch: branch, files, fetchedAt: Date.now() };
      repoCache.set(key, entry);
      return entry;
    }
  }
  const meta = await fetchRepoMeta(owner, repo);
  if (!meta) return null;
  const files = await tryFetchTree(owner, repo, meta.default_branch);
  if (files === null) return null;
  const entry: CachedRepo = { defaultBranch: meta.default_branch, files, fetchedAt: Date.now() };
  repoCache.set(key, entry);
  return entry;
}

function listSkillFiles(files: RepoTreeEntry[]): RepoTreeEntry[] {
  return files.filter((file) => {
    const parts = file.path.split("/");
    const fileName = parts[parts.length - 1];
    return SKILL_FILE_NAMES.includes(fileName as (typeof SKILL_FILE_NAMES)[number]);
  });
}

async function ensureSkillIndex(owner: string, repo: string): Promise<CachedRepo | null> {
  const cached = await getRepoTree(owner, repo);
  if (!cached) return null;
  if (cached.skillsByName && cached.skillsByDir) return cached;

  const skillFiles = listSkillFiles(cached.files);
  const byName = new Map<string, { path: string; contentMd: string }>();
  const byDir = new Map<string, { path: string; contentMd: string }>();
  for (const file of skillFiles) {
    let contentMd: string;
    try {
      contentMd = await fetchRawFile(owner, repo, cached.defaultBranch, file.path);
    } catch {
      continue;
    }
    const { frontmatter } = parseFrontmatter(contentMd);
    const name = frontmatter.name?.trim();
    if (name) byName.set(name, { path: file.path, contentMd });
    const parts = file.path.split("/");
    if (parts.length >= 2) {
      const dir = parts[parts.length - 2];
      byDir.set(dir, { path: file.path, contentMd });
    }
  }
  cached.skillsByName = byName;
  cached.skillsByDir = byDir;
  return cached;
}

export async function resolveSkillBySlug(
  owner: string,
  repo: string,
  slug: string
): Promise<{ path: string; contentMd: string; defaultBranch: string } | null> {
  const cached = await ensureSkillIndex(owner, repo);
  if (!cached || !cached.skillsByName || !cached.skillsByDir) return null;
  const byName = cached.skillsByName.get(slug);
  if (byName) {
    return { path: byName.path, contentMd: byName.contentMd, defaultBranch: cached.defaultBranch };
  }
  const byDir = cached.skillsByDir.get(slug);
  if (byDir) {
    return { path: byDir.path, contentMd: byDir.contentMd, defaultBranch: cached.defaultBranch };
  }
  return null;
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  const url = `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;
  return httpGetText(url);
}

export function clearRepoCache(): void {
  repoCache.clear();
}
