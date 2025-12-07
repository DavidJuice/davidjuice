import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

// Time period enum for filtering
enum TimePeriod: String, CaseIterable {
    case today = "Today"
    case oneWeek = "1 Week"
    case twoWeeks = "2 Weeks"
    case oneMonth = "1 Month"
    case threeMonths = "3 Months"
    case sixMonths = "6 Months"
    case oneYear = "1 Year"
    case moreThanYear = ">1 Year"

    var days: Int {
        switch self {
        case .today: return 1
        case .oneWeek: return 7
        case .twoWeeks: return 14
        case .oneMonth: return 30
        case .threeMonths: return 90
        case .sixMonths: return 180
        case .oneYear: return 365
        case .moreThanYear: return 730 // 2 years of data
        }
    }

    var dateRange: DateInterval {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate)!
        return DateInterval(start: startDate, end: endDate)
    }
}

// Model for individual app usage
struct AppUsage: Identifiable {
    let id = UUID()
    let appName: String
    let bundleIdentifier: String
    let totalTime: TimeInterval
    let iconData: Data?

    var formattedTime: String {
        let hours = Int(totalTime) / 3600
        let minutes = Int(totalTime) % 3600 / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}

// Model for usage statistics
struct UsageStatistics {
    var apps: [AppUsage]
    var totalScreenTime: TimeInterval
    var period: TimePeriod

    var formattedTotalTime: String {
        let hours = Int(totalScreenTime) / 3600
        let minutes = Int(totalScreenTime) % 3600 / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}
