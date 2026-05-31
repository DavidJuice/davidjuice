import WidgetKit
import SwiftData
import Foundation

struct MoodComplicationEntry: TimelineEntry {
    let date: Date
    let latestValence: Valence?
    let lastLogDate: Date?
}

/// Reads the latest mood entry from the App-Group SwiftData store so the
/// complication shows time-since-last-log without any IPC to the host app.
struct MoodComplicationProvider: TimelineProvider {
    private static let container = MoodDataStore.makeSharedContainer()

    func placeholder(in context: Context) -> MoodComplicationEntry {
        MoodComplicationEntry(date: .now, latestValence: .pleasant, lastLogDate: .now.addingTimeInterval(-3600))
    }

    func getSnapshot(in context: Context, completion: @escaping (MoodComplicationEntry) -> Void) {
        Task { @MainActor in completion(loadEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoodComplicationEntry>) -> Void) {
        Task { @MainActor in
            let entry = loadEntry()
            // Refresh every 15 min so the "time since last log" stays roughly current.
            let next = Date.now.addingTimeInterval(15 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    @MainActor
    private func loadEntry() -> MoodComplicationEntry {
        var fetch = FetchDescriptor<MoodEntry>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        fetch.fetchLimit = 1
        let latest = (try? Self.container.mainContext.fetch(fetch))?.first
        return MoodComplicationEntry(
            date: .now,
            latestValence: latest?.valence,
            lastLogDate: latest?.timestamp
        )
    }
}
