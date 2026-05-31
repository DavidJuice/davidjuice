import SwiftUI
import SwiftData

/// Offered right after an unpleasant check-in. One intervention, one tap to
/// start, easy to skip. Records a `CopingOutcome` so we can ask "did it help?"
/// a day later.
struct CopingSuggestionView: View {
    let entry: MoodEntry

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var intervention: CopingIntervention?
    @State private var outcome: CopingOutcome?
    @State private var showActivity = false

    var body: some View {
        NavigationStack {
            Group {
                if let intervention {
                    body(for: intervention)
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("A small reset")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Skip") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $showActivity) {
                if let intervention {
                    CopingActivityView(intervention: intervention) { completed in
                        if completed, let outcome {
                            CopingRecommender(modelContext: modelContext).markCompleted(outcome)
                        }
                        showActivity = false
                        dismiss()
                    }
                }
            }
        }
        .task { initialize() }
    }

    @ViewBuilder
    private func body(for intervention: CopingIntervention) -> some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: intervention.symbolName)
                .font(.system(size: 64))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.tint)
            Text(intervention.displayName)
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
            Text(intervention.subtitle)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button {
                if let outcome {
                    CopingRecommender(modelContext: modelContext).markStarted(outcome)
                }
                showActivity = true
            } label: {
                Label("Start (~\(intervention.durationSeconds)s)", systemImage: "play.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 32)

            Button("Not now") { dismiss() }
                .padding(.bottom, 24)
        }
    }

    private func initialize() {
        guard intervention == nil else { return }
        let recommender = CopingRecommender(modelContext: modelContext)
        let pick = recommender.recommend()
        intervention = pick
        outcome = recommender.suggest(pick, for: entry)
    }
}
