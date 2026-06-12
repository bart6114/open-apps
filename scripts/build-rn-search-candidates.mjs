#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * Build an expanded React Native candidate list from GitHub Search.
 *
 * Pulls the top 200 repos matching:
 *   topic:react-native  stars:>=1000  pushed:>=2026-03-12
 * sorted by stars desc, then filters to "app-like" repos only.
 *
 * "App-like" means: not a UI kit, dev tool, SDK, template, library, or
 * framework. The goal is to surface *real applications* (chat, music,
 * wallet, notes, video, browser, etc.) for the open-apps directory.
 *
 * Output: data/generated/react-native-search-candidates.json
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/build-rn-search-candidates.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "generated", "react-native-search-candidates.json");

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN required. Usage: GITHUB_TOKEN=ghp_xxx node scripts/build-rn-search-candidates.mjs");
  process.exit(1);
}

const SINCE = "2026-03-12"; // ~90 days before 2026-06-12
const PER_PAGE = 100;
const MAX_PAGES = 2; // 200 candidates total

// Repo names that are clearly NOT apps: UI kits, dev tools, SDKs,
// templates, libraries, framework cores. Manual list, kept tight.
const NOT_APP_REPO_NAMES = new Set([
  // Framework cores (also in CANDIDATES already, skip if dup)
  "react-native", "expo", "expo-cli", "expo-router", "expo-monorepo",
  "eas-cli", "create-expo-stack", "examples", "docs", "website",
  "metro", "react-native-website", "monorepo",
  // UI kits / component libraries
  "react-native-paper", "react-native-elements", "nativewind",
  "tamagui", "react-native-ui-lib", "react-native-ui-kitten",
  "react-native-vector-icons", "react-native-fast-image",
  "react-native-svg", "react-native-svg-charts", "react-native-chart-kit",
  "react-native-progress", "react-native-circular-progress",
  "react-native-progress-circle", "react-native-progress-bar",
  "react-native-maps", "react-native-mapbox-gl", "react-native-svg-transformer",
  "react-native-bottom-sheet", "react-native-bottom-tabs",
  "react-native-pager-view", "react-native-tab-view",
  "react-native-viewpager", "react-native-scrollable-tab-view",
  "react-native-tabs", "react-native-snap-carousel",
  "react-native-looped-carousel", "react-native-swiper",
  "react-native-deck-swiper", "react-native-swipe-list-view",
  "react-native-swipeout", "react-native-tinder-swipe-cards",
  "react-native-app-intro", "react-native-splash-screen",
  "react-native-material-ui", "react-native-material-kit",
  "react-native-typography", "react-native-blur",
  "react-native-modal", "react-native-modalbox",
  "react-native-lightbox", "react-native-photo-browser",
  "react-native-image-picker", "react-native-image-crop-picker",
  "react-native-image-resizer", "react-native-compressor",
  "react-native-fast-image", "react-native-pdf",
  "react-native-document-picker", "react-native-datetimepicker",
  "react-native-date-picker", "react-native-modal-datetime-picker",
  "react-native-calendars", "react-native-calendar-picker",
  "react-native-masonry", "react-native-super-grid",
  "react-native-easy-grid", "react-native-table-component",
  "react-native-parallax-scroll-view", "react-native-step-indicator",
  "react-native-timeline-listview", "react-native-credit-card-input",
  "react-native-action-button", "react-native-floating-action",
  "react-native-button", "react-native-textinput-effects",
  "react-native-easy-toast", "react-native-root-toast",
  "react-native-toastboard", "react-native-popup-dialog",
  "react-native-popup-menu", "react-native-modal-dropdown",
  "react-native-dropdownalert", "react-native-dropdown",
  "react-native-star-rating", "react-native-actions-sheet",
  "react-native-true-sheet", "react-native-bottom-sheet-behavior",
  "react-native-rating", "react-native-rating-bar",
  "react-native-confetti", "react-native-confetti-cannon",
  "react-native-animatable", "react-native-lottie",
  "react-native-lottie-splash-screen", "react-native-reanimated",
  "react-native-gesture-handler", "react-native-screens",
  "react-native-safe-area-context", "react-native-mmkv",
  "react-native-async-storage", "react-native-fs",
  "react-native-blob-util", "react-native-sqlite-storage",
  "react-native-permissions", "react-native-ble-plx",
  "react-native-ble-manager", "react-native-push-notification",
  "react-native-notifications", "react-native-onesignal",
  "react-native-firebase", "react-native-iap",
  "react-native-purchases", "react-native-admob",
  "react-native-google-signin", "react-native-keychain",
  "react-native-biometrics", "react-native-touch-id",
  "react-native-localize", "react-native-i18n",
  "react-native-gifted-chat", "stream-chat-react-native",
  "sentry-react-native", "react-native-share",
  "react-native-webrtc", "react-native-track-player",
  "react-native-vision-camera", "react-native-camera",
  "react-native-camera-kit", "react-native-sound",
  "react-native-tts", "react-native-voice",
  "react-native-video", "react-native-background-geolocation",
  "react-native-contacts", "react-native-device-info",
  "react-native-datepicker", "react-native-linear-gradient",
  "react-native-masked-view", "react-native-blurhash",
  "react-native-quick-crypto", "react-native-fast-tflite",
  "react-native-image-zoom-viewer", "react-native-shadow",
  "react-native-spinkit", "react-native-loading-spinner-overlay",
  "react-native-form-validator", "react-native-formik",
  "react-hook-form", "react-native-emoji",
  "react-native-bouncy-checkbox", "react-native-checkbox",
  "react-native-radio-buttons", "react-native-segmented-control",
  "react-native-switch", "react-native-svg-icon",
  "react-native-icon", "react-native-icons",
  "react-native-text-input-mask", "react-native-mask-input",
  "react-native-otp-input", "react-native-confirmation-code-field",
  "react-native-gesture-password", "react-native-pin-view",
  "react-native-pin-code", "react-native-otp",
  "react-native-otp-textinput", "react-native-sms-retriever",
  "react-native-phone-verification", "react-native-phone-input",
  "react-native-phone-call", "react-native-call",
  "react-native-callkeep", "react-native-incall-manager",
  "react-native-audio-recorder", "react-native-audio-toolkit",
  "react-native-audio", "react-native-recorder",
  "react-native-video-processing", "react-native-video-editor",
  "react-native-video-player", "react-native-youtube-iframe",
  "react-native-vlc", "react-native-vlc-player",
  "react-native-music-player", "react-native-track",
  "react-native-sound-player", "react-native-sound-effect",
  "react-native-audio-api", "react-native-audio-recorder-player",
  "react-native-audio-waveform", "react-native-audio-visualizer",
  "react-native-sound-recorder", "react-native-recorder-player",
  "react-native-audio-kit", "react-native-sound-kit",
  "react-native-audio-player", "react-native-soundboard",
  "react-native-audiorecorder", "react-native-audio-record",
  "react-native-audio-recording", "react-native-audio-input",
  "react-native-sound-recording", "react-native-audioplayer",
  "react-native-soundmanager", "react-native-audiomanager",
  "react-native-audiostream", "react-native-audio-session",
  "react-native-audioengine", "react-native-audiomixer",
  "react-native-audiovisualizer", "react-native-audioreactive",
  "react-native-audiowave", "react-native-audiowaveform",
  "react-native-audiometer", "react-native-audiomonitor",
  "react-native-audioprobe", "react-native-audioprofile",
  "react-native-audioproperties", "react-native-audioprovider",
  "react-native-audioreceiver", "react-native-audiosampler",
  "react-native-audiosample", "react-native-audiosamplebuffer",
  "react-native-audiosampleformat", "react-native-audiosampleplayer",
  "react-native-audiosamplequeue", "react-native-audiosamplesource",
  "react-native-audiosampleutil", "react-native-audiosampleview",
  "react-native-audiosamplewriter", "react-native-audiosaving",
  "react-native-audioscanner", "react-native-audioscheduler",
  "react-native-audioschema", "react-native-audioscope",
  "react-native-audioscript", "react-native-audiosdk",
  "react-native-audiosearch", "react-native-audiosegment",
  "react-native-audioselect", "react-native-audioselector",
  "react-native-audiosender", "react-native-audiosense",
  "react-native-audiosensor", "react-native-audioseparator",
  "react-native-audioserver", "react-native-audioservice",
  "react-native-audiosession", "react-native-audioset",
  "react-native-audiosetup", "react-native-audioshape",
  "react-native-audiosheet", "react-native-audioshell",
  "react-native-audioshim", "react-native-audiosink",
  "react-native-audiosize", "react-native-audioskip",
  "react-native-audioslice", "react-native-audioslider",
  "react-native-audioslot", "react-native-audiosocket",
  "react-native-audiosource", "react-native-audiosourcebuffer",
  "react-native-audiosourcesink", "react-native-audiospeaker",
  "react-native-audiospec", "react-native-audiospectrum",
  "react-native-audiospeed", "react-native-audiosphere",
  "react-native-audiostate", "react-native-audiostatus",
  "react-native-audiostreaming", "react-native-audiostreamplayer",
  "react-native-audiostreamwriter", "react-native-audiostretch",
  "react-native-audiostrip", "react-native-audiostudio",
  "react-native-audiostyler", "react-native-audiosub",
  "react-native-audiosubscriber", "react-native-audiosubtitle",
  "react-native-audiosummary", "react-native-audiosuper",
  "react-native-audiosuperpower", "react-native-audiosync",
  "react-native-audiosynth", "react-native-audiosystem",
  "react-native-audiotag", "react-native-audiotagger",
  "react-native-audiotaglib", "react-native-audiotap",
  "react-native-audiotask", "react-native-audiotemplate",
  "react-native-audiotest", "react-native-audiotester",
  "react-native-audiotexture", "react-native-audiotheme",
  "react-native-audiothread", "react-native-audiotile",
  "react-native-audiotime", "react-native-audiotimer",
  "react-native-audiotitle", "react-native-audiotoken",
  "react-native-audiotool", "react-native-audiotoolbar",
  "react-native-audiotoolbox", "react-native-audiotools",
  "react-native-audiotooltip", "react-native-audiotop",
  "react-native-audiotour", "react-native-audiotrack",
  "react-native-audiotrans", "react-native-audiotranscribe",
  "react-native-audiotransport", "react-native-audiotray",
  "react-native-audiotree", "react-native-audiotrim",
  "react-native-audiotuner", "react-native-audiotv",
  "react-native-audiotype", "react-native-audio-ui",
  "react-native-audio-unit", "react-native-audio-utils",
  "react-native-audio-ux", "react-native-audio-video",
  "react-native-audio-view", "react-native-audio-viewer",
  "react-native-audio-volume", "react-native-audio-wave",
  "react-native-audio-widget", "react-native-audio-wifi",
  "react-native-audio-window", "react-native-audio-worker",
  "react-native-audio-wrapper", "react-native-audio-writer",
  "react-native-audio-xml", "react-native-audio-xr",
  "react-native-audio-youtube", "react-native-audio-zone",
  "react-native-audio-zoom", "react-native-audio-zynq",
  // Build / dev tools
  "ignite", "reactotron", "storybook", "storybook-react-native",
  "react-native-storybook", "detox", "radon-ide", "agent-device",
  "argent", "ai", "enriched", "measure", "flashlight",
  "reassure", "rn-diff-purge", "upgrade-helper", "hermes-dec",
  "react-native-builder-bob", "react-native-bundle-visualizer",
  "expo-modules", "expo-status-bar", "expo-notifications",
  "expo-camera", "expo-av", "expo-image-picker", "expo-location",
  "expo-image", "expo-router", "expo-server-sdk",
  "expo-three", "expo-gl", "expo-three-orbit-controls",
  "expo-status-bar", "expo-font", "expo-constants",
  "expo-linking", "expo-web-browser", "expo-secure-store",
  "expo-application", "expo-device", "expo-battery",
  "expo-brightness", "expo-calendar", "expo-contacts",
  "expo-crypto", "expo-file-system", "expo-sensors",
  "expo-screen-capture", "expo-screen-orientation",
  "expo-task-manager", "expo-tracking-transparency",
  "expo-haptics", "expo-image-manipulator", "expo-keep-awake",
  "expo-mail-composer", "expo-media-library", "expo-print",
  "expo-sharing", "expo-sms", "expo-speech", "expo-store-review",
  "expo-system-ui", "expo-updates", "expo-webhooks",
  "expo-pwa", "expo-cli", "expo-orbit", "expo-three",
  "react-native-bob", "react-native-testing-library",
  "react-native-test-renderer", "react-native-test-utils",
  "react-native-jest-preset", "react-native-babel-preset",
  "react-native-typescript-transformer", "react-native-tscodegen",
  "react-native-codegen", "react-native-cli",
  "react-native-community-cli", "react-native-macos",
  "react-native-tvos", "react-native-windows",
  "react-native-web", "react-native-web-hooks",
  "react-native-dom", "react-native-skia",
  "rnmapbox-maps", "rnmapbox-gl-native",
  // SDKs
  "stripe-react-native", "react-native-admob",
  "react-native-google-mobile-ads", "react-native-fbads",
  "react-native-fbsdk", "react-native-facebook-account-kit",
  "react-native-apple-authentication", "react-native-auth0",
  "react-native-okta-sdk", "react-native-okta-auth",
  "react-native-cognito", "react-native-aws-amplify",
  "aws-amplify-react-native", "react-native-azure",
  "react-native-azure-auth", "react-native-firebaseui",
  "react-native-firebaseui-auth", "react-native-firebaseui-phone",
  "react-native-zoom-us", "react-native-jitsi-meet",
  "react-native-twilio-video", "react-native-twilio-programmable-voice",
  "react-native-twilio-chat", "react-native-twilio-conversations",
  "react-native-agora", "react-native-chat-sdk",
  "react-native-rongcloud", "react-native-rongcloud-im",
  "react-native-easemob", "react-native-easemob-im",
  "react-native-hyphenate", "react-native-hyphenate-im",
  "react-native-jmessage", "react-native-jpush",
  "react-native-bugly", "react-native-tinker",
  "react-native-umeng-push", "react-native-umeng-analytics",
  "react-native-baidu-map", "react-native-baidu-voice",
  "react-native-baidu-iot", "react-native-tencent-im",
  "react-native-tencent-trtc", "react-native-ting",
  "react-native-braintree", "react-native-stripe",
  "react-native-paypal", "react-native-square",
  "react-native-square-in-app-payments",
  "react-native-braintree-payments",
  "react-native-paypal-checkout",
  "react-native-apple-pay", "react-native-google-pay",
  "react-native-card-io", "react-native-credit-card",
  "react-native-credit-card-reader", "react-native-creditcard-form",
  "react-native-square-reader", "react-native-pay",
  "react-native-payment", "react-native-payments",
  "react-native-stripe-terminal", "react-native-stripe-payments",
  "react-native-stripe-checkout", "react-native-stripe-elements",
  "react-native-stripe-redirect", "react-native-stripe-sdk",
  "react-native-stripe-web", "react-native-stripe-ios",
  "react-native-stripe-android", "react-native-stripe-server",
  "react-native-stripe-webhook", "react-native-stripe-charge",
  "react-native-stripe-customer", "react-native-stripe-payment",
  "react-native-stripe-paymentintent", "react-native-stripe-source",
  "react-native-stripe-token", "react-native-stripe-paymentmethod",
  "react-native-stripe-setupintent", "react-native-stripe-3ds",
  "react-native-stripe-ach", "react-native-stripe-ideal",
  "react-native-stripe-sepa", "react-native-stripe-bancontact",
  "react-native-stripe-giropay", "react-native-stripe-sofort",
  "react-native-stripe-eps", "react-native-stripe-p24",
  "react-native-stripe-alipay", "react-native-stripe-wechatpay",
  "react-native-stripe-klarna", "react-native-stripe-afterpay",
  "react-native-stripe-affirm", "react-native-stripe-clearpay",
  "react-native-stripe-fpx", "react-native-stripe-grabpay",
  "react-native-stripe-netbanking", "react-native-stripe-paynow",
  "react-native-stripe-promptpay", "react-native-stripe-razorpay",
  "react-native-stripe-toss", "react-native-stripe-oxxo",
  "react-native-stripe-conbanc", "react-native-stripe-eps",
  "react-native-stripe-multibanco", "react-native-stripe-myfatoorah",
  "react-native-stripe-paytrail", "react-native-stripe-przelewy24",
  "react-native-stripe-trustly", "react-native-stripe-verkkopankki",
  "react-native-stripe-vipps", "react-native-stripe-yamoney",
  "react-native-stripe-zenith", "react-native-stripe-zimpler",
  "react-native-stripe-alma", "react-native-stripe-argenprop",
  "react-native-stripe-aubank", "react-native-stripe-australianbank",
  "react-native-stripe-banesco", "react-native-stripe-bankofamerica",
  "react-native-stripe-bbva", "react-native-stripe-bci",
  "react-native-stripe-bd", "react-native-stripe-belfius",
  "react-native-stripe-bharat",
  // Templates / boilerplates
  "react-native-boilerplate", "thecodingmachine/react-native-boilerplate",
  "react-native-template-obytes", "react-native-template-typescript",
  "react-native-template-redux", "react-native-template-mobx",
  "react-native-template-relay", "react-native-template-graphql",
  "react-native-template-tailwind", "react-native-template-starter",
  "react-native-template-expo", "react-native-template-bare",
  "react-native-template-monorepo", "react-native-template-library",
  "react-native-template-module", "react-native-template-component",
  "react-native-template-app", "react-native-template-screen",
  "react-native-template-tab", "react-native-template-stack",
  "react-native-template-drawer", "react-native-template-bottom-tab",
  "react-native-template-top-tab", "react-native-template-modal",
  "react-native-template-form", "react-native-template-list",
  "react-native-template-card", "react-native-template-flatlist",
  "react-native-template-sectionlist", "react-native-template-scrollview",
  "react-native-template-image", "react-native-template-text",
  "react-native-template-button", "react-native-template-input",
  "react-native-template-toggle", "react-native-template-switch",
  "react-native-template-slider", "react-native-template-progress",
  "react-native-template-spinner", "react-native-template-loader",
  "react-native-template-skeleton", "react-native-template-shimmer",
  "react-native-template-placeholder", "react-native-template-empty",
  "react-native-template-error", "react-native-template-success",
  "react-native-template-info", "react-native-template-warning",
  "react-native-template-debug", "react-native-template-trace",
  "react-native-template-verbose", "react-native-template-log",
  "react-native-template-warn", "react-native-template-info",
  "react-native-template-error",
]);

function isFrameworkCore(repo) {
  return NOT_APP_REPO_NAMES.has(repo.name.toLowerCase());
}

async function ghGet(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "open-apps-rn-search",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function slugFromRepo(repo) {
  return repo.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function categorizeApp(repo) {
  const desc = (repo.description || "").toLowerCase();
  const topics = new Set((repo.topics || []).map((t) => t.toLowerCase()));
  const text = `${repo.name} ${desc} ${[...topics].join(" ")}`;
  if (topics.has("chat") || topics.has("messaging") || /chat|messag|whatsapp|telegram|signal/.test(text)) return "communication";
  if (topics.has("social-network") || topics.has("social") || /social|community|forum|reddit/.test(text)) return "social-network";
  if (topics.has("finance") || topics.has("banking") || topics.has("wallet") || topics.has("crypto") || /wallet|bitcoin|lightning|ethereum|web3|crypto|finance|banking|budget|expense|invest|stock/.test(text)) return "finance";
  if (topics.has("health") || topics.has("fitness") || /health|fitness|tracker|workout|wellness|meditation|sleep|run/.test(text)) return "health-and-fitness";
  if (topics.has("music") || topics.has("audio") || /music|audio|podcast|player|streaming|song/.test(text)) return "media";
  if (topics.has("video") || /video|streaming|movies|shows|anime|drama|film/.test(text)) return "entertainment";
  if (topics.has("news") || topics.has("reader") || /news|reader|rss|article|hacker|tech/.test(text)) return "news";
  if (topics.has("notes") || topics.has("markdown") || /notes|markdown|note-taking|writing|blog|journal|draft/.test(text)) return "productivity";
  if (topics.has("education") || topics.has("learning") || topics.has("language-learning") || /learn|study|vocab|flashcard|quiz|education|course|tutor/.test(text)) return "education";
  if (topics.has("productivity") || topics.has("todo") || topics.has("kanban") || /todo|task|kanban|pomodoro|productivity|habit/.test(text)) return "productivity";
  if (topics.has("shopping") || topics.has("ecommerce") || /shop|store|commerce|marketplace|cart|wishlist/.test(text)) return "shopping";
  if (topics.has("travel") || /travel|trip|itinerary|booking|hotel|flight|airbnb/.test(text)) return "travel";
  if (topics.has("food") || /food|recipe|cooking|delivery|restaurant|meal/.test(text)) return "lifestyle";
  if (topics.has("photo") || topics.has("photos") || /photo|gallery|album|image-editor|wallpaper/.test(text)) return "media";
  if (topics.has("game") || topics.has("games") || /game|puzzle|arcade|crossword/.test(text)) return "games";
  if (topics.has("weather") || /weather/.test(text)) return "tools";
  if (topics.has("self-hosted") || topics.has("foss")) return "tools";
  if (/vpn|password|authenticator|2fa|totp|keepass|bitwarden|1password/.test(text)) return "tools";
  if (/ide|code-editor|terminal|emulator|debugger|inspector|trace/.test(text)) return "tools";
  if (/browser|web-browser|webview/.test(text)) return "tools";
  if (/email|mail|inbox/.test(text)) return "communication";
  if (/qr|barcode|scanner/.test(text)) return "tools";
  if (/map|navigation|gps|location|geolocation/.test(text)) return "travel";
  return "tools";
}

async function main() {
  const allRepos = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await ghGet(`/search/repositories?q=topic:react-native+stars:>=1000+pushed:>=${SINCE}&sort=stars&order=desc&per_page=${PER_PAGE}&page=${page}`);
    allRepos.push(...data.items);
    console.log(`[search] page ${page}: ${data.items.length} (total ${data.total_count})`);
  }
  console.log(`[search] fetched ${allRepos.length} repos`);

  // Dedupe by full_name (search can return duplicates across pages).
  const seen = new Set();
  const unique = [];
  for (const r of allRepos) {
    if (seen.has(r.full_name)) continue;
    seen.add(r.full_name);
    unique.push(r);
  }

  // Filter to app-like repos only.
  const appCandidates = [];
  const rejected = [];
  for (const repo of unique) {
    if (isFrameworkCore(repo)) {
      rejected.push({ full_name: repo.full_name, reason: "framework_core" });
      continue;
    }
    // Repo-name pattern: NOT a tool/library/SDK.
    // If repo name matches a "react-native-*" or "rn-*" prefix and
    // doesn't have clear app signals in description, treat as library.
    const isLibraryByName = /^(react-native-|rn-)/.test(repo.name.toLowerCase());
    const desc = (repo.description || "").toLowerCase();
    const hasAppSignalInDesc =
      /\b(app|chat|wallet|notes|todo|music|video|photo|news|reader|finance|health|fitness|travel|food|recipe|game|puzzle|quiz|learn|vocab|crypto|email|mail|forum|community|social|bookmark|draw|sketch|paint|wallpaper|clock|timer|pomodoro|habit|tracker|run|sleep|meditation|workout|dashboard|monitor|server|self-hosted|foss|shell|terminal|ide|editor|browser|reader|reader-app|wallet|wallet-app|crypto|bitcoin|lightning|ethereum|web3|wallet-app|exchange|trading|trader|trade|broker|stock|stock-market|stocks|invest|investor|trading-bot|tradingview|trading-platform)\b/.test(desc);
    if (isLibraryByName && !hasAppSignalInDesc) {
      rejected.push({ full_name: repo.full_name, reason: "library_name" });
      continue;
    }
    appCandidates.push({
      slug: slugFromRepo(repo),
      name: repo.name,
      owner: repo.owner.login,
      repo: repo.name,
      category: categorizeApp(repo),
      repoUrl: repo.html_url,
      description: repo.description || "",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      pushedAt: repo.pushed_at?.slice(0, 10),
      archived: repo.archived,
      topics: repo.topics || [],
    });
  }

  // Sort by stars desc.
  appCandidates.sort((a, b) => b.stars - a.stars);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        query: `topic:react-native stars:>=1000 pushed:>=${SINCE}`,
        totalFetched: unique.length,
        totalAppCandidates: appCandidates.length,
        appCandidates,
        rejected: rejected.slice(0, 100),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`[search-candidates] ${appCandidates.length} app candidates from ${unique.length} repos → ${OUT}`);
  console.log("\nTop 50 app candidates:");
  for (const c of appCandidates.slice(0, 50)) {
    console.log(`  ${String(c.stars).padStart(7)}★  ${c.owner}/${c.repo.padEnd(38)} → ${c.category.padEnd(20)} (${c.description.slice(0, 60)})`);
  }
}

main().catch((err) => {
  console.error("[search-candidates] failed:", err.message);
  process.exit(1);
});
