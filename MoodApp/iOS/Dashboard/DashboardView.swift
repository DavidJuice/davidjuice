import SwiftUI
import SwiftData

struct DashboardView: View {
    var onCheckIn: () -> Void

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \MoodEntry.timestamp, order: .reverse) private var entries: [MoodEntry]
    @Query(sort: \CachedInsight.weekOf, order: .reverse) private var insights: [CachedInsight]
    @Query(sort: \CopingOutcome.suggestedAt, order: .reverse) private var outcomes: [CopingOutcome]
    @Query(sort: \WeeklySummary.weekOf, order: .reverse) private var summaries: [WeeklySummary]

    @State private var range: ChartRange = .week

    private enum ChartRange: Int, CaseIterable, Identifiable {
        case week = 7
        case month = 30
        var id: Int { rawValue }
        var label: String { self == .week ? "7 Days" : "30 Days" }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                checkInCard
                if let pending = pendingFollowUp {
                    cardContainer { CopingFollowUpTile(outcome: pending) }
                }
                summaryCard
                insightCard
                chartCard
                recentList
            }
            .padding()
        }
        .navigationTitle("Today")
        .task(id: entries.count) { refreshInsightIfNeeded() }
        .task(id: entries.count) { await refreshSummaryIfNeeded() }
    }

    @ViewBuilder
    private var summaryCard: some View {
        if #available(iOS 26.0, *), let summary = thisWeekSummary {
            cardContainer { WeeklySummaryTile(summary: summary) }
        }
    }

    private var pendingFollowUp: CopingOutcome? {
        let now = Date.now
        return outcomes.first { outcome in
            outcome.helped == nil && now.timeIntervalSince(outcome.suggestedAt) >= 24 * 3600
        }
    }

    private var thisWeekSummary: WeeklySummary? {
        let calendar = Calendar.current
        let weekOf = calendar.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        return summaries.first { calendar.isDate($0.weekOf, inSameDayAs: weekOf) }
    }

    private var checkInCard: some View {
        Button(action: onCheckIn) {
            HStack(spacing: 14) {
                Image(systemName: latestSymbol)
                    .font(.system(size: 34))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(latestColor)
                VStack(alignment: .leading, spacing: 2) {
                    Text(latestHeadline).font(.headline)
                    Text("Tap to check in").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.tint)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color(.secondarySystemBackground))
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var insightCard: some View {
        if let insight = insights.first {
            cardContainer {
                Label {
                    Text(insight.text).font(.subheadline)
                } icon: {
                    Image(systemName: insight.category.symbolName).foregroundStyle(.tint)
                }
            }
        } else {
            cardContainer {
                Label {
                    Text("Your first weekly insight unlocks at \(InsightEngine.minimumEntries) check-ins — you have \(entries.count).")
                        .font(.subheadline).foregroundStyle(.secondary)
                } icon: {
                    Image(systemName: "lightbulb").foregroundStyle(.secondary)
                }
            }
        }
    }

    private var chartCard: some View {
        cardContainer {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Range", selection: $range) {
                    ForEach(ChartRange.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                if entries.isEmpty {
                    Text("No check-ins yet.")
                        .font(.subheadline).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, minHeight: 160)
                } else {
                    MoodChart(entries: entries, days: range.rawValue)
                }
            }
        }
    }

    @ViewBuilder
    private var recentList: some View {
        if !entries.isEmpty {
            cardContainer {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Recent").font(.headline).padding(.bottom, 8)
                    ForEach(entries.prefix(10)) { entry in
                        EntryRow(entry: entry)
                        if entry.id != entries.prefix(10).last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
    }

    private func cardContainer<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color(.secondarySystemBackground))
            )
    }

    // MARK: - Derived

    private var latestSymbol: String { entries.first?.valence.symbolName ?? "face.smiling" }
    private var latestColor: Color { entries.first?.valence.color ?? .accentColor }
    private var latestHeadline: String {
        guard let latest = entries.first else { return "How are you?" }
        return "Last: \(latest.valence.displayName)"
    }

    /// Generates this week's insight once, when enough data exists and none is cached yet.
    private func refreshInsightIfNeeded() {
        let calendar = Calendar.current
        let weekOf = calendar.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        guard !insights.contains(where: { calendar.isDate($0.weekOf, inSameDayAs: weekOf) }) else { return }
        guard let insight = InsightEngine().makeInsight(from: entries) else { return }
        modelContext.insert(insight)
        try? modelContext.save()
    }

    /// Generates this week's AI summary once, on iOS 26+ with Foundation Models available.
    private func refreshSummaryIfNeeded() async {
        guard #available(iOS 26.0, *) else { return }
        guard entries.count >= InsightEngine.minimumEntries else { return }
        let calendar = Calendar.current
        let weekOf = calendar.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        guard !summaries.contains(where: { calendar.isDate($0.weekOf, inSameDayAs: weekOf) }) else { return }
        let thisWeek = entries.filter { $0.timestamp >= weekOf }
        guard let text = await WeeklySummaryGenerator().summarize(entries: thisWeek, weekOf: weekOf) else { return }
        let summary = WeeklySummary(weekOf: weekOf, text: text)
        modelContext.insert(summary)
        try? modelContext.save()
    }
}

private struct EntryRow: View {
    let entry: MoodEntry

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: entry.valence.symbolName)
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(entry.valence.color)
                .font(.title3)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.feeling?.displayName ?? entry.valence.displayName)
                    .font(.subheadline.weight(.medium))
                Text(entry.timestamp, format: .relative(presentation: .named))
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if let factor = entry.factor {
                Image(systemName: factor.symbolName).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}
