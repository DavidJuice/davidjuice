import Foundation
import SwiftData

/// A single mood check-in. HealthKit (`HKStateOfMind`) remains the canonical
/// store for the mood itself; this SwiftData record holds the richer context
/// we capture plus a back-reference (`healthKitSampleID`) so the two stay in
/// sync and a delete here can delete there.
@Model
final class MoodEntry {
    @Attribute(.unique) var id: UUID
    var timestamp: Date
    var valence: Valence
    var feeling: Feeling?
    var factor: MoodFactor?
    var note: String?
    var source: MoodSource

    // Auto-captured context (see MoodContext).
    var hrv: Double?
    var sleepHours: Double?
    var stepCount: Int?
    var timeOfDay: TimeOfDayBucket
    var weekday: Int
    var weatherCondition: String?
    var temperatureCelsius: Double?

    var healthKitSampleID: UUID?

    init(
        id: UUID = UUID(),
        timestamp: Date = .now,
        valence: Valence,
        feeling: Feeling? = nil,
        factor: MoodFactor? = nil,
        note: String? = nil,
        source: MoodSource,
        context: MoodContext = MoodContext(),
        healthKitSampleID: UUID? = nil
    ) {
        let calendar = Calendar.current
        self.id = id
        self.timestamp = timestamp
        self.valence = valence
        self.feeling = feeling
        self.factor = factor
        self.note = note
        self.source = source
        self.hrv = context.hrv
        self.sleepHours = context.sleepHours
        self.stepCount = context.stepCount
        self.timeOfDay = context.timeOfDay ?? TimeOfDayBucket(from: timestamp, calendar: calendar)
        self.weekday = context.weekday ?? calendar.component(.weekday, from: timestamp)
        self.weatherCondition = context.weatherCondition
        self.temperatureCelsius = context.temperatureCelsius
        self.healthKitSampleID = healthKitSampleID
    }
}
