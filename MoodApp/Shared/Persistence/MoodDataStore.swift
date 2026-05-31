import Foundation
import SwiftData

/// Central SwiftData configuration. The store lives in a shared App Group
/// container so the iPhone app, the Watch app, and the widget extension all
/// read and write the same database — this is what makes a Watch check-in
/// show up on the phone with no backend.
enum MoodDataStore {
    /// Must match the App Group capability enabled on every target.
    static let appGroupIdentifier = "group.com.moodapp.shared"

    static let schema = Schema([
        MoodEntry.self,
        CachedInsight.self,
        CopingOutcome.self,
        WeeklySummary.self,
    ])

    /// Production container, backed by the shared App Group.
    static func makeSharedContainer() -> ModelContainer {
        let configuration = ModelConfiguration(
            schema: schema,
            groupContainer: .identifier(appGroupIdentifier)
        )
        return makeContainer(with: configuration)
    }

    /// In-memory container for previews and unit tests.
    static func makeInMemoryContainer() -> ModelContainer {
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        return makeContainer(with: configuration)
    }

    private static func makeContainer(with configuration: ModelConfiguration) -> ModelContainer {
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Failed to create MoodApp ModelContainer: \(error)")
        }
    }
}
