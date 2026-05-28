import Foundation
import SwiftData

/// What kind of pattern an insight describes — drives the icon and lets us
/// avoid surfacing the same category two weeks running.
enum InsightCategory: String, Codable, CaseIterable, Sendable {
    case sleepCorrelation
    case dayOfWeekPattern
    case timeOfDayPattern
    case activityCorrelation
    case generic

    var symbolName: String {
        switch self {
        case .sleepCorrelation:     return "bed.double.fill"
        case .dayOfWeekPattern:     return "calendar"
        case .timeOfDayPattern:     return "clock.fill"
        case .activityCorrelation:  return "figure.run"
        case .generic:              return "lightbulb.fill"
        }
    }
}

/// One on-device-generated weekly insight. Cached so the dashboard renders
/// instantly and the Core ML pass (build step 5) only runs once per week.
@Model
final class CachedInsight {
    @Attribute(.unique) var id: UUID
    var generatedAt: Date
    var weekOf: Date            // start-of-week the insight covers
    var text: String
    var category: InsightCategory

    init(
        id: UUID = UUID(),
        generatedAt: Date = .now,
        weekOf: Date,
        text: String,
        category: InsightCategory
    ) {
        self.id = id
        self.generatedAt = generatedAt
        self.weekOf = weekOf
        self.text = text
        self.category = category
    }
}
