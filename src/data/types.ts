export type AppStatus = "active" | "quiet" | "stale" | "archived" | "unknown";
export type AppLabel = "new" | "hot" | "mature" | "featured";

export type OpenSourceApp = {
  slug: string;
  name: string;
  description: string;
  repoUrl: string;
  homepageUrl?: string;
  stack: string;
  platforms: string[];
  category: string;
  tags?: string[];
  stars?: number;
  license?: string;
  status?: AppStatus;
  addedAt?: string;
  lastCommitAt?: string;
  labels?: AppLabel[];
};
