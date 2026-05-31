import SwiftUI

/// Dashboard card showing this week's AI-generated summary. Renders only when
/// (a) we're on iOS 26+ with Foundation Models available and (b) a cached
/// summary exists; otherwise the dashboard's statistical insight tile carries
/// the same job.
struct WeeklySummaryTile: View {
    let summary: WeeklySummary

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("This week", systemImage: "sparkles")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tint)
            Text(summary.text)
                .font(.subheadline)
        }
    }
}
