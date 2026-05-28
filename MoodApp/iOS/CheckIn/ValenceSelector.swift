import SwiftUI

/// The 5-stop valence picker. One tap selects; this is the only required
/// input, so a tap here plus "Save" is the whole fast path.
struct ValenceSelector: View {
    @Binding var selection: Valence?

    var body: some View {
        HStack(spacing: 10) {
            ForEach(Valence.allCases) { valence in
                Button {
                    withAnimation(.snappy) { selection = valence }
                } label: {
                    Image(systemName: valence.symbolName)
                        .font(.system(size: 28))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(valence.color)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(valence.color.opacity(selection == valence ? 0.22 : 0.08))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(valence.color, lineWidth: selection == valence ? 2 : 0)
                        )
                        .scaleEffect(selection == valence ? 1.06 : 1)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(valence.displayName)
                .accessibilityAddTraits(selection == valence ? [.isSelected, .isButton] : .isButton)
            }
        }
    }
}
