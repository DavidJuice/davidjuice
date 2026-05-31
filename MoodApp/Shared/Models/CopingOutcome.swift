import Foundation
import SwiftData

/// One round of the coping loop: a suggestion was offered, possibly started,
/// possibly completed, and (a day later) the user told us whether it helped.
/// The `helped` answer is the only training signal the recommender needs.
@Model
final class CopingOutcome {
    @Attribute(.unique) var id: UUID
    var entryID: UUID
    var intervention: CopingIntervention
    var suggestedAt: Date
    var startedAt: Date?
    var completedAt: Date?
    var helped: Bool?
    var followUpAskedAt: Date?

    init(
        id: UUID = UUID(),
        entryID: UUID,
        intervention: CopingIntervention,
        suggestedAt: Date = .now
    ) {
        self.id = id
        self.entryID = entryID
        self.intervention = intervention
        self.suggestedAt = suggestedAt
    }
}
