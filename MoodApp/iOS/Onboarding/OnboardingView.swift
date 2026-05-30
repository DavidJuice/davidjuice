import SwiftUI

/// Four-screen first-launch flow per the MVP spec. Each step asks for one
/// thing and moves on; users can also swipe between pages.
struct OnboardingView: View {
    var onComplete: () -> Void

    @Environment(HealthKitManager.self) private var healthKit
    @State private var step = 0

    var body: some View {
        TabView(selection: $step) {
            page(
                tag: 0,
                symbol: "sparkles",
                title: "Welcome to Mood",
                body: "Two-tap check-ins. On your wrist or on your phone.",
                button: "Continue",
                action: advance
            )
            page(
                tag: 1,
                symbol: "heart.text.square.fill",
                title: "Connect to Health",
                body: "Mood attaches your sleep, HRV and steps so patterns surface on their own. Your data stays on this device.",
                button: "Connect Health",
                action: {
                    Task {
                        await healthKit.requestAuthorization()
                        advance()
                    }
                }
            )
            page(
                tag: 2,
                symbol: "bell.badge.fill",
                title: "Quiet reminders",
                body: "Two gentle nudges a day, skipped automatically when you're busy or just checked in.",
                button: "Allow Notifications",
                action: {
                    Task {
                        _ = await NotificationScheduler.shared.requestAuthorization()
                        advance()
                    }
                }
            )
            page(
                tag: 3,
                symbol: "checkmark.circle.fill",
                title: "You're set",
                body: "Tap the + on your dashboard whenever you'd like to log how you're feeling.",
                button: "Start",
                action: onComplete
            )
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .indexViewStyle(.page(backgroundDisplayMode: .always))
    }

    private func advance() {
        withAnimation(.snappy) { step = min(step + 1, 3) }
    }

    private func page(
        tag: Int,
        symbol: String,
        title: String,
        body: String,
        button: String,
        action: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: symbol)
                .font(.system(size: 64))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.tint)
            Text(title)
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
            Text(body)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button(action: action) {
                Text(button).frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
        .tag(tag)
    }
}
