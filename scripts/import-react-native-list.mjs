#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Validate the React Native candidate list from the awesome-react-native
 * "Open Source Apps" section against the open-apps inclusion bar:
 *   - GitHub stars >= 50
 *   - Not archived
 *   - Not a fork
 *   - Pushed within the last 365 days (active maintenance)
 *
 * Output: a JSON manifest of qualifying apps, keyed by slug. Each entry
 * carries just enough data to write a `data/apps/<slug>.yml` record in
 * the legacy schema — the next step in the pipeline.
 *
 * Usage: node scripts/import-react-native-list.mjs
 *        TOKEN=ghp_xxx node scripts/import-react-native-list.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "generated", "react-native-candidates.json");

const TOKEN = process.env.TOKEN;
const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-apps-import",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// Candidate list from awesome-react-native "Open Source Apps" section.
// Format: [slug, owner, repo, name, category]
// `category` is the open-apps category id, mapped from the awesome list
// description. Slug uses the github repo name lowercased.
const CANDIDATES = [
  ["eigen", "artsy", "eigen", "Artsy", "shopping"],
  ["git-point", "gitpoint", "git-point", "GitPoint", "productivity"],
  ["HackerNews-React-Native", "iSimar", "HackerNews-React-Native", "Hacker News", "news"],
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
  ["surmon.me.native", "surmon-china", "surmon.me.native", "Surmon.me Native", "social-network"],
  ["GitterMobile", "terrysahaidak", "GitterMobile", "Gitter Mobile", "communication"],
  ["react-native-reddit-reader", "akveo", "react-native-reddit-reader", "Reddit Reader", "news"],
  ["assemblies", "buildreactnative", "assemblies", "Assemblies", "social-network"],
  ["duckduckgo", "kiok46", "duckduckgo", "DuckDuckGo Unofficial", "tools"],
  ["ziliun-react-native", "sonnylazuardi", "ziliun-react-native", "Ziliun", "news"],
  ["luno-react-native", "alwx", "luno-react-native", "Luno", "tools"],
  ["ReactNativeHackerNews", "jsdf", "ReactNativeHackerNews", "RN Hacker News", "news"],
  ["NortalTechDay", "mikkoj", "NortalTechDay", "Nortal TechDay", "business"],
  ["MagicMirror", "ajwhite", "MagicMirror", "MagicMirror", "lifestyle"],
  ["react-native-embedded-app-example", "dsibiski", "react-native-embedded-app-example", "RN Embedded", "productivity"],
  ["uestc-bbs-react-native", "just4fun", "uestc-bbs-react-native", "UESTC BBS", "social-network"],
  ["shoot-i-smoke", "amaurymartiny", "shoot-i-smoke", "Sh**t! I Smoke", "health-and-fitness"],
  ["pxview", "alphasp", "pxview", "PxView", "social-network"],
  ["BBCNews-React-Native", "joeltrew", "BBCNews-React-Native", "BBC News Unofficial", "news"],
  ["HackerBuzz-ReactNative", "RCiesielczuk", "HackerBuzz-ReactNative", "HackerBuzz", "news"],
  ["vecihi", "yasintoy", "vecihi", "Vecihi", "social-network"],
  ["Rocket.Chat.ReactNative", "RocketChat", "Rocket.Chat.ReactNative", "Rocket.Chat", "communication"],
  ["hackerweb-native", "cheeaun", "hackerweb-native", "HackerWeb", "news"],
  ["newswatch-react-native", "bradoyler", "newswatch-react-native", "NewsWatch", "news"],
  ["youtrack-mobile", "JetBrains", "youtrack-mobile", "YouTrack Mobile", "productivity"],
  ["ndash", "alexindigo", "ndash", "ndash", "tools"],
  ["PhotosReactNative", "7kfpun", "PhotosReactNative", "Look Lock", "media"],
  ["Kakapo-native", "bluedaniel", "Kakapo-native", "Kakapo", "lifestyle"],
  ["my-appointment", "iZaL", "my-appointment", "Appointments", "productivity"],
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
  ["manyverse", "staltz", "manyverse", "Manyverse", "social-network"],
  ["joplin", "laurent22", "joplin", "Joplin", "productivity"],
  ["nmf-app", "NotMyFaultEarth", "nmf-app", "NMF.earth", "health-and-fitness"],
  ["nyxo-app", "hello-nyxo", "nyxo-app", "Nyxo", "health-and-fitness"],
];

async function fetchRepo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${url}: ${res.status} ${res.statusText}\n${body.slice(0, 200)}`);
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
  if (typeof repo.stargazers_count !== "number" || repo.stargazers_count < 50) {
    return { ok: false, reason: "below_50_stars" };
  }
  if (daysSince(repo.pushed_at) > 365) {
    return { ok: false, reason: "stale_365d" };
  }
  return { ok: true };
}

async function main() {
  const results = [];
  const rejected = [];
  let i = 0;
  for (const [slug, owner, repo, name, category] of CANDIDATES) {
    i++;
    process.stdout.write(`[${String(i).padStart(2)}/${CANDIDATES.length}] ${owner}/${repo} ... `);
    let repoData;
    try {
      repoData = await fetchRepo(owner, repo);
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message.split("\n")[0]}\n`);
      rejected.push({ slug, owner, repo, reason: "error", error: err.message });
      continue;
    }
    const verdict = isAcceptable(repoData);
    if (!verdict.ok) {
      process.stdout.write(`reject (${verdict.reason})\n`);
      rejected.push({ slug, owner, repo, reason: verdict.reason, ...(repoData?.stargazers_count ? { stars: repoData.stargazers_count } : {}) });
      continue;
    }
    process.stdout.write(`OK (${repoData.stargazers_count}★, pushed ${repoData.pushed_at?.slice(0, 10)})\n`);
    results.push({
      slug,
      name,
      owner,
      repo,
      category,
      repoUrl: repoData.html_url,
      description: repoData.description || "",
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      pushedAt: repoData.pushed_at?.slice(0, 10),
      archived: false,
      platforms: ["Android", "iOS"],
      stack: "React Native",
    });
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), accepted: results, rejected },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`\n[import-react-native-list] ${results.length} accepted, ${rejected.length} rejected → ${OUT}`);
}

main().catch((err) => {
  console.error("[import-react-native-list] failed:", err.message);
  process.exit(1);
});
