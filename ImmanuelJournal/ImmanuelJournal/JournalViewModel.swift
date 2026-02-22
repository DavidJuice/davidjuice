import Foundation
import SwiftData
import SwiftUI

struct JournalStep: Identifiable {
    let id: Int
    let title: String
    let subtitle: String
    let prompt: String
    let icon: String
}

@Observable
final class JournalViewModel {
    var currentStep: Int = 0
    var currentDraft: JournalEntry?
    var showCompletionAlert: Bool = false

    static let steps: [JournalStep] = [
        JournalStep(
            id: 0,
            title: "Gratitude",
            subtitle: "Step 1 of 7",
            prompt: "Begin by reflecting on a recent moment where you felt thankful. What are you grateful for today?",
            icon: "heart.fill"
        ),
        JournalStep(
            id: 1,
            title: "God's Response",
            subtitle: "Step 2 of 7",
            prompt: "As you shared your gratitude, how do you sense God responding to you? What might He be saying about that moment?",
            icon: "bubble.left.fill"
        ),
        JournalStep(
            id: 2,
            title: "Seeing",
            subtitle: "Step 3 of 7 — Connection",
            prompt: "Ask God: \"What are You showing me right now?\" Write what comes to mind — images, memories, or impressions.",
            icon: "eye.fill"
        ),
        JournalStep(
            id: 3,
            title: "Hearing",
            subtitle: "Step 4 of 7 — Connection",
            prompt: "Ask God: \"What are You saying to me?\" Listen quietly and write what you sense Him speaking to your heart.",
            icon: "ear.fill"
        ),
        JournalStep(
            id: 4,
            title: "Understanding",
            subtitle: "Step 5 of 7 — Connection",
            prompt: "Ask God: \"What are You helping me understand?\" Reflect on any new clarity or insight that comes to you.",
            icon: "lightbulb.fill"
        ),
        JournalStep(
            id: 5,
            title: "Rejoicing",
            subtitle: "Step 6 of 7 — Presence",
            prompt: "Ask God: \"Where are You rejoicing with me?\" Sense the joy God has over you and this moment.",
            icon: "sun.max.fill"
        ),
        JournalStep(
            id: 6,
            title: "Helping",
            subtitle: "Step 7 of 7 — Presence",
            prompt: "Ask God: \"How are You helping me?\" Reflect on how God's presence brings comfort, direction, or strength.",
            icon: "hands.sparkles.fill"
        )
    ]

    var currentStepInfo: JournalStep {
        Self.steps[currentStep]
    }

    var isFirstStep: Bool {
        currentStep == 0
    }

    var isLastStep: Bool {
        currentStep == Self.steps.count - 1
    }

    var progress: Double {
        Double(currentStep + 1) / Double(Self.steps.count)
    }

    func textBinding(for step: Int, entry: JournalEntry) -> Binding<String> {
        Binding<String>(
            get: {
                switch step {
                case 0: return entry.gratitude
                case 1: return entry.godsResponse
                case 2: return entry.seeing
                case 3: return entry.hearing
                case 4: return entry.understanding
                case 5: return entry.rejoicing
                case 6: return entry.helping
                default: return ""
                }
            },
            set: { newValue in
                switch step {
                case 0: entry.gratitude = newValue
                case 1: entry.godsResponse = newValue
                case 2: entry.seeing = newValue
                case 3: entry.hearing = newValue
                case 4: entry.understanding = newValue
                case 5: entry.rejoicing = newValue
                case 6: entry.helping = newValue
                default: break
                }
            }
        )
    }

    func nextStep() {
        guard currentStep < Self.steps.count - 1 else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep += 1
        }
    }

    func previousStep() {
        guard currentStep > 0 else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep -= 1
        }
    }

    func ensureDraft(context: ModelContext) {
        guard currentDraft == nil else { return }
        // Look for existing unfinalized draft
        let descriptor = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { !$0.isFinalized },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        if let existing = try? context.fetch(descriptor).first {
            currentDraft = existing
        } else {
            let newEntry = JournalEntry()
            context.insert(newEntry)
            currentDraft = newEntry
        }
    }

    func finalize(context: ModelContext) {
        guard let draft = currentDraft else { return }
        draft.isFinalized = true
        draft.createdAt = Date()
        try? context.save()
        currentDraft = nil
        currentStep = 0
        showCompletionAlert = true
        // Create a fresh draft for next time
        let newEntry = JournalEntry()
        context.insert(newEntry)
        currentDraft = newEntry
    }

    func startNewEntry(context: ModelContext) {
        currentDraft = nil
        currentStep = 0
        ensureDraft(context: context)
    }
}
