import SwiftUI
import SwiftData

/// Shown on the dashboard a day after a coping suggestion the user hasn't
/// answered yet. The Yes/No tap is the only training signal the recommender
/// needs.
struct CopingFollowUpTile: View {
    let outcome: CopingOutcome

    @Environment(\.modelContext) private var modelContext

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: outcome.intervention.symbolName)
                .font(.title3)
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.tint)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text("Did the \(outcome.intervention.displayName.lowercased()) help?")
                    .font(.subheadline.weight(.medium))
                Text(outcome.suggestedAt, format: .relative(presentation: .named))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            HStack(spacing: 8) {
                Button {
                    record(helped: false)
                } label: {
                    Image(systemName: "hand.thumbsdown.fill")
                }
                .buttonStyle(.bordered)
                .tint(.secondary)

                Button {
                    record(helped: true)
                } label: {
                    Image(systemName: "hand.thumbsup.fill")
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func record(helped: Bool) {
        CopingRecommender(modelContext: modelContext).recordOutcome(outcome, helped: helped)
    }
}
