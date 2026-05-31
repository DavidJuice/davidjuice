import Foundation
import SwiftData

/// Picks which intervention to suggest next, based on past "did it help?"
/// answers. Pure on-device — the personalized recommender the spec describes,
/// implemented today as a weighted helpfulness score the Core ML model can
/// later replace without touching callers.
@MainActor
final class CopingRecommender {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func recommend() -> CopingIntervention {
        let all = (try? modelContext.fetch(FetchDescriptor<CopingOutcome>())) ?? []
        let answered = all.filter { $0.helped != nil }

        guard !answered.isEmpty else { return .boxBreathing }

        // helpfulness = (helped count + 1) / (shown count + 2) — Laplace smoothing
        // so an untried intervention still has a reasonable prior.
        var scores: [CopingIntervention: Double] = [:]
        for intervention in CopingIntervention.allCases {
            let shown = answered.filter { $0.intervention == intervention }
            let helped = shown.filter { $0.helped == true }
            scores[intervention] = (Double(helped.count) + 1.0) / (Double(shown.count) + 2.0)
        }
        return scores.max(by: { $0.value < $1.value })?.key ?? .boxBreathing
    }

    @discardableResult
    func suggest(_ intervention: CopingIntervention, for entry: MoodEntry) -> CopingOutcome {
        let outcome = CopingOutcome(entryID: entry.id, intervention: intervention)
        modelContext.insert(outcome)
        try? modelContext.save()
        return outcome
    }

    func markStarted(_ outcome: CopingOutcome) {
        outcome.startedAt = .now
        try? modelContext.save()
    }

    func markCompleted(_ outcome: CopingOutcome) {
        outcome.completedAt = .now
        try? modelContext.save()
    }

    func recordOutcome(_ outcome: CopingOutcome, helped: Bool) {
        outcome.helped = helped
        outcome.followUpAskedAt = .now
        try? modelContext.save()
    }

    /// Returns the oldest unanswered outcome whose suggestion is at least a
    /// day old — that's the one we ask "did it help?" about.
    func pendingFollowUp(now: Date = .now) -> CopingOutcome? {
        let outcomes = (try? modelContext.fetch(FetchDescriptor<CopingOutcome>())) ?? []
        return outcomes
            .filter { $0.helped == nil && now.timeIntervalSince($0.suggestedAt) >= 24 * 3600 }
            .min(by: { $0.suggestedAt < $1.suggestedAt })
    }
}
