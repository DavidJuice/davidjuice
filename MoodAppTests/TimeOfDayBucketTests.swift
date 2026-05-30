import XCTest
@testable import MoodApp

final class TimeOfDayBucketTests: XCTestCase {
    private func bucket(at hour: Int) -> TimeOfDayBucket {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = calendar.date(from: DateComponents(year: 2025, month: 6, day: 15, hour: hour))!
        return TimeOfDayBucket(from: date, calendar: calendar)
    }

    func testEarlyMorningRange() {
        XCTAssertEqual(bucket(at: 5), .earlyMorning)
        XCTAssertEqual(bucket(at: 8), .earlyMorning)
    }

    func testMorningRange() {
        XCTAssertEqual(bucket(at: 9), .morning)
        XCTAssertEqual(bucket(at: 11), .morning)
    }

    func testAfternoonRange() {
        XCTAssertEqual(bucket(at: 12), .afternoon)
        XCTAssertEqual(bucket(at: 16), .afternoon)
    }

    func testEveningRange() {
        XCTAssertEqual(bucket(at: 17), .evening)
        XCTAssertEqual(bucket(at: 21), .evening)
    }

    func testNightWrapsAroundMidnight() {
        XCTAssertEqual(bucket(at: 22), .night)
        XCTAssertEqual(bucket(at: 0), .night)
        XCTAssertEqual(bucket(at: 4), .night)
    }
}
