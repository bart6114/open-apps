# The OldOS Project

The OldOS Project is a single Xcode/SwiftUI application that recreates a fully
functional version of iOS 4 — Springboard, Lock Screen, and a working set of
first-party apps — on a modern iPhone. It is built almost entirely in SwiftUI
and ships as an unsigned IPA plus an Xcode project you can build yourself.

## Why it matters

OldOS is a deliberate, pixel-perfect exercise in iOS skeuomorphism: the
glossy icons, the linen wallpaper, the leather Notes app, the brushed-metal
Settings chrome, and the green felt Game Center leaderboards are all rebuilt
in SwiftUI. For a decade-plus the dominant mobile design language has been
flat — depth through translucency, not texture. OldOS is the most thorough
public counter-example of that trajectory and shows what skeuomorphism looks
like when you rebuild it on top of a modern declarative UI framework rather
than UIKit.

The project is also a nostalgia piece. Built by Zane ("zzanehip") in the
months before college as a learning project, it lets anyone with a current
iPhone relaunch the home screen they had in 2010 — Pinwheel wallpaper,
"slide to unlock," the original iPod app — without owning legacy hardware.
At ~3.5k stars and 200+ forks, it is also one of the most-starred entries on
the canonical open-source-iOS-apps list, so the swerve it makes (visual
realism over modern UX) reaches a wide audience.

## How it works

The codebase is a single iOS Xcode project (`OldOS/OldOS.xcodeproj`) with one
Swift file per recreated iOS app: `HomeScreen.swift`, `LockScreen.swift`,
`Phone.swift`, `Messages.swift`, `Notes.swift`, `Safari.swift`, `Maps.swift`,
`Weather.swift`, `iPod.swift`, `iTunes.swift`, `Calendar.swift`, `Contacts.swift`,
`Camera.swift`, `Photos.swift`, `Settings.swift`, `Stocks.swift`, `Youtube.swift`,
`Compass.swift`, `Voice Memos.swift`, `Mail.swift`, and `GameCenter.swift`,
plus shared helpers in `Common.swift` and `AppStore.swift`. Apps talk to
real phone subsystems: the iPod app plays from the music library, Maps reads
location, Weather pulls live conditions, and Safari hits the real web.

Skeuomorphic textures come from `Assets.xcassets`, organised by app so each
recreated app keeps its own leather, wood, linen, and brushed-metal assets
beside its SwiftUI code. Subdirectories hold richer UI fragments:
`Page Curl` for the transition between apps, `Carousel` for the home-screen
scrolling, `PhotoCropper` and `TextView` for the Notes/Mail flows, `Tones` for
the system sounds, and `Fonts` for the Helvetica-era typefaces. Icon design
mirrors the original iOS icon grid — flat-color shapes with glossy specular
overlays — and the wallpapers ship as Core Data entities (`WallpaperModel.xcdatamodeld`)
so users can pick and persist backgrounds.

## Caveats

OldOS is a nostalgia / reference project, not a daily-driver utility app.
Its goal is visual and behavioural fidelity to iOS 4, so it deliberately
sacrifices accessibility, dynamic type, dark mode, and the modern iOS
gesture model in service of that fidelity. The release cadence is also
slow: the headline 2.0 release was framed as "bring the project back from
the dead," and monthly commit activity has been near-zero through summer
2026, so plan on maintaining any fork yourself.

## Deployment notes

```bash
git clone https://github.com/zzanehip/The-OldOS-Project.git
cd The-OldOS-Project
open OldOS/OldOS.xcodeproj
```

Build the `OldOS` scheme in Xcode against the latest SDK (the 2.0 release
targets iOS 16+ and supports modern iPhones including the iPhone X family).
The repo also publishes a signed IPA via the `OldOS.ipa` release asset for
sideloading through AltStore. The license is Creative Commons Attribution 4.0.

**Integration tip:** treat OldOS as a SwiftUI reference for skeuomorphic
patterns — `Common.swift`, `Page Curl`, and the per-app asset catalogues are
the parts worth lifting if you want to add a single textured surface to an
otherwise modern SwiftUI app.
