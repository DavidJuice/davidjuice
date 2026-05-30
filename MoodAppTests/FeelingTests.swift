import XCTest
@testable import MoodApp

final class FeelingTests: XCTestCase {
    func testWatchVocabularyIsEight() {
        XCTAssertEqual(Feeling.watchVocabulary.count, 8)
    }

    func testWatchVocabularyIsSubsetOfFullVocabulary() {
        XCTAssertTrue(Set(Feeling.watchVocabulary).isSubset(of: Set(Feeling.allCases)))
    }

    func testFullVocabularyIsTwelve() {
        XCTAssertEqual(Feeling.allCases.count, 12)
    }

    func testAssociatedValenceCoversTheRange() {
        XCTAssertEqual(Feeling.joyful.associatedValence, .veryPleasant)
        XCTAssertEqual(Feeling.calm.associatedValence, .pleasant)
        XCTAssertEqual(Feeling.anxious.associatedValence, .unpleasant)
        XCTAssertEqual(Feeling.sad.associatedValence, .veryUnpleasant)
        XCTAssertEqual(Feeling.tired.associatedValence, .neutral)
    }

    func testSymbolNamesAreDistinct() {
        let names = Feeling.allCases.map(\.symbolName)
        XCTAssertEqual(Set(names).count, names.count)
    }
}
