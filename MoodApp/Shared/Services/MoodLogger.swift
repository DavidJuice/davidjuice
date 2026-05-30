import Foundation
import SwiftData

/// The single write path for a check-in, shared by the iPhone and Watch flows.
/// Captures context, persists to SwiftData (canonical for our extra context),
/// then mirrors the mood to HealthKit when the OS supports it.
@MainActor
final class MoodLogger {
    private let modelContext: ModelContext
    private let healthKit: HealthKitManager
    private let weather: WeatherProvider?

    init(modelContext: ModelContext, healthKit: HealthKitManager, weather: WeatherProvider? = nil) {
        self.modelContext = modelContext
        self.healthKit = healthKit
        self.weather = weather
    }

    @discardableResult
    func log(
        valence: Valence,
        feeling: Feeling? = nil,
        factor: MoodFactor? = nil,
        note: String? = nil,
        source: MoodSource,
        date: Date = .now
    ) async -> MoodEntry {
        var context = await healthKit.captureContext(at: date)
        if let snapshot = await weather?.currentWeather() {
            context.weatherCondition = snapshot.condition
            context.temperatureCelsius = snapshot.temperatureCelsius
        }
        let entry = MoodEntry(
            timestamp: date,
            valence: valence,
            feeling: feeling,
            factor: factor,
            note: note?.trimmedNonEmpty,
            source: source,
            context: context
        )
        modelContext.insert(entry)
        try? modelContext.save()

        if #available(iOS 18.0, watchOS 11.0, *) {
            if let sampleID = await healthKit.saveStateOfMind(
                valence: valence,
                feeling: feeling,
                factor: factor,
                date: date
            ) {
                entry.healthKitSampleID = sampleID
                try? modelContext.save()
            }
        }
        return entry
    }

    /// Deletes an entry locally and, where possible, the mirrored HealthKit sample.
    func delete(_ entry: MoodEntry) async {
        if #available(iOS 18.0, watchOS 11.0, *), let sampleID = entry.healthKitSampleID {
            await healthKit.deleteStateOfMind(sampleID: sampleID)
        }
        modelContext.delete(entry)
        try? modelContext.save()
    }
}

private extension String {
    var trimmedNonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
