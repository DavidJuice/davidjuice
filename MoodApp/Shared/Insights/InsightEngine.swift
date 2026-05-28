import Foundation

/// Derives the single strongest weekly pattern from a user's entries, entirely
/// on device. This is the deterministic feature layer the spec's Core ML model
/// will later refine; it already satisfies the on-device / no-backend constraint
/// and produces the one plain-language insight the dashboard surfaces per week.
struct InsightEngine {
    static let minimumEntries = 14

    /// Minimum gap on the 1–5 scale before a pattern is worth surfacing.
    private static let meaningfulGap = 0.6
    private static let minimumGroupSize = 3

    private struct Candidate {
        let strength: Double
        let text: String
        let category: InsightCategory
    }

    func makeInsight(from entries: [MoodEntry], now: Date = .now, calendar: Calendar = .current) -> CachedInsight? {
        guard entries.count >= Self.minimumEntries else { return nil }
        let candidates = [
            sleepCandidate(entries),
            weekdayCandidate(entries, calendar: calendar),
            timeOfDayCandidate(entries),
        ].compactMap { $0 }

        guard let best = candidates.max(by: { $0.strength < $1.strength }) else { return nil }
        let weekOf = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
        return CachedInsight(weekOf: weekOf, text: best.text, category: best.category)
    }

    // MARK: - Candidates

    private func sleepCandidate(_ entries: [MoodEntry]) -> Candidate? {
        let withSleep = entries.filter { $0.sleepHours != nil }
        let short = withSleep.filter { ($0.sleepHours ?? 0) < 6 }
        let rested = withSleep.filter { ($0.sleepHours ?? 0) >= 6 }
        guard short.count >= Self.minimumGroupSize, rested.count >= Self.minimumGroupSize else { return nil }

        let shortMean = mean(short)
        let restedMean = mean(rested)
        let gap = restedMean - shortMean
        guard gap >= Self.meaningfulGap else { return nil }

        return Candidate(
            strength: gap,
            text: "After fewer than 6 hours of sleep your mood averages \(format(shortMean)) out of 5 — versus \(format(restedMean)) when you sleep more.",
            category: .sleepCorrelation
        )
    }

    private func weekdayCandidate(_ entries: [MoodEntry], calendar: Calendar) -> Candidate? {
        let groups = Dictionary(grouping: entries, by: \.weekday)
        let overall = mean(entries)
        guard let (weekday, group) = groups
            .filter({ $0.value.count >= 2 })
            .min(by: { mean($0.value) < mean($1.value) }) else { return nil }

        let gap = overall - mean(group)
        guard gap >= Self.meaningfulGap else { return nil }

        return Candidate(
            strength: gap,
            text: "Your mood tends to dip on \(weekdayName(weekday, calendar: calendar))s.",
            category: .dayOfWeekPattern
        )
    }

    private func timeOfDayCandidate(_ entries: [MoodEntry]) -> Candidate? {
        let groups = Dictionary(grouping: entries, by: \.timeOfDay)
        let overall = mean(entries)
        guard let (bucket, group) = groups
            .filter({ $0.value.count >= 2 })
            .min(by: { mean($0.value) < mean($1.value) }) else { return nil }

        let gap = overall - mean(group)
        guard gap >= Self.meaningfulGap else { return nil }

        return Candidate(
            strength: gap,
            text: "Your \(bucket.displayName.lowercased()) check-ins skew lower than the rest of your day.",
            category: .timeOfDayPattern
        )
    }

    // MARK: - Helpers

    private func mean(_ entries: [MoodEntry]) -> Double {
        guard !entries.isEmpty else { return 0 }
        return entries.reduce(0.0) { $0 + Double($1.valence.rawValue) } / Double(entries.count)
    }

    private func format(_ value: Double) -> String {
        String(format: "%.1f", value)
    }

    private func weekdayName(_ weekday: Int, calendar: Calendar) -> String {
        var formatterCalendar = calendar
        formatterCalendar.locale = .current
        let symbols = formatterCalendar.weekdaySymbols
        let index = weekday - 1
        return symbols.indices.contains(index) ? symbols[index] : "that day"
    }
}
