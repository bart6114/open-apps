export type AppStatus = "active" | "quiet" | "stale" | "archived" | "unknown";
export type AppLabel = "new" | "hot" | "mature" | "featured";

/**
 * One open-source app entry. The minimum a card needs to render:
 *   - name
 *   - description
 *   - repoUrl
 *   - stack (single primary stack, e.g. "Flutter")
 *   - stacks? (extra stacks used in the codebase, e.g. ["Firebase"])
 *   - platforms (chips on the card)
 *   - category
 *
 * Everything else is optional / metadata for V2.
 */
export type OpenSourceApp = {
  slug: string;
  name: string;
  description: string;
  repoUrl: string;
  homepageUrl?: string;
  /** Primary stack, e.g. "Flutter" */
  stack: string;
  /** Additional stacks that the app is built with. */
  stacks?: string[];
  platforms: string[];
  category: string;
  tags?: string[];
  /** Direct URL to a square logo. Falls back to initials placeholder. */
  logoUrl?: string;
  stars?: number;
  license?: string;
  status?: AppStatus;
  addedAt?: string;
  lastCommitAt?: string;
  labels?: AppLabel[];
};
