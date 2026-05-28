import SwiftUI

struct RootView: View {
    @Environment(HealthKitManager.self) private var healthKit
    @State private var isCheckingIn = false

    var body: some View {
        NavigationStack {
            DashboardView(onCheckIn: { isCheckingIn = true })
        }
        .sheet(isPresented: $isCheckingIn) {
            CheckInView()
        }
        .task {
            if healthKit.authState == .notDetermined {
                await healthKit.requestAuthorization()
            }
        }
    }
}
