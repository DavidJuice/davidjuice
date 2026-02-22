import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
        TabView {
            NewJournalView()
                .tabItem {
                    Label("New Journal", systemImage: "pencil.and.scribble")
                }

            HistoryView()
                .tabItem {
                    Label("My History", systemImage: "book.fill")
                }
        }
        .tint(.accentColor)
    }
}

struct NewJournalView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = JournalViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress bar
                ProgressView(value: viewModel.progress)
                    .tint(.accentColor)
                    .padding(.horizontal)
                    .padding(.top, 8)

                // Step content
                if let draft = viewModel.currentDraft {
                    StepView(
                        step: viewModel.currentStepInfo,
                        text: viewModel.textBinding(for: viewModel.currentStep, entry: draft)
                    )
                    .id(viewModel.currentStep)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                } else {
                    Spacer()
                    ProgressView()
                    Spacer()
                }

                // Navigation buttons
                HStack(spacing: 16) {
                    if !viewModel.isFirstStep {
                        Button {
                            viewModel.previousStep()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .font(.body.weight(.medium))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color(.systemGray6))
                            )
                        }
                    }

                    Spacer()

                    if viewModel.isLastStep {
                        Button {
                            viewModel.finalize(context: modelContext)
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Finish & Save")
                            }
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.accentColor)
                                    .shadow(color: .accentColor.opacity(0.3), radius: 6, y: 3)
                            )
                        }
                    } else {
                        Button {
                            viewModel.nextStep()
                        } label: {
                            HStack(spacing: 6) {
                                Text("Next")
                                Image(systemName: "chevron.right")
                            }
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.accentColor)
                                    .shadow(color: .accentColor.opacity(0.3), radius: 6, y: 3)
                            )
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
                .background(
                    Rectangle()
                        .fill(.ultraThinMaterial)
                        .ignoresSafeArea(edges: .bottom)
                )
            }
            .navigationTitle("Immanuel Journal")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                viewModel.ensureDraft(context: modelContext)
            }
            .alert("Journal Saved", isPresented: $viewModel.showCompletionAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Your journal entry has been saved. You can view it in the History tab.")
            }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: JournalEntry.self, inMemory: true)
}
