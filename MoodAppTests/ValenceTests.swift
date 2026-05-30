import XCTest
@testable import MoodApp

final class ValenceTests: XCTestCase {
    func testHealthKitValuesAreEvenlySpaced() {
        XCTAssertEqual(Valence.veryUnpleasant.healthKitValue, -1.0, accuracy: 0.001)
        XCTAssertEqual(Valence.unpleasant.healthKitValue,     -0.5, accuracy: 0.001)
        XCTAssertEqual(Valence.neutral.healthKitValue,         0.0, accuracy: 0.001)
        XCTAssertEqual(Valence.pleasant.healthKitValue,        0.5, accuracy: 0.001)
        XCTAssertEqual(Valence.veryPleasant.healthKitValue,    1.0, accuracy: 0.001)
    }

    func testInitFromHealthKitValueIsInverseOnExactStops() {
        for valence in Valence.allCases {
            XCTAssertEqual(Valence(healthKitValue: valence.healthKitValue), valence)
        }
    }

    func testInitFromHealthKitValueBucketsAtBoundaries() {
        XCTAssertEqual(Valence(healthKitValue: -0.76), .veryUnpleasant)
        XCTAssertEqual(Valence(healthKitValue: -0.74), .unpleasant)
        XCTAssertEqual(Valence(healthKitValue: -0.26), .unpleasant)
        XCTAssertEqual(Valence(healthKitValue: -0.24), .neutral)
        XCTAssertEqual(Valence(healthKitValue:  0.24), .neutral)
        XCTAssertEqual(Valence(healthKitValue:  0.26), .pleasant)
        XCTAssertEqual(Valence(healthKitValue:  0.74), .pleasant)
        XCTAssertEqual(Valence(healthKitValue:  0.76), .veryPleasant)
    }

    func testColorAndSymbolNamesAreDistinct() {
        XCTAssertEqual(Set(Valence.allCases.map(\.colorName)).count, Valence.allCases.count)
        XCTAssertEqual(Set(Valence.allCases.map(\.symbolName)).count, Valence.allCases.count)
    }

    func testCaseCount() {
        XCTAssertEqual(Valence.allCases.count, 5)
    }
}
