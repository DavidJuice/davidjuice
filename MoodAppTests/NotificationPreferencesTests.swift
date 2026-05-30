import XCTest
@testable import MoodApp

final class NotificationPreferencesTests: XCTestCase {
    func testDefaults() {
        let prefs = NotificationPreferences()
        XCTAssertTrue(prefs.enabled)
        XCTAssertEqual(prefs.morningHour, 9)
        XCTAssertEqual(prefs.morningMinute, 0)
        XCTAssertEqual(prefs.eveningHour, 20)
        XCTAssertEqual(prefs.eveningMinute, 0)
    }

    func testInitFromMinutesSinceMidnight() {
        let prefs = NotificationPreferences(
            enabled: true,
            morningMinutes: 9 * 60 + 30,
            eveningMinutes: 20 * 60 + 45
        )
        XCTAssertEqual(prefs.morningHour, 9)
        XCTAssertEqual(prefs.morningMinute, 30)
        XCTAssertEqual(prefs.eveningHour, 20)
        XCTAssertEqual(prefs.eveningMinute, 45)
    }

    func testHandlesMidnight() {
        let prefs = NotificationPreferences(enabled: false, morningMinutes: 0, eveningMinutes: 23 * 60 + 59)
        XCTAssertEqual(prefs.morningHour, 0)
        XCTAssertEqual(prefs.morningMinute, 0)
        XCTAssertEqual(prefs.eveningHour, 23)
        XCTAssertEqual(prefs.eveningMinute, 59)
        XCTAssertFalse(prefs.enabled)
    }
}
