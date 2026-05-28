import Foundation

/// Optional single context tag attached to a check-in ("what's affecting you").
/// Kept to a tight, scannable set for the MVP — one tap, no scrolling.
enum MoodFactor: String, Codable, CaseIterable, Identifiable, Sendable {
    case work
    case family
    case friends
    case health
    case money
    case relationships
    case selfCare
    case sleep
    case exercise
    case weather

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .work:          return "Work"
        case .family:        return "Family"
        case .friends:       return "Friends"
        case .health:        return "Health"
        case .money:         return "Money"
        case .relationships: return "Relationships"
        case .selfCare:      return "Self-Care"
        case .sleep:         return "Sleep"
        case .exercise:      return "Exercise"
        case .weather:       return "Weather"
        }
    }

    var symbolName: String {
        switch self {
        case .work:          return "briefcase.fill"
        case .family:        return "house.fill"
        case .friends:       return "person.2.fill"
        case .health:        return "heart.text.square.fill"
        case .money:         return "dollarsign.circle.fill"
        case .relationships: return "heart.circle.fill"
        case .selfCare:      return "figure.mind.and.body"
        case .sleep:         return "bed.double.fill"
        case .exercise:      return "figure.run"
        case .weather:       return "cloud.sun.fill"
        }
    }
}
