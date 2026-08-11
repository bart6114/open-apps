# Monekin

Monekin is an open-source, offline-first personal finance manager
written in Flutter from a single Dart codebase and currently shipping
to Android (Google Play) and Windows (GitHub releases / Microsoft
Store). The app targets the long tail of users who want unlimited
accounts, transactions, budgets, goals, investments, and debts
without ever handing their ledger to a third party — every byte
lives in a local SQLite database, and the app works without an
internet connection.

## Why it matters

- **Truly local-first.** No accounts, no cloud sync, no telemetry.
  Storage is a single SQLite file managed through [Drift](https://github.com/simolus3/drift)
  (formerly Moor), an open-source reactive ORM, with the schema split
  across `lib/core/database/sql/`. Local backups can be exported to
  a file and restored on another device, but nothing is uploaded
  anywhere by default.
- **Real feature surface, not a sample.** Monekin ships multi-account
  bookkeeping, recurring-transaction automation (bills and
  subscriptions), budgets with category icons, savings goals, net-worth
  tracking, investment and debt ledgers, customizable exchange rates
  across 50+ currencies, CSV import/export, and an `fl_chart`-powered
  statistics screen with pie, bar, and time-series visualizations.
- **Material You on every release.** Theming is driven by the
  `dynamic_color` package, so Android 12+ users get a palette derived
  from their wallpaper; an AMOLED dark mode and an accent picker
  cover the rest. The layout collapses to an `AppNavigationSidebar`
  on tablet and desktop, while staying phone-first on handsets.
- **Mature, not abandoned.** First released on Google Play in October
  2021 (originally Ionic + Angular), the codebase was migrated to
  Flutter in 2023, has accumulated over 1,000 commits, and is at
  release `9.2.1+920001` with active PRs and a translated UI.

## How it works

The codebase follows a clean three-tier split under `lib/`:

- **`lib/app/`** is feature-organised by domain (`accounts`,
  `transactions`, `budgets`, `categories`, `currencies`, `debts`,
  `goals`, `home`, `settings`, `stats`, `tags`, `onboarding`, etc.),
  with each feature folder holding its own pages and widgets (e.g.
  `home/dashboard.page.dart`, `transactions/widgets/...`).
- **`lib/core/`** is the framework-independent layer: `database/`
  wraps Drift, `models/` defines the typed records, `services/`
  exposes `UserSettingService`, `AppDataService`, and
  `PrivateModeService` as `.instance` singletons, `routes/` owns
  navigation, and `presentation/` collects shared animations,
  responsive helpers, themes, and reusable widgets.

State management is deliberately lightweight: two global maps
(`appStateSettings`, `appStateData`) hold user preferences and app
flags, an `appStateKey` `GlobalKey` exposes `refreshAppState()` so
any widget can trigger a root rebuild, and the root reads from
those maps inside `build()`. Internationalization runs through
`slang` (English and more), charting through `fl_chart`, and the
desktop window frame through `bitsdojo_window` on Windows.

## Caveats

- **AGPL-3.0 license.** Acceptable for personal use and contribution
  back upstream; commercial forks must publish their modifications.
- **Limited platform reach today.** Android and Windows are
  shipping; iOS, macOS, Linux, and the Web are not yet first-class
  targets despite the Flutter codebase making them technically
  reachable.
- **In-app purchase dependency.** `in_app_purchase` is bundled in
  `pubspec.yaml`, so any distribution that compiles from source
  needs to configure billing or strip the plugin — the README still
  markets the app as "free, forever".
- **Backup portability.** Backups are local files; there is no
  built-in cross-device sync, so migrating between phones requires
  a manual export/import cycle.

## Deployment notes

```bash
git clone https://github.com/enrique-lozano/Monekin.git
cd Monekin
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run -d android    # or: flutter run -d windows
```

**Minimum:** Flutter 3.44.1, Dart `>=3.10.1 <4.0.0`, and a recent
Android SDK or Windows 10+ for the desktop target. Drift's
code-generation step (`build_runner`) must run after a fresh clone
and after any schema change in `lib/core/database/`.

**Integration tip:** if you curate an Astro/Grove directory like
this one, Monekin is a clean reference for any record tagged
`offline-first` or `money-manager` — its Drift schema split,
feature-organised `lib/app/` layout, and singleton-service state
model are easy to lift into a similar Flutter project.
