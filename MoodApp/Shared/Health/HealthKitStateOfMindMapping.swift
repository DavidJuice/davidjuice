import Foundation
import HealthKit

/// Maps our curated vocabulary onto Apple's `HKStateOfMind` taxonomy so the
/// moods we log are legible to the system Health app and any other reader.
/// Gated to iOS 18 / watchOS 11 — the version that exposed these enums.
@available(iOS 18.0, watchOS 11.0, *)
extension Feeling {
    /// nil where Apple has no close equivalent; the valence is still recorded.
    var healthKitLabel: HKStateOfMind.Label? {
        switch self {
        case .joyful:     return .joyful
        case .excited:    return .excited
        case .proud:      return .proud
        case .calm:       return .calm
        case .content:    return .content
        case .grateful:   return .grateful
        case .anxious:    return .anxious
        case .stressed:   return .stressed
        case .frustrated: return .frustrated
        case .sad:        return .sad
        case .lonely:     return .lonely
        case .tired:      return nil
        }
    }
}

@available(iOS 18.0, watchOS 11.0, *)
extension MoodFactor {
    var healthKitAssociation: HKStateOfMind.Association? {
        switch self {
        case .work:          return .work
        case .family:        return .family
        case .friends:       return .friends
        case .health:        return .health
        case .money:         return .money
        case .relationships: return .partner
        case .sleep:         return .health
        case .exercise:      return .fitness
        case .weather:       return .weather
        case .selfCare:      return .identity
        }
    }
}
