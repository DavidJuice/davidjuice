import SwiftUI
import SwiftData

@main
struct MoodAppApp: App {
    private let container = MoodDataStore.makeSharedContainer()
    @State private var healthKit = HealthKitManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(healthKit)
        }
        .modelContainer(container)
    }
}
