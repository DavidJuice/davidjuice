import SwiftUI
import SwiftData
import UIKit

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(HealthKitManager.self) private var healthKit

    @Query(sort: \MoodEntry.timestamp, order: .reverse) private var entries: [MoodEntry]
    @Query private var insights: [CachedInsight]

    @AppStorage("notif.enabled") private var notifEnabled = true
    @AppStorage("notif.morning") private var morningMinutes = 9 * 60
    @AppStorage("notif.evening") private var eveningMinutes = 20 * 60
    @AppStorage("notif.skipEvents") private var skipEvents = false

    @State private var calendarChecker = CalendarBusyChecker()
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Reminders") {
                    Toggle("Daily check-in reminders", isOn: $notifEnabled)
                    if notifEnabled {
                        DatePicker("Morning", selection: timeBinding($morningMinutes), displayedComponents: .hourAndMinute)
                        DatePicker("Evening", selection: timeBinding($eveningMinutes), displayedComponents: .hourAndMinute)
                        Toggle("Skip during calendar events", isOn: $skipEvents)
                    }
                } footer: {
                    Text("Reminders are quiet by design and are skipped right after you check in. Focus modes always silence them.")
                }

                Section("Health") {
                    LabeledContent("Apple Health", value: healthStatus)
                    Button("Open Health Access") { openSystemSettings() }
                }

                Section {
                    Button("Delete All Data", role: .destructive) { showDeleteConfirm = true }
                } footer: {
                    Text("Removes every check-in from this app and the matching Health entries it created.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .onChange(of: notifEnabled) { reschedule() }
            .onChange(of: morningMinutes) { reschedule() }
            .onChange(of: eveningMinutes) { reschedule() }
            .onChange(of: skipEvents) { _, isOn in
                if isOn {
                    Task {
                        await calendarChecker.requestAccess()
                        if !calendarChecker.hasAccess { skipEvents = false }
                        reschedule()
                    }
                } else {
                    reschedule()
                }
            }
            .confirmationDialog("Delete all check-ins?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete Everything", role: .destructive) { Task { await deleteAll() } }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private var healthStatus: String {
        switch healthKit.authState {
        case .authorized:     return "Connected"
        case .notDetermined:  return "Not set up"
        case .unavailable:    return "Unavailable"
        }
    }

    private func timeBinding(_ minutes: Binding<Int>) -> Binding<Date> {
        Binding {
            Calendar.current.date(
                bySettingHour: minutes.wrappedValue / 60,
                minute: minutes.wrappedValue % 60,
                second: 0, of: .now
            ) ?? .now
        } set: { newValue in
            let comps = Calendar.current.dateComponents([.hour, .minute], from: newValue)
            minutes.wrappedValue = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
        }
    }

    private func reschedule() {
        let prefs = NotificationPreferences(
            enabled: notifEnabled,
            morningMinutes: morningMinutes,
            eveningMinutes: eveningMinutes
        )
        let checker = (skipEvents && calendarChecker.hasAccess) ? calendarChecker : nil
        Task {
            await NotificationScheduler.shared.reconcile(
                preferences: prefs,
                lastLog: entries.first?.timestamp,
                busyChecker: checker
            )
        }
    }

    private func deleteAll() async {
        for entry in entries {
            if #available(iOS 18.0, *), let sampleID = entry.healthKitSampleID {
                await healthKit.deleteStateOfMind(sampleID: sampleID)
            }
            modelContext.delete(entry)
        }
        for insight in insights {
            modelContext.delete(insight)
        }
        try? modelContext.save()
        await NotificationScheduler.shared.cancelAll()
    }

    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
