import SwiftUI
import Charts

/// Daily-average valence line over a rolling window. Empty days are simply
/// absent — the line connects what exists rather than implying zero.
struct MoodChart: View {
    let entries: [MoodEntry]
    let days: Int

    private var points: [DailyValence] {
        DailyValence.series(from: entries, days: days)
    }

    var body: some View {
        Chart(points) { point in
            LineMark(
                x: .value("Day", point.day, unit: .day),
                y: .value("Mood", point.average)
            )
            .interpolationMethod(.catmullRom)
            .foregroundStyle(.tint)

            PointMark(
                x: .value("Day", point.day, unit: .day),
                y: .value("Mood", point.average)
            )
            .foregroundStyle(Valence(rawValue: Int(point.average.rounded()))?.color ?? .accentColor)
        }
        .chartYScale(domain: 1...5)
        .chartYAxis {
            AxisMarks(values: [1, 2, 3, 4, 5]) { value in
                AxisGridLine()
                AxisValueLabel {
                    if let raw = value.as(Int.self), let v = Valence(rawValue: raw) {
                        Image(systemName: v.symbolName)
                            .foregroundStyle(v.color)
                    }
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: max(1, days / 5))) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated).day())
            }
        }
        .frame(height: 200)
    }
}

struct DailyValence: Identifiable {
    let id = UUID()
    let day: Date
    let average: Double

    static func series(from entries: [MoodEntry], days: Int, calendar: Calendar = .current, now: Date = .now) -> [DailyValence] {
        let cutoff = calendar.date(byAdding: .day, value: -days, to: calendar.startOfDay(for: now)) ?? now
        let recent = entries.filter { $0.timestamp >= cutoff }
        let byDay = Dictionary(grouping: recent) { calendar.startOfDay(for: $0.timestamp) }
        return byDay
            .map { day, items in
                let avg = items.reduce(0.0) { $0 + Double($1.valence.rawValue) } / Double(items.count)
                return DailyValence(day: day, average: avg)
            }
            .sorted { $0.day < $1.day }
    }
}
