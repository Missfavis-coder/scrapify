export const queryKeys = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },
  generations: {
    all: () => ["generations"] as const,
    detail: (id: string) => ["generations", "detail", id] as const,
    pages: (id: string) => ["generations", "pages", id] as const,
    public: () => ["generations", "public"] as const,
  },
  bookmarks: {
    all: () => ["bookmarks"] as const,
    list: (cursor?: string) => ["bookmarks", "list", cursor ?? null] as const,
  },
  dashboard: {
    all: () => ["dashboard"] as const,
    projects: (cursor?: string) =>
      ["dashboard", "projects", cursor ?? null] as const,
    generations: (cursor?: string) =>
      ["dashboard", "generations", cursor ?? null] as const,
    archived: (cursor?: string) =>
      ["dashboard", "archived", cursor ?? null] as const,
  },
  inspirations: {
    all: () => ["inspirations"] as const,
    list: (cursor?: string) =>
      ["inspirations", "list", cursor ?? null] as const,
    preview: (kind: string, url: string) =>
      ["inspirations", "preview", kind, url] as const,
  },
  figmaConnection: {
    all: () => ["figma-connection"] as const,
    status: () => ["figma-connection", "status"] as const,
  },
  apiKeys: {
    all: () => ["api-keys"] as const,
    list: () => ["api-keys", "list"] as const,
  },
  userTemplates: {
    all: () => ["user-templates"] as const,
    list: () => ["user-templates", "list"] as const,
  },
} as const;
