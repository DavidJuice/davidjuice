import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(HealthKitManager.self) private var healthKit
    @Query(sort: \MoodEntry.timestamp, order: .reverse) private var entries: [MoodEntry]

    @AppStorage("notif.enabled") private var notifEnabled = true
    @AppStorage("notif.morning") private var morningMinutes = 9 * 60
    @AppStorage("notif.evening") private var eveningMinutes = 20 * 60
    @AppStorage("notif.skipEvents") private var skipEvents = false

    @State private var isCheckingIn = false
    @State private var showSettings = false

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
        .sheet(isPresented: $isCheckingIn) { CheckInView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .task { await bootstrap() }
        .onChange(of: isCheckingIn) { _, presenting in
            // A fresh check-in should suppress the next imminent reminder.
            if !presenting { Task { await reschedule() } }
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
