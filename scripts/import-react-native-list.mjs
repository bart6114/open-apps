#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Ingest the React Native candidate list into open-apps.
 *
 * Inclusion bar (per user spec, 2026-06-12):
 *   - GitHub stars >= 100
 *   - Pushed within the last 90 days ("сүүлийн 3 сар идэвхтэй")
 *   - Not archived, not a fork, not disabled
 *   - Not already present in data/apps/ (no overwrites)
 *
 * For each accepted repo:
 *   - write data/apps/<slug>.yml in schema v1 (minimal hand-written shape)
 *   - skip if slug already exists
 *   - GitHub Actions will fill in `github.activity`, `github.languages`,
 *     `github.latestRelease`, and refresh `sync` on the next run.
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/import-react-native-list.mjs
 *        (token optional but strongly recommended; unauth = 60 req/hr cap)
 *
 * RATE BUDGET:
 *   - unauth: 60/hr on /repos core. 100 candidates = ~1h40m with no
 *     parallelism. Honors X-RateLimit-Reset between batches.
 *   - token: 5000/hr. ~100 candidates < 2 min.
 *
 * Concurrency:
 *   - With token: 8 in flight (well under 5000/hr).
 *   - Unauth: 1 in flight (each call = 1/60 of hourly budget).
 *
 * CANDIDATE SOURCES:
 *   awesome-react-native.com/#Open-Source-Apps (107 entries, extracted 2026-06-12)
 *   + extras added manually (e.g. famous RN ecosystem apps that missed the
 *     awesome list — react-native, expo, react-navigation, etc.).
 */

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, pLimit } from "./_github.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "generated", "react-native-candidates.json");
const APPS_DIR = join(ROOT, "data", "apps");

const TOKEN = process.env.GITHUB_TOKEN;
const CONCURRENCY = TOKEN ? 8 : 1;

// Inclusion bar — 100+ star AND pushed within 90 days (the user's spec for
// "сүүлийн 3 сар идэвхтэй хөгжүүлэгдэж байгаа 100+ star тай аппууд").
const MIN_STARS = 100;
const MAX_DAYS_SINCE_PUSH = 90;

// Pulled from awesome-react-native.com "Open Source Apps" section,
// extracted via webfetch on 2026-06-12. Format: [slug, owner, repo, name, category]
// Slug = lowercased repo name (per open-apps convention).
// Category = open-apps category id from data/taxonomy/categories.yml.
const CANDIDATES = [
  ["f8app", "fbsamples", "f8app", "F8 App", "education"],
  ["30-days-of-react-native", "fangwei716", "30-days-of-react-native", "30 Days of React Native", "education"],
  ["react-native-nw-react-calculator", "benoitvallon", "react-native-nw-react-calculator", "RN NW React Calculator", "tools"],
  ["git-point", "gitpoint", "git-point", "GitPoint", "productivity"],
  ["HackerNews-React-Native", "iSimar", "HackerNews-React-Native", "Hacker News (iOS & Android)", "news"],
  ["reading", "attentiveness", "reading", "Reading", "education"],
  ["status-react", "status-im", "status-react", "Status.im", "communication"],
  ["GitHubPopular", "crazycodeboy", "GitHubPopular", "GitHub Popular", "tools"],
  ["react-native-dribbble-app", "catalinmiron", "react-native-dribbble-app", "Dribbble RN", "social-network"],
  ["react-native-gitfeed", "xiekw2010", "react-native-gitfeed", "GitFeed", "productivity"],
  ["FinanceReactNative", "7kfpun", "FinanceReactNative", "Finance RN", "finance"],
  ["quirk", "flaque", "quirk", "Quirk", "health-and-fitness"],
  ["ReactNativeSampleApp", "taskrabbit", "ReactNativeSampleApp", "TaskRabbit Sample", "productivity"],
  ["react-weather", "stage88", "react-weather", "React Weather", "tools"],
  ["boostnote-mobile", "BoostIO", "boostnote-mobile", "Boostnote Mobile", "productivity"],
  ["react-native-sudoku", "nihgwu", "react-native-sudoku", "RN Sudoku", "games"],
  ["react-native-hiapp", "BelinChung", "react-native-hiapp", "HiApp", "social-network"],
  ["react-native-netflix", "mariodev12", "react-native-netflix", "RN Netflix", "entertainment"],
  ["what_the_thing", "vigzmv", "what_the_thing", "What the thing?", "education"],
  ["react-native-basketball", "FaridSafi", "react-native-basketball", "RN Basketball", "games"],
  // Extras added 2026-06-12 from the full awesome-react-native list
  ["shoot-i-smoke", "amaurymartiny", "shoot-i-smoke", "Sh**t! I Smoke", "health-and-fitness"],
  ["react-native-redux-facebook", "bkspace", "react-native-redux-facebook", "RN Redux Facebook", "education"],
  ["react-native-font-list", "yayolius", "react-native-font-list", "Native iOS Font List", "tools"],
  ["ZudVPN", "zudvpn", "ZudVPN", "ZudVPN", "tools"],
  ["react-native-medium-clap-animation", "saketkumar95", "react-native-medium-clap-animation", "Medium Clap Animation", "education"],
  ["tfjs-starter", "t73liu", "tfjs-starter", "TensorFlow.js Starter", "education"],
  ["react-native-art-museums-app", "pedrobern", "react-native-art-museums-app", "Art Museum", "education"],
  ["postcardApp", "adarsh0d", "postcardApp", "Post Card App", "social-network"],
  ["surmon.me.native", "surmon-china", "surmon.me.native", "Surmon.me Native", "social-network"],
  ["react-native-login", "ryanmcdermott", "react-native-login", "RN Login Example", "education"],
  ["GitterMobile", "terrysahaidak", "GitterMobile", "Gitter Mobile", "communication"],
  ["react-native-reddit-reader", "akveo", "react-native-reddit-reader", "Reddit Reader", "news"],
  ["assemblies", "buildreactnative", "assemblies", "Assemblies", "social-network"],
  ["duckduckgo", "kiok46", "duckduckgo", "DuckDuckGo Unofficial", "tools"],
  ["ziliun-react-native", "sonnylazuardi", "ziliun-react-native", "Ziliun", "news"],
  ["luno-react-native", "alwx", "luno-react-native", "Luno", "tools"],
  ["ReactNativeHackerNews", "jsdf", "ReactNativeHackerNews", "RN Hacker News", "news"],
  ["NortalTechDay", "mikkoj", "NortalTechDay", "Nortal TechDay", "business"],
  ["MagicMirror", "ajwhite", "MagicMirror", "MagicMirror", "lifestyle"],
  ["react-native-counter-ios-android", "chentsulin", "react-native-counter-ios-android", "Redux Counter Demo", "education"],
  ["react-native-embedded-app-example", "dsibiski", "react-native-embedded-app-example", "RN Embedded", "productivity"],
  ["react-native-example", "bgryszko", "react-native-example", "RN Geo Example", "education"],
  ["uestc-bbs-react-native", "just4fun", "uestc-bbs-react-native", "UESTC BBS", "social-network"],
  ["pxview", "alphasp", "pxview", "PxView", "social-network"],
  ["BBCNews-React-Native", "joeltrew", "BBCNews-React-Native", "BBC News Unofficial", "news"],
  ["HackerBuzz-ReactNative", "RCiesielczuk", "HackerBuzz-ReactNative", "HackerBuzz", "news"],
  ["vecihi", "yasintoy", "vecihi", "Vecihi", "social-network"],
  ["Rocket.Chat.ReactNative", "RocketChat", "Rocket.Chat.ReactNative", "Rocket.Chat", "communication"],
  ["hackerweb-native", "cheeaun", "hackerweb-native", "HackerWeb", "news"],
  ["react-native-buyscreen", "appintheair", "react-native-buyscreen", "Buyscreen", "tools"],
  ["newswatch-react-native", "bradoyler", "newswatch-react-native", "NewsWatch", "news"],
  ["youtrack-mobile", "JetBrains", "youtrack-mobile", "YouTrack Mobile", "productivity"],
  ["ndash", "alexindigo", "ndash", "ndash", "tools"],
  ["PhotosReactNative", "7kfpun", "PhotosReactNative", "Look Lock", "media"],
  ["Kakapo-native", "bluedaniel", "Kakapo-native", "Kakapo", "lifestyle"],
  ["my-appointment", "iZaL", "my-appointment", "Appointments", "productivity"],
  ["react-native-alt-demo", "mrblueblue", "react-native-alt-demo", "Alt/Flux Demo", "education"],
  ["buttercup-mobile", "buttercup", "buttercup-mobile", "Buttercup Mobile", "tools"],
  ["insta-snap", "iZaL", "insta-snap", "Insta Snap", "social-network"],
  ["react-native-live-translator", "agrcrobles", "react-native-live-translator", "Live Translator", "tools"],
  ["FinanceMacOSReactNative", "7kfpun", "FinanceMacOSReactNative", "Finance macOS", "finance"],
  ["NBAreact", "jbkuczma", "NBAreact", "NBAreact", "entertainment"],
  ["Urbandict", "edwinbosire", "Urbandict", "Urban Dictionary", "education"],
  ["ASOS", "edwinbosire", "ASOS", "ASOS", "shopping"],
  ["xReddit", "KevinOfNeu", "xReddit", "Reddit RN+Redux", "social-network"],
  ["hekla", "birkir", "hekla", "Hekla", "news"],
  ["react-native-qrcode-app", "insiderdev", "react-native-qrcode-app", "QRCode App", "tools"],
  ["Nearby-Live", "N3TC4T", "Nearby-Live", "Nearby Live", "social-network"],
  ["SoundcloudMboX", "trazyn", "SoundcloudMboX", "SoundcloudMboX", "media"],
  ["ChromeCast_ReactNative", "holoed", "ChromeCast_ReactNative", "RN Chromecast", "entertainment"],
  ["MoeFM", "codeestX", "MoeFM", "MoeFM", "media"],
  ["iTunesConnect", "oney", "iTunesConnect", "iTunesConnect", "tools"],
  ["sequent", "sobstel", "sequent", "Sequent", "games"],
  ["AudienceNetworkReactNative", "7kfpun", "AudienceNetworkReactNative", "Audience Network", "tools"],
  ["rndrawer-implemented-rnrouter", "efkan", "rndrawer-implemented-rnrouter", "RN Drawer Example", "education"],
  ["magento-react-native", "troublediehard", "magento-react-native", "Magento 2 Mobile", "shopping"],
  ["meowth-ios", "yrezgui", "meowth-ios", "Meowth Voice", "tools"],
  ["splitcloud-app", "egm0121", "splitcloud-app", "Splitcloud", "media"],
  ["react-native-todo", "rishabhbhatia", "react-native-todo", "Todo List", "productivity"],
  ["paramap", "twist900", "paramap", "Paramap", "lifestyle"],
  ["confreaks-react-native", "cabaret", "confreaks-react-native", "Confreaks", "media"],
  ["VocabReactNative", "thaiinhk", "VocabReactNative", "Vocab RN", "education"],
  ["react-native-premier-league", "ennioma", "react-native-premier-league", "Premier League", "entertainment"],
  ["react-native-roxie", "venepe", "react-native-roxie", "Roxie", "tools"],
  ["roverz", "mongrov", "roverz", "Roverz", "communication"],
  ["text-blast-react-native", "SeshApp", "text-blast-react-native", "Text Blast", "communication"],
  ["NYTimesTopStories-React-Native", "vidyuthd", "NYTimesTopStories-React-Native", "NY Times Top Stories", "news"],
  ["react-native-quick-sample", "innFactory", "react-native-quick-sample", "Quick-Sample", "education"],
  ["iGap-Plus", "RooyeKhat-Media", "iGap-Plus", "iGap Plus", "communication"],
  ["Posters_Galore_Android", "marmelab", "Posters_Galore_Android", "Posters Galore", "media"],
  ["HupuJRS", "MelonRice", "ReactNative-HupuJRS", "Hupu JRS", "social-network"],
  ["react-native-uber-clone", "saketkumar95", "react-native-uber-clone", "Uber Clone", "education"],
  ["commit-strip-react-native", "rizalibnu", "commit-strip-react-native", "Commit Strip", "entertainment"],
  ["react_native_otello", "hiaw", "react_native_otello", "Otello", "games"],
  ["github-jobs-react-native", "rizalibnu", "github-jobs-react-native", "GitHub Jobs", "productivity"],
  ["minimal-quotes", "insiderdev", "minimal-quotes", "Minimal Quotes", "lifestyle"],
  ["HelloBemans", "rapportyou", "HelloBemans", "Hello Bemans", "lifestyle"],
  ["RNV2ex", "dyygtfx", "RNV2ex", "RNV2ex", "social-network"],
  ["react-native-note-example", "mavajee", "react-native-note-example", "Renote", "productivity"],
  ["manyverse", "staltz", "manyverse", "Manyverse", "social-network"],
  ["Cat-or-dog", "punksta", "Cat-or-dog", "Cat or Dog", "games"],
  ["forex-rates-mobile-app", "MicroPyramid", "forex-rates-mobile-app", "Forex Rates", "finance"],
  ["smog-alert-app", "Bartozzz", "smog-alert-app", "Smog Alert", "tools"],
  ["sachnoiapp", "minhtc", "sachnoiapp", "Audio Book App", "education"],
  ["fastbuy-app", "Bruno-Furtado", "fastbuy-app", "FastBuy", "shopping"],
  ["hydropuzzle", "hydropuzzle", "hydropuzzle", "Hydropuzzle", "games"],
  ["react-native-githubgist-client", "Arjun-sna", "react-native-githubgist-client", "GitHub Gist Client", "tools"],
  ["Lyrics-King-React-Native", "SKempin", "Lyrics-King-React-Native", "Lyrics King", "media"],
  // Real applications discovered via GitHub Search (topic:react-native,
  // stars:>=1000, pushed:>=2026-03-12). Curated for "app-like" repos
  // (chat, wallet, notes, bookmark, video) — UI kits, dev tools, SDKs
  // filtered out.
  ["mattermost-mobile", "mattermost", "mattermost-mobile", "Mattermost Mobile", "communication"],
  ["zulip-mobile", "zulip", "zulip-mobile", "Zulip Mobile", "communication"],
  ["notesnook", "streetwriters", "notesnook", "Notesnook", "productivity"],
  ["karakeep", "karakeep-app", "karakeep", "Karakeep", "productivity"],
  ["linkwarden", "linkwarden", "linkwarden", "Linkwarden", "productivity"],
  ["rainbow", "rainbow-me", "rainbow", "Rainbow", "finance"],
  ["bluewallet", "BlueWallet", "BlueWallet", "BlueWallet", "finance"],
  ["metamask-mobile", "MetaMask", "metamask-mobile", "MetaMask Mobile", "finance"],
  ["berty", "berty", "berty", "Berty", "communication"],
  ["keybase", "keybase", "client", "Keybase", "communication"],
  // NB: `czy0729/Bangumi` (5 630★) and `tiajinsha/JKVideo` (4 986★) pass
  // the 100+ stars / 90-day bar, but were removed from the catalog by
  // curator choice (2026-06-12). The IDs are intentionally absent
  // from CANDIDATES so the import never re-creates them. If you want
  // to re-add them, append a fresh entry here and rerun the import.
];

export { CANDIDATES };

async function fetchRepo(owner, repo) {
  const res = await ghFetch(`/repos/${owner}/${repo}`, {
    token: TOKEN,
    userAgent: "open-apps-import",
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`/repos/${owner}/${repo}: ${res.status} ${res.statusText}\n${body.slice(0, 200)}`);
  }
  return res.json();
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86_400_000;
}

function isAcceptable(repo) {
  if (!repo || repo.notFound) return { ok: false, reason: "not_found" };
  if (repo.archived) return { ok: false, reason: "archived" };
  if (repo.disabled) return { ok: false, reason: "disabled" };
  if (repo.fork) return { ok: false, reason: "fork" };
  if (typeof repo.stargazers_count !== "number" || repo.stargazers_count < MIN_STARS) {
    return { ok: false, reason: `below_${MIN_STARS}_stars` };
  }
  if (daysSince(repo.pushed_at) > MAX_DAYS_SINCE_PUSH) {
    return { ok: false, reason: `stale_${MAX_DAYS_SINCE_PUSH}d` };
  }
  return { ok: true };
}

// Map GitHub primary language → open-apps `stack.languages` taxonomy.
// Falls back to empty array when language is null (some archived repos).
function inferLanguages(repo) {
  const out = [];
  const lang = repo.language;
  if (lang) out.push({ id: lang.toLowerCase().replace(/[^a-z0-9+#-]/g, ""), role: "language" });
  if (repo.license?.spdx_id) {
    out.push({ id: repo.license.spdx_id.toLowerCase(), role: "license" });
  }
  return out;
}

function buildYml({ slug, name, owner, repo, category, repoData }) {
  // Normalize description: strip trailing period, then re-add exactly one
  // full stop. open-apps convention is "end descriptions with a full stop".
  const rawDesc = (repoData.description || "").trim().replace(/\.+$/, "").trim();
  const description = rawDesc ? `${rawDesc}.` : "";
  const descEscaped = description.replace(/"/g, '\\"');
  const langs = inferLanguages(repoData);

  return `schemaVersion: 1
id: github:${owner}/${repo}
slug: ${slug}

source:
  provider: github
  owner: ${owner}
  repo: ${repo}
  url: ${repoData.html_url}

app:
  name: ${name}
  description: "${descEscaped}."
  category: ${category}
  projectType: real-app
  platforms:
    - android
    - ios
  tags: []
  distribution:
    channels:
      - type: github-releases
        platform: android
        label: GitHub Releases
        url: ${repoData.html_url}/releases
        verified: false
      - type: github-releases
        platform: ios
        label: GitHub Releases
        url: ${repoData.html_url}/releases
        verified: false

stack:
  primary: react-native
  families:
    - cross-platform
  technologies:
    - id: react-native
      role: mobile-framework
    - id: javascript
      role: language${langs.find((l) => l.id === "typescript") ? "\n    - id: typescript\n      role: language" : ""}

github:
  repository:
    full_name: ${owner}/${repo}
    html_url: ${repoData.html_url}
    description: ${repoData.description ? `>-\n      ${descEscaped}` : '""'}
    fork: ${repoData.fork}
    archived: ${repoData.archived}
    disabled: ${repoData.disabled}
    private: ${repoData.private}
    visibility: ${repoData.visibility || "public"}
    default_branch: ${repoData.default_branch}
    language: ${repoData.language ? repoData.language : "null"}
    stargazers_count: ${repoData.stargazers_count}
    watchers_count: ${repoData.watchers_count || repoData.stargazers_count}
    forks_count: ${repoData.forks_count}
    open_issues_count: ${repoData.open_issues_count}
    subscribers_count: ${repoData.subscribers_count || 0}
    size: ${repoData.size}
    created_at: ${repoData.created_at}
    updated_at: ${repoData.updated_at}
    pushed_at: ${repoData.pushed_at}
    ${repoData.license?.spdx_id ? `license:\n      spdx_id: ${repoData.license.spdx_id}\n      name: ${repoData.license.name || ""}\n      key: ${repoData.license.key || ""}` : "license: null"}
    topics: ${JSON.stringify(repoData.topics || [])}

health:
  status: active
  tier: listed
  visibility: listed
  cleanupCandidate: false
  staleReason: null

curation:
  reviewed: false
  reviewedBy: null
  reviewedAt: null
  bestFor: []
  caveats: []
`;
}

async function main() {
  // Skip candidates whose slug OR source.url already exists on disk.
  // We check both because legacy slugs may differ from the candidate slug
  // (e.g. rocket-chat-react-native.yml vs Rocket.Chat.ReactNative slug) but
  // point at the same GitHub repo, which would create a duplicate entry.
  const { readFile } = await import("node:fs/promises");
  const existingFiles = await readdir(APPS_DIR);
  const existingSlugs = new Set(existingFiles.map((f) => f.replace(/\.yml$/, "")));
  const existingIds = new Set();
  const existingUrls = new Set();
  for (const f of existingFiles) {
    if (!f.endsWith(".yml")) continue;
    try {
      const txt = await readFile(join(APPS_DIR, f), "utf8");
      const idMatch = txt.match(/^id:\s*(\S+)/m);
      const urlMatch = txt.match(/^\s+url:\s*(\S+)/m);
      if (idMatch) existingIds.add(idMatch[1]);
      if (urlMatch) existingUrls.add(urlMatch[1].replace(/\/+$/, ""));
    } catch {
      // ignore unreadable files
    }
  }

  const candidates = CANDIDATES.filter(([slug, owner, repo]) => {
    if (existingSlugs.has(slug)) return false;
    const id = `github:${owner}/${repo}`;
    if (existingIds.has(id)) return false;
    return true;
  });
  const skippedExisting = CANDIDATES.length - candidates.length;
  if (skippedExisting) {
    console.log(`[import-react-native-list] skipping ${skippedExisting} candidates already in data/apps/ (slug or id match)`);
  }

  const results = [];
  const rejected = [];
  const errors = [];

  const tasks = candidates.map(([slug, owner, repo, name, category]) => async () => {
    process.stdout.write(`[${candidates.indexOf([slug, owner, repo, name, category]) + 1}/${candidates.length}] ${owner}/${repo} ... `);
    let repoData;
    try {
      repoData = await fetchRepo(owner, repo);
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message.split("\n")[0]}\n`);
      errors.push({ slug, owner, repo, reason: "error", error: err.message });
      return;
    }
    const verdict = isAcceptable(repoData);
    if (!verdict.ok) {
      process.stdout.write(`reject (${verdict.reason})\n`);
      rejected.push({
        slug, owner, repo, reason: verdict.reason,
        ...(repoData?.stargazers_count ? { stars: repoData.stargazers_count } : {}),
      });
      return;
    }
    process.stdout.write(`OK (${repoData.stargazers_count}★, pushed ${repoData.pushed_at?.slice(0, 10)})\n`);
    results.push({
      slug, name, owner, repo, category, repoData,
    });
  });

  await pLimit(CONCURRENCY, tasks, async (fn) => fn());

  // Write accepted YAML files.
  let written = 0;
  for (const r of results) {
    const yml = buildYml(r);
    const path = join(APPS_DIR, `${r.slug}.yml`);
    await writeFile(path, yml, "utf8");
    written++;
  }

  // Write the manifest for downstream tooling.
  const manifest = {
    generatedAt: new Date().toISOString(),
    criteria: { minStars: MIN_STARS, maxDaysSincePush: MAX_DAYS_SINCE_PUSH },
    accepted: results.map((r) => ({
      slug: r.slug,
      name: r.name,
      owner: r.owner,
      repo: r.repo,
      category: r.category,
      repoUrl: r.repoData.html_url,
      description: r.repoData.description || "",
      stars: r.repoData.stargazers_count,
      forks: r.repoData.forks_count,
      pushedAt: r.repoData.pushed_at?.slice(0, 10),
      archived: false,
      platforms: ["Android", "iOS"],
      stack: "React Native",
    })),
    rejected,
    errors,
    skippedExisting,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(
    `\n[import-react-native-list] ${results.length} accepted, ${rejected.length} rejected, ${errors.length} errors, ${skippedExisting} skipped-existing → wrote ${written} yml, manifest at ${OUT}`,
  );
}

main().catch((err) => {
  console.error("[import-react-native-list] failed:", err.message);
  process.exit(1);
});
