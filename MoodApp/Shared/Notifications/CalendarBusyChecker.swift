import Foundation
import EventKit

/// Read-only calendar lookup used to suppress reminders that would fire during
/// a meeting. Optional — if the user never grants access, `isBusy` simply
/// returns false and reminders schedule normally.
@MainActor
final class CalendarBusyChecker {
    private let store = EKEventStore()
    private(set) var hasAccess = false

    func requestAccess() async {
        hasAccess = (try? await store.requestFullAccessToEvents()) ?? false
    }

    func isBusy(at date: Date) async -> Bool {
        guard hasAccess else { return false }
        let predicate = store.predicateForEvents(
            withStart: date.addingTimeInterval(-60),
            end: date.addingTimeInterval(60),
            calendars: nil
        )
        return store.events(matching: predicate).contains { event in
            !event.isAllDay && event.availability != .free
        }
    }
}
