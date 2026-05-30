# MoodApp — Xcode Setup

The source tree under `MoodApp/` is complete, but the `.xcodeproj` has to be created on a Mac. This is the step-by-step.

Prerequisites: macOS with Xcode 16+, an Apple Developer account (for HealthKit and WeatherKit), a physical iPhone for HealthKit/WeatherKit testing (the simulator gives you the UI but not real Health data).

---

## 1. Create the project

1. Xcode → **File → New → Project → iOS → App**.
2. Product name: `MoodApp`. Interface: **SwiftUI**. Language: **Swift**. Storage: **None** (we configure SwiftData ourselves).
3. Save the project at the repo root. The resulting `MoodApp.xcodeproj` should sit next to `MoodApp/` (the source folder we generated).
4. In **Project → MoodApp → General**: deployment target **iOS 17.0**.
5. **Delete** the auto-generated `ContentView.swift` and `MoodAppApp.swift` (we have our own).

## 2. Add the three targets

You'll have one iOS app target by default. Add two more:

- **File → New → Target → watchOS → App**. Name `MoodAppWatch`. Companion App: `MoodApp`. Deployment target **watchOS 10.0**. Single-target (not WatchKit Extension).
- **File → New → Target → iOS → Widget Extension**. Name `MoodWidget`. Uncheck "Include Configuration App Intent" (we use a static configuration). Uncheck Live Activity.

Final target list: `MoodApp` (iOS), `MoodAppWatch Watch App`, `MoodWidget`.

## 3. Add the source files to targets

In the Project navigator, drag the existing folders in — **un-check** "Copy items if needed" (they're already on disk) and select the correct target memberships:

| Folder | iOS app | Watch app | Widget |
|---|---|---|---|
| `MoodApp/Shared/Models/**` | ✅ | ✅ | ✅ |
| `MoodApp/Shared/Persistence/**` | ✅ | ✅ | ✅ |
| `MoodApp/Shared/Health/**` | ✅ | ✅ | — |
| `MoodApp/Shared/Services/MoodLogger.swift` | ✅ | ✅ | — |
| `MoodApp/Shared/Weather/**` | ✅ | — | — |
| `MoodApp/Shared/Insights/**` | ✅ | — | — |
| `MoodApp/Shared/Notifications/**` | ✅ | — | — |
| `MoodApp/Shared/UI/**` | ✅ | ✅ | ✅ |
| `MoodApp/Shared/Assets.xcassets` | ✅ | ✅ | ✅ |
| `MoodApp/iOS/**` | ✅ | — | — |
| `MoodApp/watchOS/**` | — | ✅ | — |
| `MoodApp/Widget/**` | — | — | ✅ |

After adding, delete the placeholder `MoodWidget.swift` and `MoodWidgetBundle.swift` Xcode created in the Widget target — ours replace them.

## 4. Capabilities

In each target's **Signing & Capabilities** tab, add:

| Capability | iOS app | Watch app | Widget |
|---|---|---|---|
| **App Groups** — `group.com.moodapp.shared` (must match `MoodDataStore.appGroupIdentifier`) | ✅ | ✅ | ✅ |
| **HealthKit** | ✅ | ✅ | — |
| **WeatherKit** | ✅ | — | — |
| **Background Modes** — Background fetch (optional, helps the scheduler re-plan) | ✅ | — | — |

WeatherKit also requires enabling the **WeatherKit** service on your App ID at developer.apple.com → Identifiers.

## 5. Info.plist keys

In each target's Info pane (or Info.plist):

**iOS app:**
- `NSHealthShareUsageDescription` — "Mood uses Health to add context (HRV, sleep, steps) to your check-ins."
- `NSHealthUpdateUsageDescription` — "Mood saves your check-ins to Apple Health as State of Mind."
- `NSCalendarsFullAccessUsageDescription` — "Mood checks your calendar so it doesn't remind you during meetings."
- `NSLocationWhenInUseUsageDescription` — "Mood uses your location to attach the local weather to a check-in."
- **URL Types** → add a scheme: `moodapp` (this is what the widget tap opens).

**Watch app:**
- `NSHealthShareUsageDescription` — same string as iOS.
- `NSHealthUpdateUsageDescription` — same string as iOS.

**Widget:** no usage strings needed.

## 6. App Icon

The asset catalog ships with an empty 1024×1024 `AppIcon` slot. Drop a `AppIcon-1024.png` in via Xcode's asset editor and Xcode generates the rest. The Watch target needs its own icon set in its asset catalog.

## 7. Build & run

1. Select the **MoodApp** scheme and an iOS 17+ device. First launch will prompt for Health, Notifications, and (on first check-in) Location.
2. Tap **+** on the dashboard → make a check-in. It should appear in Apple Health → Browse → State of Mind on iOS 18+, or only in the app on iOS 17.
3. Select the **MoodAppWatch** scheme on a paired Watch. The crown should haptic-tick through the 5 valence stops.
4. Add the widget from the Home Screen / Lock Screen — tapping it should open the iPhone app directly into the check-in sheet.

## 8. Things to verify by hand

The Swift was written but never compiled here. On first build expect to fix a handful of issues; the most likely places:

- `HealthKitStateOfMindMapping.swift` — the `HKStateOfMind.Label` / `.Association` enum names are written against the iOS 18 SDK. Any case that's renamed (Apple has tweaked a few) is a one-line fix.
- The Watch target may need `MoodLogger` and `HealthKitManager` flagged with `@available(watchOS 11.0, *)` blocks if your deployment target is below 11 — currently anything iOS 18 / watchOS 11 only is already gated with `if #available`.
- Asset color components are sRGB floats; if you want the colors tweaked, edit them directly in Xcode's color editor and they'll round-trip into the `Contents.json` files.

## 9. What's still missing from the spec MVP

- Onboarding screens (welcome → Health → Notifications → first check-in) — currently the app cold-starts straight to the dashboard and prompts permissions in place.
- The "delete all" path in Settings deletes our own State of Mind samples on iOS 18+, but doesn't yet revoke HealthKit *read* access (which has to be done by the user in the Health app).
- No unit tests yet.

None of these are blockers for getting the app running.
