import WidgetKit
import SwiftData
import Foundation

struct MoodWidgetEntry: TimelineEntry {
    let date: Date
    let latestValence: Valence?
    let lastLogDate: Date?
}

/// Reads the latest mood entry from the shared App Group SwiftData store.
/// The widget refreshes every 30 minutes; faster refreshes aren't needed
/// because logging from the host app updates the timeline directly.
struct MoodWidgetProvider: TimelineProvider {
    private static let container = MoodDataStore.makeSharedContainer()

    func placeholder(in context: Context) -> MoodWidgetEntry {
        MoodWidgetEntry(date: .now, latestValence: .pleasant, lastLogDate: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (MoodWidgetEntry) -> Void) {
        Task { @MainActor in completion(loadEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoodWidgetEntry>) -> Void) {
        Task { @MainActor in
            let entry = loadEntry()
            let next = Date.now.addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    @MainActor
    private func loadEntry() -> MoodWidgetEntry {
        var fetch = FetchDescriptor<MoodEntry>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        fetch.fetchLimit = 1
        let latest = (try? Self.container.mainContext.fetch(fetch))?.first
        return MoodWidgetEntry(
            date: .now,
            latestValence: latest?.valence,
            lastLogDate: latest?.timestamp
        )
    }
}
