import SwiftUI

/// Routes to the per-intervention activity screen. Each screen calls back
/// with `completed` = whether the user reached the end (vs. cancelled).
struct CopingActivityView: View {
    let intervention: CopingIntervention
    let onComplete: (Bool) -> Void

    var body: some View {
        switch intervention {
        case .boxBreathing: BoxBreathingView(onComplete: onComplete)
        case .grounding:    GroundingView(onComplete: onComplete)
        case .walk:         WalkPromptView(onComplete: onComplete)
        case .gratitude:    GratitudeView(onComplete: onComplete)
        }
    }
}

// MARK: - Box breathing

/// Animated 60-second box breath: inhale 4s → hold 4s → exhale 4s → hold 4s.
struct BoxBreathingView: View {
    let onComplete: (Bool) -> Void

    @State private var startedAt = Date.now
    private let total: TimeInterval = 60
    private let cycle: TimeInterval = 16

    var body: some View {
        TimelineView(.animation) { context in
            let elapsed = context.date.timeIntervalSince(startedAt)
            let phase = phase(for: elapsed)
            let scale = scale(for: elapsed)
            let finished = elapsed >= total
            let remaining = max(0, Int(ceil(total - elapsed)))

            VStack(spacing: 32) {
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.25))
                        .frame(width: 220, height: 220)
                        .scaleEffect(scale)
                    Text(phase.label)
                        .font(.title2.weight(.medium))
                }
                Spacer()
                Text(finished ? "Done" : "\(remaining)s")
                    .font(.title3.monospacedDigit())
                    .foregroundStyle(.secondary)
                if finished {
                    Button { onComplete(true) } label: {
                        Text("Finish").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .padding(.horizontal, 40)
                } else {
                    Button("Cancel") { onComplete(false) }
                        .padding(.bottom, 8)
                }
            }
            .padding(40)
        }
    }

    private enum BreathPhase {
        case inhale, holdIn, exhale, holdOut
        var label: String {
            switch self {
            case .inhale: return "Breathe in"
            case .holdIn: return "Hold"
            case .exhale: return "Breathe out"
            case .holdOut: return "Hold"
            }
        }
    }

    private func phase(for elapsed: TimeInterval) -> BreathPhase {
        let into = elapsed.truncatingRemainder(dividingBy: cycle)
        switch into {
        case ..<4:  return .inhale
        case ..<8:  return .holdIn
        case ..<12: return .exhale
        default:    return .holdOut
        }
    }

    private func scale(for elapsed: TimeInterval) -> Double {
        let into = elapsed.truncatingRemainder(dividingBy: cycle)
        switch into {
        case ..<4:  return 0.6 + (into / 4) * 0.4
        case ..<8:  return 1.0
        case ..<12: return 1.0 - ((into - 8) / 4) * 0.4
        default:    return 0.6
        }
    }
}

// MARK: - Text-led activities

private struct ActivityShell<Content: View>: View {
    let title: String
    let symbol: String
    @ViewBuilder var content: () -> Content
    var onDone: () -> Void
    var onCancel: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: symbol)
                .font(.system(size: 56))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.tint)
            Text(title).font(.largeTitle.bold()).multilineTextAlignment(.center)
            content()
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button { onDone() } label: {
                Text("Done").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)
            Button("Cancel") { onCancel() }
                .padding(.bottom, 8)
        }
        .padding(40)
    }
}

struct GroundingView: View {
    let onComplete: (Bool) -> Void
    var body: some View {
        ActivityShell(
            title: "Notice five things",
            symbol: "hand.point.up.left.fill",
            content: {
                VStack(alignment: .leading, spacing: 8) {
                    Text("5 things you can **see**")
                    Text("4 things you can **feel**")
                    Text("3 things you can **hear**")
                    Text("2 things you can **smell**")
                    Text("1 thing you can **taste**")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            },
            onDone: { onComplete(true) },
            onCancel: { onComplete(false) }
        )
    }
}

struct WalkPromptView: View {
    let onComplete: (Bool) -> Void
    var body: some View {
        ActivityShell(
            title: "Move for two minutes",
            symbol: "figure.walk",
            content: {
                Text("Step away from the screen. The next room, the hallway, around the block — whatever's nearest. Come back when you're ready.")
            },
            onDone: { onComplete(true) },
            onCancel: { onComplete(false) }
        )
    }
}

struct GratitudeView: View {
    let onComplete: (Bool) -> Void
    var body: some View {
        ActivityShell(
            title: "Name three",
            symbol: "heart.fill",
            content: {
                Text("Three small things from today that you're glad about. They don't have to be big — just three. Say them out loud or just in your head.")
            },
            onDone: { onComplete(true) },
            onCancel: { onComplete(false) }
        )
    }
}
