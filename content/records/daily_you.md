# Daily You

Daily You is a Flutter-built, offline-first daily journal that keeps every
entry on-device — no accounts, no ads, no telemetry. Its tagline,
"Every day is worth remembering," frames the app as a private space for
capturing thoughts, rating mood, attaching photos, and writing Markdown
notes that you fully own. A backup-and-restore flow plus an "Import
From Another App" path make it a credible migration target for users
leaving hosted journal services.

## Why it matters

- **Local-first by design.** Entries, tags, templates, and photo blobs
  live in a SQLite database on the device (with optional external
  storage), so the journal works without a network and stays
  exportable as plain JSON or SQLite.
- **Cross-platform parity.** A single Flutter codebase targets Android,
  iOS, Linux, macOS, Windows, and Snap, so a desktop and a phone share
  the same entries through the standard backup-restore flow.
- **Mood and flashbacks.** Each entry carries an optional mood score,
  and a `flashback_manager` resurfaces "on this day" entries from
  prior years — a private TimeHop whose tone you can tune by
  excluding low-mood days.
- **F-Droid friendly.** The repo ships a Nix flake, an
  `AppImageBuilder` config, reproducible Android builds, and no
  proprietary dependencies, so it ships on F-Droid, IzzyOnDroid, and
  GitHub Releases without modification.

## How it works

The app is structured around a thin DAO layer over `sqflite`: each
domain entity (entries, tags, tag categories, images, templates) has
its own DAO under `lib/database/`, and `lib/database/app_database.dart`
wires migrations. A `provider`-based state tree (`config_provider`,
`theme_mode_provider`, plus per-page state) feeds a Material 3 UI with
pages for the home timeline, an `entries_list_page`, an
`entry_timeline_page`, an `edit_entry_page`, a `statistics_page` powered
by `fl_chart`, and a `settings_page` that hosts backup, restore,
import, theme, notification, and calendar options.

The standout piece is `lib/flashback_manager.dart`: given the current
locale and calendar (Gregorian or Jalali, via the `shamsi_date`
dependency), it walks reversed entries and groups past entries by day,
week, month, and year, producing a surfaced "memories" feed on the
home page. Mood and tag filters can suppress entries, so the flashback
stream stays as positive as you want it to be. Notifications come from
`flutter_local_notifications` plus `android_alarm_manager_plus` for
firing random daily reminder nudges, and `local_auth` gates the app
behind biometrics where supported.

## Caveats

- **No cloud sync.** Daily You does not ship its own sync server; you
  move data between devices manually via backup files, WebDAV, or
  shared external storage. If you want effortless multi-device
  journaling, look elsewhere.
- **Single user.** There is no concept of multiple journals or
  accounts in the data model — one install, one author.
- **GPL-3.0.** The license is fine for personal use and community
  forks, but commercial derivative apps must publish their changes.
- **Jalali support is opt-in.** Persian-calendar users get full date
  handling, but if you switch back to Gregorian later, flashback
  grouping can show inconsistent windows until enough entries accrue.

## Deployment notes

For end users, the simplest path is installing from F-Droid or
IzzyOnDroid on Android; iOS, macOS, Windows, and Linux builds live on
the GitHub Releases page.

To build from source:

```bash
git clone https://github.com/Demizo/Daily_You.git
cd Daily_You
nix develop          # or: install Flutter (>=3.0) and run `flutter pub get`
flutter run
```

**Minimum:** Any device that runs Flutter 3.0+. Expect ~50–100 MB of
local storage for a year of mixed text-and-photo entries; SQLite
keeps lookup fast well past 10,000 entries.

**Integration tip:** as a directory entry, Daily You pairs naturally
with any privacy- or self-hosting-tagged record. If you already list
`immich` or `joplin`, position Daily You as the "private diary"
counterpart — same GPL-3.0 / no-account philosophy, but for the
short-form reflections that don't belong in a note-taking app.
