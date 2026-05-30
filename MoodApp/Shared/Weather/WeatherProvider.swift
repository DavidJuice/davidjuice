import Foundation
import CoreLocation
import WeatherKit
import Observation

/// One-shot current-weather lookup, used to enrich a check-in's silent context.
/// Best-effort: a denied permission, slow GPS, or network failure returns nil
/// rather than blocking the save.
@MainActor
@Observable
final class WeatherProvider: NSObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let service = WeatherService.shared

    private var pendingLocation: CheckedContinuation<CLLocation?, Never>?
    private var pendingAuthorization: CheckedContinuation<CLAuthorizationStatus, Never>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    /// Capped at ~3s so we never delay a save noticeably.
    func currentWeather(timeout: TimeInterval = 3) async -> (condition: String, temperatureCelsius: Double)? {
        let result: (String, Double)? = await withTaskGroup(of: (String, Double)?.self) { group in
            group.addTask { @MainActor in
                guard let location = await self.currentLocation() else { return nil }
                do {
                    let current = try await self.service.weather(for: location, including: .current)
                    return (
                        current.condition.description,
                        current.temperature.converted(to: .celsius).value
                    )
                } catch {
                    return nil
                }
            }
            group.addTask {
                try? await Task.sleep(for: .seconds(timeout))
                return nil
            }
            let next = await group.next() ?? nil
            group.cancelAll()
            return next
        }
        guard let result else { return nil }
        return (condition: result.0, temperatureCelsius: result.1)
    }

    private func currentLocation() async -> CLLocation? {
        let status = locationManager.authorizationStatus
        let resolved: CLAuthorizationStatus
        switch status {
        case .notDetermined:
            resolved = await requestAuthorization()
        default:
            resolved = status
        }
        guard resolved == .authorizedWhenInUse || resolved == .authorizedAlways else { return nil }

        return await withCheckedContinuation { continuation in
            pendingLocation = continuation
            locationManager.requestLocation()
        }
    }

    private func requestAuthorization() async -> CLAuthorizationStatus {
        await withCheckedContinuation { continuation in
            pendingAuthorization = continuation
            locationManager.requestWhenInUseAuthorization()
        }
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            pendingAuthorization?.resume(returning: manager.authorizationStatus)
            pendingAuthorization = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            pendingLocation?.resume(returning: locations.last)
            pendingLocation = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            pendingLocation?.resume(returning: nil)
            pendingLocation = nil
        }
    }
}
