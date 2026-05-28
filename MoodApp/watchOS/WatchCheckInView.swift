import SwiftUI
import SwiftData
import WatchKit

/// The 5-second Watch check-in. The Digital Crown scrubs valence with a haptic
/// tick at every step; "Next" confirms with a success haptic and reveals an
/// optional word picker. No keyboard, no scrolling required.
struct WatchCheckInView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(HealthKitManager.self) private var healthKit
    @Environment(\.dismiss) private var dismiss

    @State private var crownValue: Double = 3
    @State private var valence: Valence = .neutral
    @State private var showFeeling = false
    @State private var isSaving = false
    @FocusState private var crownFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 10) {
                Image(systemName: valence.symbolName)
                    .font(.system(size: 52))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(valence.color)
                    .contentTransition(.symbolEffect(.replace))

                Text(valence.displayName)
                    .font(.headline)
                    .multilineTextAlignment(.center)

                track

                Button {
                    WKInterfaceDevice.current().play(.success)
                    showFeeling = true
                } label: {
                    Text("Next").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(valence.color)
            }
            .padding(.horizontal)
            .focusable()
            .focused($crownFocused)
            .digitalCrownRotation(
                $crownValue,
                from: 1, through: 5, by: 1,
                sensitivity: .low,
                isContinuous: false,
                isHapticFeedbackEnabled: true
            )
            .onChange(of: crownValue) { _, newValue in
                let next = Valence(rawValue: min(5, max(1, Int(newValue.rounded())))) ?? .neutral
                if next != valence {
                    valence = next
                    WKInterfaceDevice.current().play(.click)
                }
            }
            .onAppear { crownFocused = true }
            .navigationDestination(isPresented: $showFeeling) {
                WatchFeelingPicker(valence: valence) { feeling in
                    Task { await save(feeling: feeling) }
                }
            }
        }
    }

    private var track: some View {
        HStack(spacing: 4) {
            ForEach(Valence.allCases) { item in
                Capsule()
                    .fill(item == valence ? item.color : Color.gray.opacity(0.3))
                    .frame(height: item == valence ? 8 : 5)
                    .animation(.snappy, value: valence)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func save(feeling: Feeling?) async {
        guard !isSaving else { return }
        isSaving = true
        let logger = MoodLogger(modelContext: modelContext, healthKit: healthKit)
        await logger.log(valence: valence, feeling: feeling, source: .watch)
        WKInterfaceDevice.current().play(.success)
        dismiss()
    }
}
