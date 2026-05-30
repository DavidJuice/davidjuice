import XCTest
@testable import MoodApp

final class InsightEngineTests: XCTestCase {
    private let engine = InsightEngine()

    func testReturnsNilBelowMinimumEntries() {
        let entries = (0..<13).map { _ in MoodEntry(valence: .neutral, source: .iPhone) }
        XCTAssertNil(engine.makeInsight(from: entries))
    }

    func testReturnsNilWhenAllEntriesAreSimilar() {
        let entries = (0..<20).map { _ in MoodEntry(valence: .neutral, source: .iPhone) }
        XCTAssertNil(engine.makeInsight(from: entries))
    }

    func testDetectsSleepCorrelation() {
        let shortNights = (0..<7).map { _ in
            MoodEntry(valence: .unpleasant, source: .iPhone, context: MoodContext(sleepHours: 5))
        }
        let restedNights = (0..<7).map { _ in
            MoodEntry(valence: .pleasant, source: .iPhone, context: MoodContext(sleepHours: 8))
        }

        let insight = engine.makeInsight(from: shortNights + restedNights)
        XCTAssertNotNil(insight)
        XCTAssertEqual(insight?.category, .sleepCorrelation)
        XCTAssertTrue(insight?.text.contains("6 hours") ?? false)
    }

    func testDetectsWeekdayPattern() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let monday = calendar.date(from: DateComponents(year: 2025, month: 1, day: 6, hour: 9))!
        let tuesday = calendar.date(byAdding: .day, value: 1, to: monday)!

        var entries: [MoodEntry] = []
        for _ in 0..<5 {
            entries.append(MoodEntry(
                timestamp: monday,
                valence: .veryUnpleasant,
                source: .iPhone,
                context: MoodContext(weekday: 2)
            ))
        }
        for _ in 0..<10 {
            entries.append(MoodEntry(
                timestamp: tuesday,
                valence: .pleasant,
                source: .iPhone,
                context: MoodContext(weekday: 3)
            ))
        }

        let insight = engine.makeInsight(from: entries)
        XCTAssertNotNil(insight)
        // With no sleep data and constant time-of-day, only the weekday signal qualifies.
        XCTAssertEqual(insight?.category, .dayOfWeekPattern)
    }

    func testPicksStrongestSignal() {
        // Sleep gap is enormous (4-point); weekday gap is modest. Sleep should win.
        var entries: [MoodEntry] = []
        for _ in 0..<7 {
            entries.append(MoodEntry(
                valence: .veryUnpleasant,
                source: .iPhone,
                context: MoodContext(sleepHours: 4, weekday: 2)
            ))
        }
        for _ in 0..<7 {
            entries.append(MoodEntry(
                valence: .veryPleasant,
                source: .iPhone,
                context: MoodContext(sleepHours: 9, weekday: 3)
            ))
        }

        XCTAssertEqual(engine.makeInsight(from: entries)?.category, .sleepCorrelation)
    }
}
