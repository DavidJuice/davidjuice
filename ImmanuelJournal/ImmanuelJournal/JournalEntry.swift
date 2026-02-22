import Foundation
import SwiftData

@Model
final class JournalEntry {
    var id: UUID
    var createdAt: Date
    var isFinalized: Bool

    // Step 1: Gratitude
    var gratitude: String
    // Step 2: God's Response
    var godsResponse: String
    // Step 3: Seeing
    var seeing: String
    // Step 4: Hearing
    var hearing: String
    // Step 5: Understanding
    var understanding: String
    // Step 6: Rejoicing
    var rejoicing: String
    // Step 7: Helping
    var helping: String

    init(
        id: UUID = UUID(),
        createdAt: Date = Date(),
        isFinalized: Bool = false,
        gratitude: String = "",
        godsResponse: String = "",
        seeing: String = "",
        hearing: String = "",
        understanding: String = "",
        rejoicing: String = "",
        helping: String = ""
    ) {
        self.id = id
        self.createdAt = createdAt
        self.isFinalized = isFinalized
        self.gratitude = gratitude
        self.godsResponse = godsResponse
        self.seeing = seeing
        self.hearing = hearing
        self.understanding = understanding
        self.rejoicing = rejoicing
        self.helping = helping
    }

    var allStepTexts: [(title: String, subtitle: String, body: String)] {
        [
            ("Step 1 — Gratitude", "I am thankful for…", gratitude),
            ("Step 2 — God's Response", "I sense God responding…", godsResponse),
            ("Step 3 — Seeing", "What is God showing me…", seeing),
            ("Step 4 — Hearing", "What is God saying to me…", hearing),
            ("Step 5 — Understanding", "What is God helping me understand…", understanding),
            ("Step 6 — Rejoicing", "Where is God rejoicing with me…", rejoicing),
            ("Step 7 — Helping", "How is God helping me…", helping)
        ]
    }
}
