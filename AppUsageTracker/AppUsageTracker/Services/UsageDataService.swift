import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings
import SwiftUI

@MainActor
class UsageDataService: ObservableObject {
    static let shared = UsageDataService()

    @Published var authorizationStatus: AuthorizationStatus = .notDetermined
    @Published var isAuthorized: Bool = false

    private let center = AuthorizationCenter.shared

    enum AuthorizationStatus {
        case notDetermined
        case authorized
        case denied
    }

    init() {
        checkAuthorizationStatus()
    }

    // Request authorization for Screen Time API
    func requestAuthorization() async throws {
        do {
            try await center.requestAuthorization(for: .individual)
            authorizationStatus = .authorized
            isAuthorized = true
        } catch {
            authorizationStatus = .denied
            isAuthorized = false
            throw error
        }
    }

    private func checkAuthorizationStatus() {
        switch center.authorizationStatus {
        case .approved:
            authorizationStatus = .authorized
            isAuthorized = true
        case .denied:
            authorizationStatus = .denied
            isAuthorized = false
        case .notDetermined:
            authorizationStatus = .notDetermined
            isAuthorized = false
        @unknown default:
            authorizationStatus = .notDetermined
            isAuthorized = false
        }
    }

    // Fetch usage statistics for a given time period
    func fetchUsageStatistics(for period: TimePeriod) async -> UsageStatistics {
        // Note: The Screen Time API requires a DeviceActivityReport extension
        // For now, we'll generate mock data to demonstrate the UI
        // In a production app, you would implement a DeviceActivityReport extension

        let mockApps = generateMockData(for: period)
        let totalTime = mockApps.reduce(0) { $0 + $1.totalTime }

        return UsageStatistics(
            apps: mockApps.sorted { $0.totalTime > $1.totalTime },
            totalScreenTime: totalTime,
            period: period
        )
    }

    // Generate mock data for demonstration
    private func generateMockData(for period: TimePeriod) -> [AppUsage] {
        let appNames = [
            ("Safari", "com.apple.mobilesafari"),
            ("Instagram", "com.instagram.app"),
            ("Messages", "com.apple.MobileSMS"),
            ("YouTube", "com.google.youtube"),
            ("TikTok", "com.tiktok.app"),
            ("Twitter", "com.twitter.app"),
            ("Facebook", "com.facebook.app"),
            ("WhatsApp", "net.whatsapp.WhatsApp"),
            ("Mail", "com.apple.mobilemail"),
            ("Photos", "com.apple.mobileslideshow"),
            ("Maps", "com.apple.Maps"),
            ("Music", "com.apple.Music"),
            ("Settings", "com.apple.Preferences"),
            ("App Store", "com.apple.AppStore"),
            ("Calendar", "com.apple.mobilecal")
        ]

        let multiplier = Double(period.days)

        return appNames.map { name, bundle in
            let baseTime = Double.random(in: 300...7200) // 5min to 2h
            let totalTime = baseTime * multiplier

            return AppUsage(
                appName: name,
                bundleIdentifier: bundle,
                totalTime: totalTime,
                iconData: nil
            )
        }
    }
}
