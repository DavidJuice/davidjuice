import Foundation

/// The 5-stop mood scale used across iPhone and Watch check-ins.
/// Backed by an Int so it sorts naturally and stores cleanly in SwiftData.
enum Valence: Int, Codable, CaseIterable, Identifiable, Sendable {
    case veryUnpleasant = 1
    case unpleasant = 2
    case neutral = 3
    case pleasant = 4
    case veryPleasant = 5

    var id: Int { rawValue }

    /// HealthKit `HKStateOfMind` expects a valence in the closed range [-1.0, 1.0].
    var healthKitValue: Double {
        switch self {
        case .veryUnpleasant: return -1.0
        case .unpleasant:     return -0.5
        case .neutral:        return 0.0
        case .pleasant:       return 0.5
        case .veryPleasant:   return 1.0
        }
    }

    /// Rebuilds a bucket from a HealthKit valence so samples written by
    /// Apple's State of Mind (or our own) map back onto our 5-stop scale.
    init(healthKitValue: Double) {
        switch healthKitValue {
        case ..<(-0.75): self = .veryUnpleasant
        case ..<(-0.25): self = .unpleasant
        case ..<0.25:    self = .neutral
        case ..<0.75:    self = .pleasant
        default:         self = .veryPleasant
        }
    }

    var displayName: String {
        switch self {
        case .veryUnpleasant: return "Very Unpleasant"
        case .unpleasant:     return "Unpleasant"
        case .neutral:        return "Neutral"
        case .pleasant:       return "Pleasant"
        case .veryPleasant:   return "Very Pleasant"
        }
    }

    /// Weather metaphor — friendly, non-clinical, and pairs with the
    /// WeatherKit context we attach to each entry. All SF Symbols (iOS 17).
    var symbolName: String {
        switch self {
        case .veryUnpleasant: return "cloud.bolt.rain.fill"
        case .unpleasant:     return "cloud.rain.fill"
        case .neutral:        return "cloud.fill"
        case .pleasant:       return "cloud.sun.fill"
        case .veryPleasant:   return "sun.max.fill"
        }
    }

    /// Named colors defined in Assets.xcassets (created in build step 7).
    var colorName: String {
        switch self {
        case .veryUnpleasant: return "ValenceVeryUnpleasant"
        case .unpleasant:     return "ValenceUnpleasant"
        case .neutral:        return "ValenceNeutral"
        case .pleasant:       return "ValencePleasant"
        case .veryPleasant:   return "ValenceVeryPleasant"
        }
    }
}
