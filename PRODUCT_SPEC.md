# MoodApp — Product Specification v0.1

A native iOS + watchOS app in the emotional wellness / mood-tracking category. Differentiates from Apple State of Mind and How We Feel via sub-5-second Watch-native check-ins, on-device pattern detection, and HealthKit-context-aware insights.

---

## 1. Competitor Teardown

### 1.1 Apple "State of Mind" (iOS 17 / watchOS 10)

**Core UX flow (Momentary Emotion, iPhone):**
1. Open Health app → tap **Browse** → **Mental Wellbeing** → **State of Mind** → **Log**.
2. Choose **How you feel right now** or **How you've felt overall today**.
3. Drag a 3D shape on a continuous slider: **Very Unpleasant → Very Pleasant** (7 stops).
4. Pick 1–3 feeling words from a 27-word list (Happy, Calm, Anxious, Indifferent, Tense, etc.).
5. Pick 1–3 contexts from ~18 factors (Family, Work, Health, Money, Weather, Self-Care, etc.).
6. Optional free-text note.
7. Tap **Done** — written to HealthKit `HKStateOfMind`.

**Apple Watch flow:** Mindfulness app → State of Mind → identical 5-screen sequence, Digital Crown drives the slider. No glance/complication shortcut.

**Feature inventory:**
- Momentary + Daily Mood logging (two scopes).
- 7-stop continuous valence slider.
- 27 feeling words, 18 context factors.
- Charts: mood over time, associations with feelings/factors, "Life Factors" overlay (exercise, sleep, mindful minutes).
- HealthKit native (read/write `HKStateOfMind`); end-to-end encrypted iCloud sync.
- Siri / App Intents / Shortcuts integration.
- Lock Screen widget (entry shortcut only).
- Watch Mindfulness app entry.
- Integrations with Time in Daylight, Cycle Tracking, Audiogram.

**Friction points:**
- Logging buried 4 taps deep inside Health (Browse → Mental Wellbeing → State of Mind → Log).
- 5-screen sequential flow per check-in — kills frequency.
- Vocabulary feels clinical ("Indifferent", "Tense", "Drained") — reads like a hospital intake.
- Insights are static charts; no narrative, no actionable patterns surfaced.
- No reminders by default; user has to remember.
- Watch flow is a port of the iPhone flow, not designed for crown-and-go.
- No coping loop, no follow-through.
- Widget is a launcher, not a 1-tap logger.

**Monetization:** Free, bundled with iOS / watchOS. Not a revenue product — used to feed Health.

**Privacy:** Best-in-class. All data in HealthKit; on-device by default; iCloud sync is E2E-encrypted; Apple cannot read. No advertising.

**Apple Watch integration:** Yes, first-party Mindfulness app on watchOS 10. Heart-rate context auto-attached at log time. No complication. No haptic-only flow.

---

### 1.2 How We Feel (App Store ID 1562706384)

Built by The How We Feel Project, a 501(c)(3) co-founded by Yale's Marc Brackett (RULER framework) and Ben Silbermann (Pinterest founder). Free, nonprofit, no ads, no IAP.

**Core UX flow (iPhone):**
1. Tap a scheduled notification (or open the app).
2. **Mood Meter** appears — a 2D grid: x-axis **Pleasantness** (unpleasant → pleasant), y-axis **Energy** (low → high). Four colored quadrants: Red (high energy / unpleasant), Yellow (high energy / pleasant), Blue (low energy / unpleasant), Green (low energy / pleasant).
3. Tap a cell on the grid.
4. Pick one granular emotion word from ~25 in that quadrant (drawn from a ~100-word vocabulary).
5. Optional add: people you're with, themes (work, exercise, food…), location, photo, note.
6. App optionally suggests a strategy (breathing, gratitude, reframe, movement) matched to the emotion.
7. Save.

**Feature inventory:**
- 2D Mood Meter (Yale RULER framework).
- ~100-word granular emotion vocabulary.
- Themes, people, place tags.
- Photo attachment per entry.
- Suggested regulation strategies (rule-based).
- Configurable notifications, streak counter, weekly recap.
- Charts: mood by time of day, by theme, by people.
- Writes to HealthKit `HKStateOfMind`.
- "Communities" — private invite groups (used by schools / companies / families).
- Curated emotional literacy lessons (RULER curriculum).

**Friction points:**
- The 2D Mood Meter is conceptually heavy — onboarding burden.
- 100+ emotion words is paralyzing; users default to the same 3.
- Notifications are time-based and frequently arrive mid-meeting.
- **No native Apple Watch app** (notifications relay only).
- Group features feel institutional, not consumer.
- Insights are descriptive, not prescriptive.
- Strategy suggestions are static lookups, not personalized.

**Monetization:** Free. Nonprofit. Funded by foundation grants and donations. No subscription. No ads.

**Privacy:** Strong. Data stored locally and in their cloud; optional anonymized donation for research. No selling. Not E2E-encrypted as of public docs.

**Apple Watch integration:** None native. No Watch app, no complication, no Watch-side logging.

---

## 2. Gap Analysis

Ranked by user impact (1 = highest).

| # | Gap (neither app does this well) | Why it matters |
|---|---|---|
| 1 | Sub-5-second check-in. Both require ≥4 taps + multiple screens. | Daily-frequency users abandon when friction > 5s; this is the single biggest churn lever. |
| 2 | Watch-native logging. SOM is a port of iPhone UX; HWF has no Watch app. | Mood happens in moments; the Watch is the only device on your body at those moments. |
| 3 | HealthKit-context-aware mood. Neither auto-correlates HRV, sleep, exercise, cycle into the mood signal. | The "why" of a mood is biological as often as situational. |
| 4 | Personalized, prescriptive insights. Both show charts; neither says "Sundays after <6h sleep → anxious 70% of the time." | Pattern recognition is the retention payoff. |
| 5 | Context-aware notifications. Both nudge on a fixed schedule; neither suppresses during meetings, driving, or right after a recent log. | Bad-timed notifications train users to mute them. |
| 6 | Closed-loop coping. Log → suggest action → "did it help?" Neither asks the third step. | Without the loop, the app is a data sink, not a tool. |
| 7 | Haptic-only / glanceable logging for private moments (in a meeting, at dinner). | A visible screen tap is a social cost; haptics aren't. |
| 8 | Mood-aware Watch complication. Neither has one. | The complication is the cheapest possible habit cue. |
| 9 | Surfacing your own past at the right moment ("365 days ago you felt similar; here's what helped"). | Builds long-term retention via continuity, not gamification. |
| 10 | On-device AI. Neither uses Core ML for personalized pattern detection. | Privacy + battery + offline + no backend cost — strictly better than cloud inference for this domain. |

---

## 3. Differentiated Feature Set

Features below are present in **neither** competitor. Tagged by release.

### MVP (v1.0)
- **5-second Watch check-in.** Raise wrist → complication or app launch → Digital Crown sets valence on a 5-stop scale → haptic confirms → done. Optional follow-up word picker after the haptic, dismissible.
- **2-tap iPhone check-in.** Lock Screen + Home widget opens directly into the mood picker (not the app's home). Tap valence, tap one word, autosaves.
- **Auto-context capture.** Every entry silently attaches: HRV (latest), last night's sleep duration, today's step count, time-of-day bucket, day-of-week, weather (via WeatherKit). Zero user input.
- **One weekly Core ML insight.** After 14 days of data, a single sentence per week: e.g., *"Your mood drops on Mondays — 70% lower valence after fewer than 6h of sleep."* All inference on-device.
- **Smart notification suppression.** Default 2 nudges/day, but skipped if Focus is on, calendar shows an event, motion sensors indicate driving/workout, or a log exists in the last 3 hours.

### V2
- **Mood-aware Watch complication.** Glance shows time-since-last-log; tap launches direct into Crown picker.
- **Closed-loop coping micro-interventions.** After an "unpleasant" log, offer one 60-second action (box breathing, walk reminder, gratitude prompt). Day later, ask "did it help?" Train a personalized recommender on-device.
- **Voice + photo attach.** Speak a note (on-device Speech framework); attach a photo for visual journaling. Both stored locally.
- **Time-reflection surfacing.** "30/90/365 days ago at this valence" — opportunistic, not nagging.
- **Apple Intelligence weekly summary** (iOS 18+): natural-language week recap, generated on-device via Foundation Models framework.

### V3
- **Private shared mood with one trusted contact.** Opt-in only, iMessage-extension based (no backend). Send a single emoji-glyph mood; reply with a heart/text.
- **Watch-led 60-second wind-down rituals**, selected by current mood context.
- **Therapist export.** One-tap PDF with charts, top patterns, and a date range — gated to Pro.
- **Live Activity for difficult moments.** Pinned breathing/grounding timer on the Lock Screen + Dynamic Island.
- **Predictive nudge.** Core ML predicts likely low-valence windows and offers a 1-minute reset before they hit.

---

## 4. Target Users

### Primary — "Self-Aware Sam," 28–38, knowledge worker
- **Profile.** Already wears an Apple Watch. Tracks sleep and workouts in Health. Manages mild background anxiety. Has tried Headspace / Calm and bounced off because guided meditations feel like homework. Not in therapy.
- **Motivation.** Wants emotional self-awareness as a quantified-self extension of the data they already collect. Believes patterns exist; wants tools to find them without a journal habit.
- **Retention trigger.** The weekly Core ML insight that ties their own HealthKit data to their own moods — *"Your mood drops 30% on days with under 6h of sleep"* — read once, never forgotten. Reinforced by zero-friction Watch logging via the complication.

### Secondary — "Recovery Riley," 22–30, therapy-adjacent
- **Profile.** In or recently in therapy. Clinician asked them to "track mood between sessions." Tried How We Feel and a paper journal; both failed at the 2-week mark.
- **Motivation.** Wants something that doesn't feel like homework. Needs to bring data to sessions.
- **Retention trigger.** Coping micro-interventions (V2) that actually help on bad days. Therapist-export PDF (V3) that turns the app into session prep. Short, judgement-free check-ins.

---

## 5. Monetization

### Tiers

**Free**
- Unlimited iPhone and Watch check-ins.
- Last 30 days of history.
- HealthKit auto-context.
- 1 Core ML insight per month.
- Single fixed notification schedule.

**Plus — $4.99/month or $39.99/year** (annual effective $3.33/mo)
- Unlimited history.
- Weekly Core ML insights, unlimited.
- Smart notification suppression.
- Closed-loop coping interventions (V2).
- Watch complication (V2).
- Photo + voice attach (V2).
- Apple Intelligence weekly summaries.

**Pro — $9.99/month or $79.99/year** (V3)
- Everything in Plus, plus:
- Therapist-export PDF.
- Shared mood with one contact.
- Predictive nudges.
- Live Activities.

### ARPU path to $10M ARR in Year 2

| Lever | Assumption |
|---|---|
| Blended ARPU | ~$40/yr (mostly annual Plus at $40, some monthly churners ~$60/yr equivalent, Pro mix at $80) |
| Paying users needed | $10M / $40 = **250,000** |
| Free → paid conversion | 6% (industry midpoint for utility-wellness; HWF doesn't monetize so no comp, Calm is ~3%, Strava ~5%, Day One ~8%) |
| Registered users needed | 250k / 0.06 = **~4.2M** |
| Org/install funnel @ 40% activation | ~10.5M App Store installs over 24 months |

**Realism check.** 10.5M installs in 24 months requires either (a) an App Store feature + 1 viral moment (TikTok-driven), or (b) a partnership channel (Apple Health editorial, employer wellness). Conservative fallback path: 1.5M users at 8% conversion + 25% of subs upgrading to Pro lifts blended ARPU to ~$50 and clears $10M with 200k paying. Both paths are within precedent.

**Gating philosophy.** Free is genuinely useful — daily logging never paywalled. Paywall is on **history depth + insight frequency + V2 advanced features**, not on the core habit loop. This preserves the App Store reviews and word-of-mouth that drive the install funnel.

---

## 6. Tech Stack

**Recommendation: native SwiftUI** for iOS app, watchOS app, and the shared layer.

### Comparison

| Concern | SwiftUI | React Native | Flutter |
|---|---|---|---|
| Apple Watch first-class app | Native | No real story | None |
| HealthKit (read + write `HKStateOfMind`) | Native API | Bridge, often stale | Plugin, incomplete |
| Core ML on-device inference | Native | Bridge | Plugin |
| WidgetKit (Home + Lock Screen) | Native | No | No |
| Live Activities (V3) | Native ActivityKit | No | No |
| Apple Intelligence / Foundation Models | Native (iOS 18+) | No | No |
| SF Symbols + HIG compliance | Native | Asset copies | Asset copies |
| Binary size, Watch battery | Smallest | JS runtime overhead | Engine overhead |
| Local-first storage (SwiftData) | Native | Manual | Manual |
| Dynamic Type + VoiceOver | Free | Manual | Manual |

### Verdict

React Native and Flutter are non-starters. Three of our hard requirements — Apple Watch native app, HealthKit, and Core ML — are Swift-first and degrade badly across bridges. WidgetKit, Live Activities, and Apple Intelligence (all on the V2/V3 roadmap) are Swift-only. There is no cross-platform Android plan in the foreseeable future for this product.

### Architecture sketch

- **Language / UI.** Swift 5.10+, SwiftUI on both iOS 17+ and watchOS 10+.
- **Persistence.** SwiftData (iOS 17 baseline makes it viable). Shared App Group container between iPhone, Watch, and widgets.
- **Source of truth.** HealthKit (`HKStateOfMind`) is the canonical store for mood entries; SwiftData holds derived/cached views, insights, and UI state.
- **Watch ↔ iPhone sync.** WatchConnectivity for live transfer; HealthKit + iCloud as the eventually-consistent fallback.
- **On-device AI.** Core ML model bundled in the app at launch; trained off-device on synthetic + (post-MVP) opt-in anonymized user contributions. iOS 18+ Foundation Models framework for V2 summaries.
- **Widgets.** WidgetKit, sharing the App Group container.
- **Backend.** None at MVP. CloudKit private database considered for V3 cross-device insight cache sync.

---

## 7. MVP Scope (v1.0)

### Ships

- iOS 17+ iPhone app, watchOS 10+ Watch app, shared App Group + SwiftData store.
- HealthKit permissions and integration: read HRV, sleep duration, step count, workouts; read + write `HKStateOfMind`.
- **iPhone check-in flow.** Open from widget or app icon → valence picker (5-stop, single tap) → optional one-word feeling (12 curated words) → optional one factor → optional note → save. ≤2 taps to a saved entry on the fast path.
- **Watch check-in flow.** Open from app or (post-launch) tap a Smart Stack widget → Digital Crown drives 5-stop valence → haptic confirms → optional word picker (8 words) on a follow-up screen, dismissible. No keyboard.
- Lock Screen + Home Screen widget — single tile, "Tap to check in," deep-links into the iPhone picker.
- Dashboard: 7-day and 30-day valence chart (Swift Charts), recent-entries list, single weekly insight tile.
- **Notification scheduling.** Default 2 daily prompts (morning + evening). Suppressed if Focus on, an in-progress calendar event exists, motion indicates driving/workout, or a log exists in the last 3 hours.
- **Core ML insight engine.** One model, on-device, surfaces one insight per week after the user has 14+ logs. Insight is a single declarative sentence.
- **Onboarding.** Four screens: welcome → HealthKit permission → notification permission → first check-in CTA.
- **Settings.** Notification times, HealthKit toggles, "Delete all my data" (wipes SwiftData + revokes HealthKit writes by author).
- Dark mode, Dynamic Type, full VoiceOver labels.
- App icon, 5-color valence ramp defined as named colors in `Assets.xcassets`.

### Does NOT ship in v1.0

- Watch complication.
- Closed-loop coping interventions.
- Photo / voice attach.
- Apple Intelligence summaries.
- Predictive nudges.
- Shared mood / iMessage extension.
- Therapist PDF export.
- Live Activities.
- Account system (there is no account — local-first, HealthKit-backed).
- Onboarding tutorials beyond the four screens above.
- Curated emotional-literacy content.
- Any backend service.

### Constraints (restated, binding)

- iOS 17+, watchOS 10+.
- HealthKit required (read + write `HKStateOfMind`).
- Core ML on-device only — no remote inference.
- No backend at MVP.
- Apple HIG strictly; SF Symbols only; no third-party UI libraries; SwiftUI built-in animations only.
