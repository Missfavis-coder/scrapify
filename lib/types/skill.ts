export interface SkillFrontmatter {
  name: string;
  description: string;
  slug: string;
}

export interface SkillFile {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
}

export interface SkillEvaluation {
  score: number;
  strengths: string[];
  gaps: string[];
  missingSections: string[];
}

export interface SkillQuality {
  evaluation: SkillEvaluation;
  evaluatedAt: string;
  modelUsed: string;
}
