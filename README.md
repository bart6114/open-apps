# Open Apps

> A curated directory of real open-source applications you can run, study,
> compare, and contribute to.

[![Website](https://img.shields.io/badge/explore-open--apps.dev.mn-111827?style=flat-square)](https://open-apps.dev.mn)
[![Validate app data](https://img.shields.io/github/actions/workflow/status/tortuvshin/open-apps/validate-data.yml?branch=main&style=flat-square&label=data)](https://github.com/tortuvshin/open-apps/actions/workflows/validate-data.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Astro](https://img.shields.io/badge/built%20with-Astro-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)

[Explore the directory](https://open-apps.dev.mn/apps) ·
[Submit an app](https://open-apps.dev.mn/submit) ·
[Read the contribution guide](CONTRIBUTING.md)

![Open Apps — discover open-source apps worth studying](public/og-image.svg)

## Why Open Apps?

GitHub is excellent when you already know what to search for. Traditional
awesome lists are useful for discovery, but a repository name and star count
rarely tell you whether a codebase is worth your time.

Open Apps adds the context developers need to make that decision:

- **Real applications, not toy projects** — complete products with meaningful
  scope, structure, and a clear license.
- **Practical discovery** — browse by category, platform, stack, activity, and
  maturity.
- **Useful learning signals** — understand what a project is best for, how
  difficult it is, and what architectural ideas it demonstrates.
- **Fresh repository metadata** — scheduled automation refreshes activity and
  contributor data through reviewable pull requests.
- **Open, portable data** — every catalog entry is a human-readable YAML file
  in this repository.

Stars are a signal, not a ranking system. The goal is to surface codebases
that are useful to read, run, learn from, or improve.

## What belongs in the directory?

Open Apps covers mobile, web, desktop, full-stack, and developer-facing
applications. A project must be a genuine application with a public source
repository, an identifiable license, at least 50 stars, and at least 50
lifetime commits.

The directory does not accept:

- tutorials, snippets, or one-screen demos;
- boilerplates and starter templates;
- package-only libraries and SDKs;
- archived projects with no enduring learning value;
- repositories with an unclear license or purpose.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete curation and submission
rules.

## Catalog data

Each app lives in its own file:

```text
data/apps/<slug>.yml
```

Records combine human curation with GitHub metadata:

| Area | Examples | Maintained by |
| --- | --- | --- |
| App identity | name, description, category, platforms | contributors and curators |
| Technology | primary stack, languages, frameworks | contributors and curators |
| Repository | stars, forks, releases, activity | scheduled GitHub sync |
| Health | status, listing tier, cleanup candidacy | build and cleanup automation |
| Curation | learning value, caveats, review notes | curators |

The canonical field definitions, ownership rules, taxonomy IDs, and a complete
record example are documented in [docs/SCHEMA.md](docs/SCHEMA.md).

### Data pipeline

```text
data/apps/*.yml
      │
      ├─ validate schema and taxonomy
      ├─ normalize and score records
      └─ generate build-time JSON
             ├─ apps.index.json  → lightweight search and listing data
             ├─ apps.full.json   → complete app records
             └─ apps.json        → compatibility payload
                      │
                      └─ Astro static site → dist/
```

Files under `data/generated/` are derived artifacts unless explicitly tracked.
Edit the YAML source records rather than generated JSON.

## Local development

### Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 10.12.1 (the version is pinned in `package.json`)

### Start the site

```sh
git clone https://github.com/tortuvshin/open-apps.git
cd open-apps
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The development server prints its local URL, normally
`http://localhost:4321`.

### Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Generate app data and start the Astro development server |
| `pnpm build` | Validate data, generate AI-readable files, and build the site |
| `pnpm preview` | Preview the production build locally |
| `pnpm check` | Run Astro and TypeScript checks |
| `pnpm test` | Run the Node.js test suite |
| `pnpm validate:data` | Validate every app record without building the site |
| `pnpm build:data` | Validate YAML and regenerate catalog JSON |
| `pnpm refresh:activity` | Refresh per-app activity from the GitHub API |
| `pnpm sync:contributors` | Refresh this repository's contributor metadata |

GitHub API scripts use `GITHUB_TOKEN` when available. Routine local development,
validation, and builds do not require a token.

## Project structure

```text
.
├── data/
│   ├── apps/             # one YAML source record per app
│   ├── generated/        # build-time catalog output
│   └── taxonomy/         # allowed categories, platforms, stacks, and channels
├── docs/
│   └── SCHEMA.md         # catalog schema and ownership contract
├── public/               # static assets and AI-readable endpoints
├── scripts/              # validation, generation, sync, and migration tools
├── src/
│   ├── components/       # Astro UI components
│   ├── data/             # typed catalog adapters and site metadata
│   ├── lib/              # search, scoring, formatting, and taxonomy helpers
│   └── pages/            # static routes and app detail pages
└── .github/workflows/    # validation and scheduled metadata maintenance
```

The site is built with [Astro](https://astro.build), TypeScript, and
[Tailwind CSS](https://tailwindcss.com/). It produces static assets in `dist/`
and is configured for deployment with Cloudflare Wrangler.

## Add or update an app

The fastest submission path is the
[web form](https://open-apps.dev.mn/submit). It drafts a YAML record from a
public GitHub URL; you review the metadata and open a pull request.

For a manual contribution:

1. Create or edit `data/apps/<slug>.yml`.
2. Keep human-owned fields under `app`, `stack`, and `curation`.
3. Do not hand-edit automation-owned `github` or `health` fields.
4. Run `pnpm validate:data`, `pnpm test`, and `pnpm build`.
5. Open a focused pull request.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting data or code.
All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Automation

GitHub Actions keeps changes visible and reviewable:

- pull requests that touch catalog data run schema validation, data generation,
  and unit tests;
- app activity and GitHub-shaped metadata are refreshed daily;
- repository contributor statistics are refreshed weekly;
- stale-app candidates are reported weekly for curator review.

Scheduled jobs open pull requests when source data changes. They do not silently
remove catalog entries.

## AI-readable catalog

The deployed site publishes:

- [`llms.txt`](https://open-apps.dev.mn/llms.txt) — a compact guide to the site;
- [`llms-full.txt`](https://open-apps.dev.mn/llms-full.txt) — the expanded
  catalog for AI assistants and retrieval tools.

These files are generated from the same source data as the website.

## Project history

Open Apps grew from
[`open-source-flutter-apps`](https://github.com/tortuvshin/open-source-flutter-apps).
The original README-only collection is preserved in
[README-LEGACY.md](README-LEGACY.md), while this project evolves it into a
structured, searchable, multi-stack directory.

<!-- grove-readme:start -->
# Open Apps — a directory of real open-source applications

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

Hand-picked apps worth running, studying, and extending.

Browse the directory → https://open-apps.dev.mn

## Why this list

Each app below is **actively maintained**, **well documented**, and
**useful in production**. Submit a new entry via the web form or
by opening a pull request against `data/records/`.

## Contents

- [Productivity](#productivity)
- [Finance](#finance)
- [Education](#education)
- [Tools](#tools)
- [Communication](#communication)
- [Health and Fitness](#health-and-fitness)
- [Business](#business)
- [Games](#games)
- [Media](#media)
- [Entertainment](#entertainment)
- [Social Network](#social-network)
- [Shopping](#shopping)
- [News and Magazine](#news-and-magazine)
- [Travel](#travel)
- [Lifestyle](#lifestyle)
- [Personalization](#personalization)

## Productivity

- [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) - Bring projects, wikis, and teams together with AI. AppFlowy is the AI collaborative workspace where you achieve more without losing control of your data. The leading open source Notion alternative.
- [BookSearch](https://github.com/Norbert515/BookSearch) - Digital BookShelf for your reading progress.
- [Feather](https://github.com/claration/Feather) - Free on-device iOS/iPadOS application manager/installer, using certificates part of the Apple Developer Program.
- [Flutter Todo](https://github.com/tuannguyendotme/flutter_todo) - This Todo app is implemented using Flutter.
- [Habbit](https://github.com/lzyy/habbit) - Habbit is an ultra simple habit tracker that just works.
- [Harbour](https://github.com/rrroyal/Harbour) - Docker/Portainer management app for iOS, iPadOS and macOS.
- [HorizonCalendar](https://github.com/airbnb/HorizonCalendar) - A declarative, performant, iOS calendar UI component that supports use cases ranging from simple date pickers all the way up to fully-featured calendar apps.
- [ish](https://github.com/ish-app/ish) - Linux shell for iOS.
- [Joplin](https://github.com/laurent22/joplin) - Joplin is a free, open source note taking and to-do application. The mobile client is built with React Native and supports full sync via Nextcloud, Dropbox, OneDrive, WebDAV, and Joplin Cloud.
- [Karakeep](https://github.com/karakeep-app/karakeep) - A self-hostable bookmark-everything app (links, notes and images) with AI-based automatic tagging and full text search.
- [LibreTrack](https://github.com/proninyaroslav/libretrack) - Private, cross-platform package tracking app.
- [Linkwarden](https://github.com/linkwarden/linkwarden) - ⚡️⚡️⚡️ Self-hosted collaborative bookmark manager to collect, read, annotate, and fully preserve what matters, all in one place.
- [Memex](https://github.com/memex-lab/memex) - An open-source, local-first AI journal for iOS and Android that turns text, photo and voice fragments into structured timeline cards and organizes knowledge using the P.A.R.A. methodology.
- [Notes App](https://github.com/bimsina/notes-app) - Note Taking App made with Flutter with Sqlite as database.
- [Notesnook](https://github.com/streetwriters/notesnook) - A fully open source & end-to-end encrypted note taking alternative to Evernote.
- [OnionBrowser](https://github.com/OnionBrowser/OnionBrowser) - An open-source, privacy-enhancing web browser for iOS, utilizing the Tor anonymity network.
- [proton](https://github.com/rajdeep/proton) - Purely native and extensible rich text editor for iOS and macOS Catalyst apps.
- [Taskist](https://github.com/huextrat/Taskist) - Taskist is a ToDo List app for Task Management.
- [Time Cop](https://github.com/hamaluik/timecop) - A time tracking app that respects your privacy.
- [Trinity Orientation](https://github.com/matthewtory/trinity-orientation-2018) - Orientation week at Trinity College, U of T.
- [UTM](https://github.com/utmapp/UTM) - Virtual machines for iOS and macOS.
- [WhatTodo](https://github.com/burhanrashid52/WhatTodo) - Todoist like UI.
- [YouTrack Mobile](https://github.com/JetBrains/youtrack-mobile) - Official JetBrains YouTrack mobile app — issue tracking, agile boards, knowledge base, and notifications for YouTrack projects.

## Finance

- [BeeCount](https://github.com/TNT-Likely/BeeCount) - Privacy-first cross-platform expense tracker with self-hostable cloud sync (BeeCount Cloud, iCloud, Supabase, WebDAV, S3) and offline-first design.
- [BlueWallet](https://github.com/BlueWallet/BlueWallet) - Bitcoin wallet for iOS & Android. Built with React Native.
- [MetaMask Mobile](https://github.com/MetaMask/metamask-mobile) - Mobile web browser providing access to websites that use the Ethereum blockchain.
- [Platypus Crypto](https://github.com/Blakexx/CryptoTracker) - Platypus Crypto is an ad-free cross-platform robust solution for tracking cryptocurrency assets.
- [Rainbow](https://github.com/rainbow-me/rainbow) - 🌈‒ the Ethereum wallet that lives in your pocket.
- [Trace](https://github.com/trentpiercy/trace) - Modern and powerful crypto portfolio & market explorer.

## Education

- [Mathematics](https://github.com/j-j-gajjar/mathematics/) - Generate MCQ PDF / Question PDF : With Answer and Quiz [J-J-GAJJAR](https://github.com/j-j-gajjar).
- [Neumorphic Calculator](https://github.com/mllrr96/Neumorphic-Calculator) - Elegant and highly customizable calculator app with a beautiful neumorphic design.
- [TubeCards](https://github.com/friebetill/tubecards/) - Cross-platform Spaced Repetition App for flashcards.
- [What the thing?](https://github.com/vigzmv/what_the_thing) - Point your camera at objects to learn how to say them in another language. Object-recognition powered app built with React Native.

## Tools

- [Airdash](https://github.com/simonbengtsson/airdash) - Share files to any device.
- [AltStore](https://github.com/altstoreio/AltStore) - AltStore is an alternative app store for non-jailbroken iOS devices.
- [BarcodeScanner](https://github.com/hyperoslo/BarcodeScanner) - :mag_right: A simple and beautiful barcode scanner.
- [BikeShare](https://github.com/joreilly/BikeShare) - SwiftUI, Jetpack Compose, Compose for Desktop and Compose for Web based Kotlin Multiplatform project (using CityBikes API http://api.citybik.es/v2/). Uses Room for local persistence.
- [Blink Comparison](https://github.com/proninyaroslav/blink-comparison) - Simplifies comparing photos of tamper-evident seals and patterns using your eyes.
- [Cap](https://cap.so) - Open source Loom alternative. Beautiful, shareable screen recordings.
- [CleanStore](https://github.com/Clean-Swift/CleanStore) - A sample iOS app built using the Clean Swift architecture. Clean Swift is Uncle Bob's Clean Architecture applied to iOS and Mac projects. CleanStore demonstrates Clean Swift by implementing the create order use case described by in Uncle Bob's talks.
- [CoronaTracker](https://github.com/mhdhejazi/CoronaTracker) - Coronavirus tracker app for iOS & macOS with maps & charts.
- [designcode-swiftui](https://github.com/mythxn/designcode-swiftui) - 📱 an app fully written in swiftui showcasing beautiful design and animations.
- [Ejimo](https://github.com/albemala/emoji-picker) - Cross-platform emoji and symbol picker.
- [Flitter](https://github.com/dart-flitter/flitter) - Glitter app.
- [Flutter Browser App](https://github.com/pichillilorenzo/flutter_browser_app) - A Full-Featured Mobile Browser App.
- [FlutterWeather](https://github.com/ArizArmeidi/FlutterWeather) - Weather App with clean and modern UI.
- [GIOVANNI](https://github.com/gabrieloc/GIOVANNI) - A Gameboy Emulator for the Apple Watch.
- [GitUp](https://github.com/git-up/GitUp) - The Git interface you've been missing all your life has finally arrived.
- [Immich](https://github.com/immich-app/immich) - Self-hosted photo and video backup solution directly from your mobile phone.
- [Messenger](https://github.com/relatedcode/Messenger) - Messenger.
- [Monkey](https://github.com/coderyi/Monkey) - Monkey is an unofficial GitHub client for iOS,to show the rank of coders and repositories.
- [NWPusher](https://github.com/noodlewerk/NWPusher) - OS X and iOS application and framework to play with the Apple Push Notification service (APNs).
- [One Second Diary](https://github.com/KyleKun/one_second_diary) - Minimalist Video Diary app.
- [PeopleInSpace](https://github.com/joreilly/PeopleInSpace) - Kotlin Multiplatform sample with SwiftUI, Jetpack Compose, Compose for Wear, Compose for Desktop, and Compose for Web clients along with Ktor backend.
- [purposeful-ios-animations](https://github.com/GetStream/purposeful-ios-animations) - Meaningful iOS animations built to inspire you in creating useful animations for your apps. Each of the animations here was cloned with SwiftUI. Have you seen an app animation you love to rebuild and add to this repo?, contact [@amos_gyamfi](https://twitter.com/amos_gyamfi) and [@stefanjblos](https://twitter.com/stefanjblos) on Twitter.
- [reddit-swiftui](https://github.com/carson-katri/reddit-swiftui) - A cross-platform Reddit client built in SwiftUI.
- [RxTodo](https://github.com/devxoul/RxTodo) - IOS Todo Application using RxSwift and ReactorKit.
- [SpriteKitWatchFace](https://github.com/steventroughtonsmith/SpriteKitWatchFace) - SpriteKit-based faux analog watch face example for watchOS.
- [SwiftHub](https://github.com/khoren93/SwiftHub) - GitHub iOS client in RxSwift and MVVM-C clean architecture.
- [SwiftLanguageWeather](https://github.com/JakeLin/SwiftLanguageWeather) - Swift Language Weather is an iOS weather app developed in Swift 4. .
- [SwiftTerm](https://github.com/migueldeicaza/SwiftTerm) - Xterm/VT100 Terminal emulator in Swift.
- [SwiftUITodo](https://github.com/devxoul/SwiftUITodo) - The world-1st example to-do list app using SwiftUI which is introduced in WWDC19.
- [TermiWatch](https://github.com/kuglee/TermiWatch) - Terminal Watch Face for Apple Watch.
- [The-OldOS-Project](https://github.com/zzanehip/The-OldOS-Project) - Recreating a fully functional version of iOS 4 in SwiftUI. .
- [Tura](https://github.com/Tura-AI/tura) - Build agent that uses 80% less token and delivers better results.
- [Unwrap](https://github.com/twostraws/Unwrap) - Learn Swift interactively on your iPhone.
- [xbmc](https://github.com/xbmc/xbmc) - Kodi is an award-winning free and open source home theater/media center software and entertainment hub for digital media. With its beautiful interface and powerful skinning engine, it's available for Android, BSD, Linux, macOS, iOS, tvOS and Windows.
- [YoCelsius](https://github.com/YouXianMing/YoCelsius) - A weather app that uses animation to give you an at-a-glance look at the weather.
- [Zefyr](https://github.com/memspace/zefyr) - Soft and gentle rich text editing for Flutter applications.

## Communication

- [apprtc-ios](https://github.com/ISBX/apprtc-ios) - A native iOS video chat app based on WebRTC.
- [Berty](https://github.com/berty/berty) - Berty is a secure peer-to-peer messaging app that works with or without internet access, cellular data or trust in the network.
- [DroidKaigi2018-flutter](https://github.com/konifar/droidkaigi2018-flutter) - Unofficial conference app for DroidKaigi 2018 Tokyo.
- [FlutterMates](https://github.com/CodemateLtd/FlutterMates) - A sample app for our internal company talk about Flutter.
- [Keybase](https://github.com/keybase/client) - Keybase Go Library, Client, Service, OS X, iOS, Android, Electron.
- [Mattermost Mobile](https://github.com/mattermost/mattermost-mobile) - Next generation iOS and Android apps for Mattermost in React Native.
- [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat.ReactNative) - Official Rocket.Chat mobile client — open-source team communication, channels, threads, file sharing, voice/video calls, end-to-end encrypted.
- [SpaceX GO](https://github.com/jesusrp98/spacex-go) - Simple yet powerful, open-source SpaceX launch tracker.
- [Status.im](https://github.com/status-im/status-react) - Status is a secure messaging app, Ethereum wallet, and Web3 browser built on decentralized protocols.
- [thunderbird-ios](https://github.com/thunderbird/thunderbird-ios) - Thunderbird for iOS – Open Source Email App for iOS.
- [TSWeChat](https://github.com/hilen/TSWeChat) - A WeChat alternative. Written in Swift 5.

## Health and Fitness

- [Open Food Facts](https://github.com/openfoodfacts/smooth-app) - The new mobile app of Open Food Facts, with other 2 million installs, that allows you to understand the health and environmental impact of your food, as well as to contribute new products to the Open Database [Open Food facts](.
- [Weight Tracker](https://github.com/MSzalek-Mobile/weight_tracker) - Weight Tracker is an application dedicated for people who want to dump or maintain weight.
- [wger](https://github.com/wger-project/flutter) - Flutter fitness/workout app for wger by the [wger project](https://github.com/wger-project).
- [WorkoutTracker](https://github.com/jerichoi224/WorkoutTracker) - A Flutter app to help you keep track of workout sessions.

## Business

- [Invoice Ninja](https://invoiceninja.com/) - Companion app for the Invoice Ninja platform. Invoicing, expenses, time-billing, payments.
- [Minsk8](https://github.com/comerc/minsk8) - Marketplace with Hasura & Firebase.
- [Open E-Commerce App](https://github.com/4seer/openflutterecommerceapp) - Open Flutter Project E-commerce App.

## Games

- [2048](https://github.com/danqing/2048) - The iOS version of 2048, made using SpriteKit.
- [Crush](https://github.com/boeledi/flutter_crush) - How to build a Math-3 game, like Candy Crush, Bejeweled.
- [DOOM-iOS](https://github.com/id-Software/DOOM-iOS) - DOOM Classic for iOS Source Release.
- [FlappySwift](https://github.com/newlinedotco/FlappySwift) - Swift implementation of flappy bird. More at fullstackedu.com.
- [Flip](https://github.com/RedBrogdon/flutterflip) - Reversi game.
- [Math Matrix](https://github.com/jaysavsani07/math-metrix) - Brain training games composition [Mehul Makwana](https://github.com/mehulmk).
- [Pokedex](https://github.com/scitbiz/flutter_pokedex) - Pokedex app built.
- [Slide Puzzle](https://github.com/kevmoo/slide_puzzle) - Classic slide (15) puzzle.
- [Sudoku](https://github.com/VarunS2002/Flutter-Sudoku) - Sudoku Game built.
- [swift-2048](https://github.com/austinzheng/swift-2048) - 2048 for Swift.

## Media

- [AudioKit](https://github.com/AudioKit/AudioKit) - Audio synthesis, processing, & analysis platform for iOS, macOS and tvOS.
- [Cinematic](https://github.com/aaronoe/FlutterCinematic) - UI for Movie DB Public API.
- [Dai-Hentai](https://github.com/DaidoujiChen/Dai-Hentai) - 一個普通的看漫畫 App.
- [Dunk](https://github.com/naoyashiga/Dunk) - Dunk is Dribbble client.:basketball:.
- [EhPanda](https://github.com/EhPanda-Team/EhPanda) - An unofficial E-Hentai App for iOS built with SwiftUI & TCA.
- [Filterpedia](https://github.com/FlexMonkey/Filterpedia) - Core Image Filter Explorer & Showcase.
- [Flutter Music](https://github.com/o-ifeanyi/musicPlayer) - A Flutter music player to play songs.
- [Grey](https://github.com/avirias/Grey) - A Material designed music player developed in Flutter.
- [InKino](https://github.com/roughike/inKino) - A multiplatform Dart movie app.
- [iOS-Depth-Sampler](https://github.com/shu223/iOS-Depth-Sampler) - Code examples for Depth APIs in iOS.
- [MovieLab](https://github.com/ErfanRht/MovieLab) - A useful and modern movie database app.
- [Music Player](https://github.com/iampawan/Flutter-Music-Player) - Full featured music player.
- [PixPic](https://github.com/Yalantis/PixPic) - PixPic, a Photo Editing App.
- [SBSAnimoji](https://github.com/simonbs/SBSAnimoji) - 🐵 Animoji app using Apples AvatarKit.
- [Swift-Radio-Pro](https://github.com/analogcode/Swift-Radio-Pro) - Professional Radio Station App for iOS.

## Entertainment

- [AnimSearch](https://github.com/ArizArmeidi/AnimSearch) - Anime and Manga search app. created using Flutter and Jikan API.
- [ATV-Bilibili-demo](https://github.com/yichengchen/ATV-Bilibili-demo) - BiliBili Client Demo for Apple TV (tvOS).
- [CineReel](https://github.com/kserko/CineReel) - You can see lists for Now playing, Top Rated, Popular and Upcoming movies.
- [Doddle- (become an artist in a minute)](https://github.com/NaserElziadna/doddle) - 💚Amazing magical doodle drawing app/game provide a creative doodle world for you 🖌💛🌸💚 [Naser Elziadna](.
- [Flutter Ebook App](https://github.com/JideGuru/FlutterEbookApp) - A simple Flutter app to read and download e-books.
- [pISSStream](https://github.com/Jaennaet/pISSStream) - App that shows how full the International Space Station's urine tank is in real time, available for macOS (menu bar), iOS, watchOS and visionOS.
- [Sandwhich](https://github.com/MotionMobs/Sandwhich) - An app to solve the age-old sandwich debate built using machine learning, Flutter, and TensorFlow Lite.
- [Tachidesk-Sorayomi](https://github.com/Suwayomi/Tachidesk-Sorayomi) - Frontend for [Tachidesk-server](github.com/Suwayomi/Tachidesk-server/), based on Tachiyomi to read manga in desktop.
- [Toughest](https://github.com/MDSADABWASIM/Toughest) - Tricky questions and answer- Offline Interview Q/A.
- [TV Randshow](https://github.com/deandreamatias/tv-randshow) - App to choose a random TV show episode.

## Social Network

- [Deer](https://github.com/aleksanderwozniak/deer) - Minimalist Todo Planner built using BLoC pattern.
- [Fedi](https://github.com/Big-Fig/Fediverse.app) - Open-source client for Pleroma and Mastodon social networks.
- [Flutter Chat App](https://github.com/rohan20/flutter-chat-app) - A one-to-one chat app built on Flutter with firebase authentication and image sharing capability.
- [FlutterGram](https://github.com/mdanics/fluttergram) - Complete Instagram based on Firestore & Google Functions.
- [FlutterWhatsAppClone](https://github.com/iampawan/FlutterWhatsAppClone) - Building a WhatsApp Clone in Flutter.
- [Fwitter](https://github.com/TheAlphamerc/flutter_twitter_clone) - Fully functional Twitter clone built in flutter framework using Firebase realtime database and storage.
- [Harpy](https://github.com/robertodoering/harpy) - A Twitter app built with Flutter [Roberto Doering](.
- [IceCubesApp](https://github.com/Dimillian/IceCubesApp) - A SwiftUI Mastodon client.
- [Meme Chat](https://github.com/efortuna/memechat) - Chat app on Flutter, using Firebase, Google Sign In, and device camera integration by a team of Googlers.
- [Tinder Card](https://github.com/Ivaskuu/tinder_cards) - Tinder like cards swipe effect.

## Shopping

- [Artsy](https://github.com/artsy/eigen) - The mobile app for artsy.net — discover fine art, browse artists and artworks, follow galleries, and bid in auctions from your phone.
- [E-Commerce App](https://github.com/Tarikul711/flutter-ecommerce) - Ecommerce app UI and API integration.
- [Flutter Games](https://github.com/searchy2/FlutterGames) - Flutter app for purchasing and renting games.
- [Flutter WooCommerce app](https://github.com/woosignal/flutter-woocommerce-app) - A ready-made app template for WooCommerce stores.
- [Grocery-App](https://github.com/Widle-Studio/Grocery-App) - Flutter Grocery Shopping App.
- [LaCoro Q-commerce app](https://github.com/LaCoro/ConsumerFlutterApp) - An open source quick commerce app in flutter.
- [Rapidinho](https://github.com/gdgluanda/rapidinho) - Unofficial delivery app for Rapidinho made.

## News and Magazine

- [feed-flow](https://github.com/prof18/feed-flow) - FeedFlow is a minimalistic RSS Reader available on Android, iOS, macOS, Windows and Linux. Built with Kotlin Multiplatform, Jetpack Compose and SwiftUI.
- [HackerNews](https://github.com/amitburst/HackerNews) - A Hacker News reader iOS app written in Swift.
- [Hacki](https://github.com/Livinglist/Hacki) - A Hacker News reader.
- [NewsApp](https://github.com/j-j-gajjar/FLUTTER_NewsApp) - Live News Using API with Many API filterrs.
- [NewsBuzz](https://github.com/theankurkedia/NewsBuzz) - Firebase backed news reader using News API.

## Travel

- [Flight search](https://github.com/MarcinusX/flutter_ui_challenge_flight_search) - Flight search app.
- [ShareACab](https://github.com/devclub-iitd/ShareACab) - Cab Sharing App for college students.

## Lifestyle

- [Beer-Me-Up](https://github.com/benoitletondor/Beer-Me-Up) - Beer tracking nicely designed.
- [Food Ordering App](https://github.com/Tarikul711/flutter-food-delivery-app-ui) - Food delivery App UI designed.

## Personalization

- [Dashboard](https://github.com/Ivaskuu/dashboard) - Dashboard concept made.
- [Tailor made](https://github.com/jogboms/tailor_made) - Managing a Fashion designer's daily routine.
<!-- grove-readme:end -->

## Security

Please report vulnerabilities and sensitive issues using the private process in
[SECURITY.md](SECURITY.md). Do not open a public issue for security reports,
credentials, or takedown requests.

## License

The website code and catalog tooling are available under the
[MIT License](LICENSE). Provenance and licensing notes for the legacy dataset
are included in the license file.
