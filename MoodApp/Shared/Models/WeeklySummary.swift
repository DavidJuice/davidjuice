import Foundation
import SwiftData

/// A cached natural-language weekly recap, generated on-device via Apple
/// Intelligence's Foundation Models framework when available (iOS 26+).
/// Cached so the dashboard renders instantly and the model only runs once
/// per week.
@Model
final class WeeklySummary {
    @Attribute(.unique) var id: UUID
    var generatedAt: Date
    var weekOf: Date
    var text: String

    init(
        id: UUID = UUID(),
        generatedAt: Date = .now,
        weekOf: Date,
        text: String
    ) {
        self.id = id
        self.generatedAt = generatedAt
        self.weekOf = weekOf
        self.text = text
    }
}
