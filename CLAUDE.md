# Repo notes for Claude Code

## What's here

Two unrelated projects sit side-by-side at the repo root: `AppUsageTracker/` and `aceinsurance/` (legacy). The active work is **MoodApp** under `MoodApp/`, an iOS + watchOS mood-tracking app spec'd in `PRODUCT_SPEC.md` at the root.

## MoodApp layout

```
MoodApp/
  SETUP.md                Manual Xcode-project setup instructions
  Shared/                 Code in every target (iOS, watchOS, widget)
    Models/               SwiftData @Models + supporting enums
    Persistence/          MoodDataStore — the ModelContainer factory
    Health/               HealthKitManager + HKStateOfMind mapping (iOS 18+)
    Services/MoodLogger   The single write path used by both check-in flows
    Weather/              WeatherKit + CoreLocation provider (iOS only in practice)
    Insights/             On-device InsightEngine — pure stats, no Core ML yet
    Notifications/        Rolling-window scheduler + EventKit busy checker
    UI/                   FlowLayout + Color extensions
    Assets.xcassets/      Valence color ramp + AppIcon slot
  iOS/                    iPhone app: App entry, RootView, CheckIn, Dashboard, Onboarding, Settings
  watchOS/                Watch app: Crown-driven check-in flow
  Widget/                 WidgetKit extension (Lock Screen + Home Screen)

MoodAppTests/             XCTest tests for the pure-logic types
project.yml               XcodeGen spec — generates the .xcodeproj
```

## How to run it

There is no committed `.xcodeproj`. Two options on a Mac:

1. `brew install xcodegen && xcodegen generate` from the repo root — uses `project.yml`.
2. Manual setup — follow `MoodApp/SETUP.md`.

Then open `MoodApp.xcodeproj` and run the `MoodApp` scheme. Tests live under the `MoodAppTests` target.

## Conventions in this codebase

- **SwiftUI only.** No UIKit views (only `UIApplication.openSettingsURLString` for the system Settings deep link in `SettingsView`). No third-party libraries.
- **SF Symbols only** for iconography. Color comes from the `Valence` ramp in `Assets.xcassets`.
- **iOS 17 / watchOS 10 floor.** Anything iOS 18-only (`HKStateOfMind` read/write, Apple Intelligence) is gated with `if #available` and the app gracefully degrades.
- **HealthKit is the canonical store** for the mood itself; SwiftData holds richer context (HRV, sleep, weather, etc.) plus a `healthKitSampleID` back-reference for sync/delete.
- **One App Group** (`group.com.moodapp.shared`) — iPhone, Watch and widget all read/write the same SwiftData store, so Watch logs surface on the phone with no backend.
- **@Observable + @MainActor** for service classes (`HealthKitManager`, `WeatherProvider`, `CheckInModel`). No `ObservableObject`.
- **Comments only when WHY isn't obvious** — most files have none.

## Adding things — quick maps

- **New feeling word:** add a case to `Feeling`, fill in `displayName`, `symbolName`, `associatedValence`, `availableOnWatch`, then (if iOS 18+ mapping makes sense) the corresponding `HKStateOfMind.Label` in `HealthKitStateOfMindMapping.swift`.
- **New factor:** mirror the above in `MoodFactor`.
- **New insight type:** add a case to `InsightCategory` and a candidate-builder in `InsightEngine`.
- **New widget family:** add to `.supportedFamilies` in `MoodCheckInWidget` and a case in `MoodWidgetEntryView`.
- **Tests:** add to `MoodAppTests/`. The pure-logic types (`Valence`, `Feeling`, `TimeOfDayBucket`, `InsightEngine`, `NotificationPreferences`) are already covered.

## Known gaps from the MVP spec

- **Apple Intelligence weekly summary** is a V2 spec item, not built.
- **Core ML model** is not yet bundled — `InsightEngine` does the equivalent statistically. The structure is set up so a Core ML model can replace it without changing callers.
- **Onboarding flow** ships 4 screens but doesn't gate notification/Health permissions hard (user can swipe past).
- **`SettingsView` "Delete all"** removes our HealthKit samples on iOS 18+ but cannot revoke the user's Health read grants — that's only doable in the Health app.

## Branch + git

Work goes on `claude/keen-einstein-ENImK`. Push with `-u origin <branch>`. Do not open a PR unless explicitly asked.
