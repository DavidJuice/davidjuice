import SwiftUI
import SwiftData

@main
struct MoodWatchApp: App {
    private let container = MoodDataStore.makeSharedContainer()
    @State private var healthKit = HealthKitManager()

    var body: some Scene {
        WindowGroup {
            WatchCheckInView()
                .environment(healthKit)
                .task { await healthKit.requestAuthorization() }
        }
        .modelContainer(container)
    }
}
