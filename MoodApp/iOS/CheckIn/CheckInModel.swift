import SwiftUI
import Observation

@MainActor
@Observable
final class CheckInModel {
    var valence: Valence?
    var feeling: Feeling?
    var factor: MoodFactor?
    var note: String = ""
    var isSaving = false

    var canSave: Bool { valence != nil }

    /// Orders the vocabulary so words near the chosen valence surface first —
    /// the likely word is usually within the first few.
    var orderedFeelings: [Feeling] {
        guard let valence else { return Feeling.allCases }
        return Feeling.allCases.sorted {
            abs($0.associatedValence.rawValue - valence.rawValue)
                < abs($1.associatedValence.rawValue - valence.rawValue)
        }
    }

    func toggleFeeling(_ feeling: Feeling) {
        self.feeling = (self.feeling == feeling) ? nil : feeling
    }

    func toggleFactor(_ factor: MoodFactor) {
        self.factor = (self.factor == factor) ? nil : factor
    }

    func save(using logger: MoodLogger) async {
        guard let valence else { return }
        isSaving = true
        await logger.log(
            valence: valence,
            feeling: feeling,
            factor: factor,
            note: note,
            source: .iPhone
        )
        isSaving = false
    }
}
