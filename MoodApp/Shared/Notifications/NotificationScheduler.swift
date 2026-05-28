import Foundation
import UserNotifications

struct NotificationPreferences: Equatable {
    var enabled: Bool = true
    var morningHour: Int = 9
    var morningMinute: Int = 0
    var eveningHour: Int = 20
    var eveningMinute: Int = 0

    init(enabled: Bool = true, morningHour: Int = 9, morningMinute: Int = 0, eveningHour: Int = 20, eveningMinute: Int = 0) {
        self.enabled = enabled
        self.morningHour = morningHour
        self.morningMinute = morningMinute
        self.eveningHour = eveningHour
        self.eveningMinute = eveningMinute
    }

    /// Build from minutes-since-midnight, the form persisted in @AppStorage.
    init(enabled: Bool, morningMinutes: Int, eveningMinutes: Int) {
        self.init(
            enabled: enabled,
            morningHour: morningMinutes / 60, morningMinute: morningMinutes % 60,
            eveningHour: eveningMinutes / 60, eveningMinute: eveningMinutes % 60
        )
    }
}

/// Plans mood reminders. Rather than a single repeating trigger (which can't
/// skip a bad day), it re-plans an explicit rolling window of one-shot
/// reminders every time the app runs, dropping any occurrence that would be
/// spam: too soon after a check-in, or on top of a calendar event. Focus modes
/// (including Driving) are honored by the system because we send at `.passive`.
@MainActor
final class NotificationScheduler {
    static let shared = NotificationScheduler()

    private let center = UNUserNotificationCenter.current()
    private let identifierPrefix = "mood.reminder."
    private let suppressionWindow: TimeInterval = 3 * 3600
    private let planningHorizonDays = 7

    private let prompts = [
        "How are you feeling right now?",
        "A quick check-in — what's your mood?",
        "Take a breath. How's right now?",
        "One tap: how are you doing?",
    ]

    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func reconcile(
        preferences: NotificationPreferences,
        lastLog: Date?,
        busyChecker: CalendarBusyChecker? = nil,
        now: Date = .now,
        calendar: Calendar = .current
    ) async {
        await clearPending()
        guard preferences.enabled else { return }

        let slots = [
            (name: "morning", hour: preferences.morningHour, minute: preferences.morningMinute),
            (name: "evening", hour: preferences.eveningHour, minute: preferences.eveningMinute),
        ]

        for dayOffset in 0..<planningHorizonDays {
            guard let day = calendar.date(byAdding: .day, value: dayOffset, to: now) else { continue }
            for slot in slots {
                guard let fire = fireDate(on: day, hour: slot.hour, minute: slot.minute, calendar: calendar),
                      fire > now else { continue }
                if let lastLog, fire < lastLog.addingTimeInterval(suppressionWindow) { continue }
                if let busyChecker, await busyChecker.isBusy(at: fire) { continue }
                await schedule(at: fire, slot: slot.name, calendar: calendar)
            }
        }
    }

    func cancelAll() async { await clearPending() }

    // MARK: - Private

    private func clearPending() async {
        let pending = await center.pendingNotificationRequests()
        let ours = pending.map(\.identifier).filter { $0.hasPrefix(identifierPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: ours)
    }

    private func fireDate(on day: Date, hour: Int, minute: Int, calendar: Calendar) -> Date? {
        var comps = calendar.dateComponents([.year, .month, .day], from: day)
        comps.hour = hour
        comps.minute = minute
        return calendar.date(from: comps)
    }

    private func schedule(at fire: Date, slot: String, calendar: Calendar) async {
        let content = UNMutableNotificationContent()
        content.title = "Mood check-in"
        content.body = prompts.randomElement() ?? prompts[0]
        content.interruptionLevel = .passive
        content.sound = .default

        let comps = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let id = identifierPrefix + slot + "." + String(Int(fire.timeIntervalSince1970))
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        try? await center.add(request)
    }
}
