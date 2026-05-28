import SwiftUI

struct SelectableChip: View {
    let title: String
    let systemImage: String
    let isSelected: Bool
    var tint: Color = .accentColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(
                    Capsule().fill(isSelected ? tint.opacity(0.22) : Color(.secondarySystemBackground))
                )
                .overlay(Capsule().strokeBorder(tint, lineWidth: isSelected ? 1.5 : 0))
                .foregroundStyle(isSelected ? tint : .primary)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : .isButton)
    }
}
