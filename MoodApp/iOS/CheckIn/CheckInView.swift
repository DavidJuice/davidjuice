import SwiftUI
import SwiftData

/// The iPhone check-in. Valence is the only required step; feeling, factor and
/// note progressively reveal once a valence is chosen, keeping the fast path to
/// two taps (valence → Save).
struct CheckInView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(HealthKitManager.self) private var healthKit
    @Environment(WeatherProvider.self) private var weather

    @State private var model = CheckInModel()
    @FocusState private var noteFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    valenceSection
                    if model.valence != nil {
                        feelingSection
                        factorSection
                        noteSection
                    }
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("How are you?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .fontWeight(.semibold)
                        .disabled(!model.canSave || model.isSaving)
                }
            }
            .animation(.snappy, value: model.valence)
        }
    }

    private var valenceSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("Right now")
            ValenceSelector(selection: $model.valence)
        }
    }

    private var feelingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("Name it", subtitle: "Optional")
            FlowLayout(spacing: 8) {
                ForEach(model.orderedFeelings) { feeling in
                    SelectableChip(
                        title: feeling.displayName,
                        systemImage: feeling.symbolName,
                        isSelected: model.feeling == feeling,
                        tint: (model.valence ?? .neutral).color
                    ) {
                        withAnimation(.snappy) { model.toggleFeeling(feeling) }
                    }
                }
            }
        }
    }

    private var factorSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("What's affecting it?", subtitle: "Optional")
            FlowLayout(spacing: 8) {
                ForEach(MoodFactor.allCases) { factor in
                    SelectableChip(
                        title: factor.displayName,
                        systemImage: factor.symbolName,
                        isSelected: model.factor == factor,
                        tint: (model.valence ?? .neutral).color
                    ) {
                        withAnimation(.snappy) { model.toggleFactor(factor) }
                    }
                }
            }
        }
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("Add a note", subtitle: "Optional")
            TextField("Anything on your mind?", text: $model.note, axis: .vertical)
                .lineLimit(3...6)
                .focused($noteFocused)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(.secondarySystemBackground))
                )
        }
    }

    private func sectionHeader(_ title: String, subtitle: String? = nil) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.headline)
            if let subtitle {
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }

    private func save() async {
        let logger = MoodLogger(modelContext: modelContext, healthKit: healthKit, weather: weather)
        await model.save(using: logger)
        dismiss()
    }
}
