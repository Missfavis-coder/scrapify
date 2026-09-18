export const TEMPLATE_PLACEHOLDERS = [
  "__SKILL_NAME__",
  "__SKILL_SLUG__",
  "__SKILL_DESCRIPTION__",
  "__SOURCE_HOST__",
  "__SOURCE_URL__",
  "__PROJECT_NAME__",
] as const;

export const REQUIRED_TEMPLATE_PLACEHOLDERS = [
  "__SKILL_NAME__",
  "__SKILL_SLUG__",
  "__SKILL_DESCRIPTION__",
] as const;

export const TEMPLATE_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?\/?$/;

export const TEMPLATE_DEFAULT_BRANCH = "main";

export const USER_TEMPLATE_SLUG_PATTERN = /^[a-z0-9-]+$/;
export const USER_TEMPLATE_SLUG_MIN = 2;
export const USER_TEMPLATE_SLUG_MAX = 40;
export const USER_TEMPLATE_DESCRIPTION_MAX = 280;
export const USER_TEMPLATE_REPO_URL_MAX = 200;
export const USER_TEMPLATE_BRANCH_MAX = 80;

export const TEMPLATE_VALIDATION_TIMEOUT_MS = 10_000;

export const TEMPLATE_VALIDATION_ERRORS = {
  unreachable:
    "Could not download package.json from the repository. Confirm it is public and the branch exists.",
  invalidJson: "package.json at the repo root is not valid JSON.",
  missingPlaceholders:
    "package.json must contain at least one of __SKILL_NAME__, __SKILL_SLUG__, or __SKILL_DESCRIPTION__.",
} as const;

export const TEMPLATES_PAGE_COPY = {
  pageTitle: "Custom templates",
  pageDescription:
    "Add your own GitHub starter and use it with the CLI: skillmd init <skill> --template user/<slug>.",
  emptyHeading: "No custom templates yet",
  emptyDescription:
    "Add a public GitHub repo. Your template needs at least one placeholder we recognize.",
  addCta: "Add template",
  validatedLabel: "Validated",
  pendingLabel: "Pending validation",
  errorLabel: "Validation failed",
  deleteLabel: "Delete",
  cancelLabel: "Cancel",
  saveLabel: "Save template",
  formTitle: "Add custom template",
  formDescription:
    "Point skillmd init at a public GitHub repo. Tokens are applied via the placeholder strings.",
  fields: {
    slug: "Slug",
    slugHelper: "Lowercase, dashes only. Used in --template user/<slug>.",
    repoUrl: "GitHub repo URL",
    repoUrlHelper: "https://github.com/<owner>/<repo>",
    branch: "Branch",
    branchHelper: "Defaults to main.",
    description: "Description",
    descriptionHelper: "Optional. Helps you remember what this template is for.",
  },
  proRequiredHeading: "Custom templates are a Pro feature",
  proRequiredDescription:
    "Upgrade to Pro to add custom templates and use watch mode in the CLI.",
} as const;

export const TEMPLATES_TOAST_COPY = {
  createSuccess: "Template added.",
  updateSuccess: "Template updated.",
  deleteSuccess: "Template removed.",
  createError: "Could not add template.",
  deleteError: "Could not remove template.",
} as const;
