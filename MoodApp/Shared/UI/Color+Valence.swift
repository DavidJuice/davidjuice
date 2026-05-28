import SwiftUI

extension Valence {
    /// Resolves the named color authored in Assets.xcassets (build step 7).
    var color: Color { Color(colorName, bundle: .main) }
}
