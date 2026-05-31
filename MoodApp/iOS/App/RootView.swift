import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(HealthKitManager.self) private var healthKit
    @Query(sort: \MoodEntry.timestamp, order: .reverse) private var entries: [MoodEntry]

    @AppStorage("notif.enabled") private var notifEnabled = true
    @AppStorage("notif.morning") private var morningMinutes = 9 * 60
    @AppStorage("notif.evening") private var eveningMinutes = 20 * 60
    @AppStorage("notif.skipEvents") private var skipEvents = false
    @AppStorage("hasOnboarded") private var hasOnboarded = false

    @State private var isCheckingIn = false
    @State private var showSettings = false
    @State private var pendingCopingEntry: MoodEntry?
    @State private var showCoping = false

    var body: some View {
        NavigationStack {
            DashboardView(onCheckIn: { isCheckingIn = true })
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showSettings = true } label: {
                            Image(systemName: "gearshape")
                        }
                        .accessibilityLabel("Settings")
                    }
                }
        }
        .sheet(isPresented: $isCheckingIn, onDismiss: {
            // Defer to onDismiss so the coping sheet doesn't race the check-in sheet's close.
            if pendingCopingEntry != nil { showCoping = true }
            Task { await reschedule() }
        }) {
            CheckInView { entry in
                if entry.valence.rawValue <= 2 {
                    pendingCopingEntry = entry
                }
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showCoping, onDismiss: { pendingCopingEntry = nil }) {
            if let pendingCopingEntry {
                CopingSuggestionView(entry: pendingCopingEntry)
            }
        }
        .task { await bootstrap() }
        .onOpenURL { url in
            // Widget tap → moodapp://checkin
            if url.scheme == "moodapp", url.host == "checkin" {
                isCheckingIn = true
            }
        }
        .fullScreenCover(isPresented: .constant(!hasOnboarded)) {
            OnboardingView(onComplete: { hasOnboarded = true })
        }
    }

    private func bootstrap() async {
        if healthKit.authState == .notDetermined {
            await healthKit.requestAuthorization()
        }
        _ = await NotificationScheduler.shared.requestAuthorization()
        await reschedule()
    }

    private func reschedule() async {
        let prefs = NotificationPreferences(
            enabled: notifEnabled,
            morningMinutes: morningMinutes,
            eveningMinutes: eveningMinutes
        )
        var checker: CalendarBusyChecker?
        if skipEvents {
            let candidate = CalendarBusyChecker()
            await candidate.requestAccess()
            if candidate.hasAccess { checker = candidate }
        }
        await NotificationScheduler.shared.reconcile(
            preferences: prefs,
            lastLog: entries.first?.timestamp,
            busyChecker: checker
        )
    }
}
