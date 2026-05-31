import Foundation

/// One-shot micro-interventions offered after an unpleasant check-in.
/// Kept to a short, well-understood set so the recommender has signal to
/// learn from quickly. Each fits in ~60 seconds.
enum CopingIntervention: String, Codable, CaseIterable, Identifiable, Sendable {
    case boxBreathing
    case grounding
    case walk
    case gratitude

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .boxBreathing: return "Box Breathing"
        case .grounding:    return "5-4-3-2-1 Grounding"
        case .walk:         return "Short Walk"
        case .gratitude:    return "Three Gratitudes"
        }
    }

    var subtitle: String {
        switch self {
        case .boxBreathing: return "Sixty seconds of paced breathing — in 4, hold 4, out 4, hold 4."
        case .grounding:    return "Notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste."
        case .walk:         return "Step away from the screen for two minutes — even just to the next room."
        case .gratitude:    return "Name three small things from today that you're glad about."
        }
    }

    var symbolName: String {
        switch self {
        case .boxBreathing: return "wind"
        case .grounding:    return "hand.point.up.left.fill"
        case .walk:         return "figure.walk"
        case .gratitude:    return "heart.fill"
        }
    }

    var durationSeconds: Int {
        switch self {
        case .boxBreathing: return 60
        case .grounding:    return 90
        case .walk:         return 120
        case .gratitude:    return 60
        }
    }
}
