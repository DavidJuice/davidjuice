import SwiftUI
import SwiftData

@main
struct MoodAppApp: App {
    private let container = MoodDataStore.makeSharedContainer()
    @State private var healthKit = HealthKitManager()
    @State private var weather = WeatherProvider()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(healthKit)
                .environment(weather)
        }
        .modelContainer(container)
    }
}
