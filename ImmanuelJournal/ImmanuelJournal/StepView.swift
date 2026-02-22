import SwiftUI

struct StepView: View {
    let step: JournalStep
    @Binding var text: String
    @FocusState private var isFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Step header
                VStack(alignment: .leading, spacing: 8) {
                    Text(step.subtitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                        .tracking(1)

                    HStack(spacing: 12) {
                        Image(systemName: step.icon)
                            .font(.title2)
                            .foregroundStyle(.accent)
                            .frame(width: 36, height: 36)

                        Text(step.title)
                            .font(.title)
                            .fontWeight(.bold)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Prompt card
                VStack(alignment: .leading, spacing: 12) {
                    Text(step.prompt)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineSpacing(4)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemGray6))
                )
                .padding(.horizontal)

                // Text editor card
                VStack(alignment: .leading, spacing: 8) {
                    TextEditor(text: $text)
                        .focused($isFocused)
                        .frame(minHeight: 200)
                        .scrollContentBackground(.hidden)
                        .font(.body)
                        .lineSpacing(6)
                        .padding(4)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemBackground))
                        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isFocused ? Color.accentColor.opacity(0.4) : Color(.systemGray4), lineWidth: 1)
                )
                .padding(.horizontal)

                // Placeholder hint
                if text.isEmpty {
                    Text("Tap to begin writing…")
                        .font(.callout)
                        .foregroundStyle(.tertiary)
                        .padding(.horizontal, 32)
                }

                Spacer(minLength: 100)
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }
}
