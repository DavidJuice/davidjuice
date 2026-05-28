import SwiftUI

/// Optional second step on the Watch: pick one of the 8 Watch-vocabulary words,
/// ordered by closeness to the chosen valence, or skip. Any tap saves and exits.
struct WatchFeelingPicker: View {
    let valence: Valence
    let onSelect: (Feeling?) -> Void

    var body: some View {
        List {
            Button {
                onSelect(nil)
            } label: {
                Label("Skip", systemImage: "checkmark.circle.fill")
            }

            ForEach(orderedFeelings) { feeling in
                Button {
                    onSelect(feeling)
                } label: {
                    Label(feeling.displayName, systemImage: feeling.symbolName)
                }
            }
        }
        .navigationTitle("Name it")
    }

    private var orderedFeelings: [Feeling] {
        Feeling.watchVocabulary.sorted {
            abs($0.associatedValence.rawValue - valence.rawValue)
                < abs($1.associatedValence.rawValue - valence.rawValue)
        }
    }
}
