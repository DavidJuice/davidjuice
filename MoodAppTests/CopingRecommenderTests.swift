import XCTest
import SwiftData
@testable import MoodApp

@MainActor
final class CopingRecommenderTests: XCTestCase {
    private func makeContext() -> ModelContext {
        MoodDataStore.makeInMemoryContainer().mainContext
    }

    func testDefaultRecommendationIsBoxBreathing() {
        let recommender = CopingRecommender(modelContext: makeContext())
        XCTAssertEqual(recommender.recommend(), .boxBreathing)
    }

    func testRecommendsBestPerformer() {
        let context = makeContext()
        let entry = MoodEntry(valence: .unpleasant, source: .iPhone)
        context.insert(entry)
        let recommender = CopingRecommender(modelContext: context)

        // gratitude: 3 of 3 helped → score 4/5 = 0.8
        for _ in 0..<3 {
            let o = recommender.suggest(.gratitude, for: entry)
            recommender.recordOutcome(o, helped: true)
        }
        // boxBreathing: 1 of 3 helped → score 2/5 = 0.4
        for i in 0..<3 {
            let o = recommender.suggest(.boxBreathing, for: entry)
            recommender.recordOutcome(o, helped: i == 0)
        }

        XCTAssertEqual(recommender.recommend(), .gratitude)
    }

    func testPendingFollowUpAppearsAfterADay() {
        let context = makeContext()
        let entry = MoodEntry(valence: .unpleasant, source: .iPhone)
        context.insert(entry)
        let recommender = CopingRecommender(modelContext: context)

        let outcome = recommender.suggest(.boxBreathing, for: entry)
        outcome.suggestedAt = Date.now.addingTimeInterval(-25 * 3600)

        XCTAssertNotNil(recommender.pendingFollowUp())
        recommender.recordOutcome(outcome, helped: true)
        XCTAssertNil(recommender.pendingFollowUp())
    }

    func testRecentSuggestionIsNotYetEligibleForFollowUp() {
        let context = makeContext()
        let entry = MoodEntry(valence: .unpleasant, source: .iPhone)
        context.insert(entry)
        let recommender = CopingRecommender(modelContext: context)

        _ = recommender.suggest(.boxBreathing, for: entry)
        XCTAssertNil(recommender.pendingFollowUp())
    }
}
