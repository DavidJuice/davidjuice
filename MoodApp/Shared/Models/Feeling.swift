import Foundation

/// Curated, deliberately warm (non-clinical) feeling vocabulary.
/// iPhone offers all 12; the Watch offers the 8 marked `availableOnWatch`
/// to keep the Crown-driven flow glanceable.
enum Feeling: String, Codable, CaseIterable, Identifiable, Sendable {
    case joyful
    case excited
    case proud
    case calm
    case content
    case grateful
    case anxious
    case stressed
    case frustrated
    case sad
    case tired
    case lonely

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .joyful:     return "Joyful"
        case .excited:    return "Excited"
        case .proud:      return "Proud"
        case .calm:       return "Calm"
        case .content:    return "Content"
        case .grateful:   return "Grateful"
        case .anxious:    return "Anxious"
        case .stressed:   return "Stressed"
        case .frustrated: return "Frustrated"
        case .sad:        return "Sad"
        case .tired:      return "Tired"
        case .lonely:     return "Lonely"
        }
    }

    var symbolName: String {
        switch self {
        case .joyful:     return "sparkles"
        case .excited:    return "bolt.fill"
        case .proud:      return "star.fill"
        case .calm:       return "leaf.fill"
        case .content:    return "checkmark.seal.fill"
        case .grateful:   return "heart.fill"
        case .anxious:    return "wind"
        case .stressed:   return "exclamationmark.triangle.fill"
        case .frustrated: return "flame.fill"
        case .sad:        return "cloud.rain.fill"
        case .tired:      return "moon.zzz.fill"
        case .lonely:     return "person.fill"
        }
    }

    /// Rough valence association, used to bias word ordering toward the
    /// user's chosen mood so the most-likely words surface first.
    var associatedValence: Valence {
        switch self {
        case .joyful, .excited, .proud:   return .veryPleasant
        case .calm, .content, .grateful:  return .pleasant
        case .anxious, .stressed:         return .unpleasant
        case .frustrated, .sad, .lonely:  return .veryUnpleasant
        case .tired:                      return .neutral
        }
    }

    var availableOnWatch: Bool {
        switch self {
        case .joyful, .calm, .grateful, .content,
             .anxious, .stressed, .sad, .tired:
            return true
        case .excited, .proud, .frustrated, .lonely:
            return false
        }
    }

    static var watchVocabulary: [Feeling] {
        allCases.filter(\.availableOnWatch)
    }
}
