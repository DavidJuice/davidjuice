import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// On-device weekly summary writer. Uses Apple's Foundation Models framework
/// (iOS 26+) — the only path to direct on-device LLM access from a third-party
/// app that satisfies the spec's "no backend, on-device AI" constraint.
///
/// Pre-iOS 26 devices simply get no summary tile; the statistical
/// `InsightEngine` insight on the dashboard already covers the same surface.
@available(iOS 26.0, *)
struct WeeklySummaryGenerator {

    func summarize(entries: [MoodEntry], weekOf: Date) async -> String? {
        #if canImport(FoundationModels)
        switch SystemLanguageModel.default.availability {
        case .available:
            break
        default:
            return nil
        }

        let session = LanguageModelSession(instructions: instructions)
        let prompt = encodeWeek(entries: entries, weekOf: weekOf)
        do {
            let response = try await session.respond(to: prompt)
            return response.content.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            return nil
        }
        #else
        return nil
        #endif
    }

    private var instructions: String {
        """
        You write a brief weekly mood recap in second person — 2 sentences,
        warm and specific, never clinical, never diagnostic. Refer only to
        what's in the data. If something stands out (a sleep correlation,
        a worse day, an upswing) name it concretely.
        """
    }

    private func encodeWeek(entries: [MoodEntry], weekOf: Date) -> String {
        let count = entries.count
        guard count > 0 else { return "No check-ins this week." }
        let avg = entries.reduce(0.0) { $0 + Double($1.valence.rawValue) } / Double(count)
        let feelings = entries.compactMap(\.feeling?.displayName)
        let topFeeling = Self.mostCommon(feelings)
        let factors = entries.compactMap(\.factor?.displayName)
        let topFactor = Self.mostCommon(factors)
        let sleepSamples = entries.compactMap(\.sleepHours)
        let avgSleep = sleepSamples.isEmpty ? nil : sleepSamples.reduce(0, +) / Double(sleepSamples.count)

        var lines: [String] = []
        lines.append("Check-ins: \(count)")
        lines.append("Average valence (1–5): \(String(format: "%.1f", avg))")
        if let topFeeling { lines.append("Most common feeling: \(topFeeling)") }
        if let topFactor { lines.append("Most common factor: \(topFactor)") }
        if let avgSleep { lines.append("Average sleep: \(String(format: "%.1f", avgSleep))h") }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        lines.append("Week of: \(formatter.string(from: weekOf))")
        return lines.joined(separator: "\n")
    }

    private static func mostCommon(_ values: [String]) -> String? {
        guard !values.isEmpty else { return nil }
        let counts = Dictionary(grouping: values, by: { $0 }).mapValues(\.count)
        return counts.max(by: { $0.value < $1.value })?.key
    }
}
