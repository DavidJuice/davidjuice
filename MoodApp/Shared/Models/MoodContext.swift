import Foundation

/// Which device captured a check-in. Useful for analytics and for
/// adapting the dashboard ("you log most often from your Watch").
enum MoodSource: String, Codable, CaseIterable, Sendable {
    case iPhone
    case watch
    case widget

    var displayName: String {
        switch self {
        case .iPhone: return "iPhone"
        case .watch:  return "Apple Watch"
        case .widget: return "Widget"
        }
    }
}

/// Coarse time-of-day buckets for pattern detection ("lower in the evenings").
enum TimeOfDayBucket: String, Codable, CaseIterable, Sendable {
    case earlyMorning
    case morning
    case afternoon
    case evening
    case night

    init(from date: Date, calendar: Calendar = .current) {
        switch calendar.component(.hour, from: date) {
        case 5..<9:   self = .earlyMorning
        case 9..<12:  self = .morning
        case 12..<17: self = .afternoon
        case 17..<22: self = .evening
        default:      self = .night
        }
    }

    var displayName: String {
        switch self {
        case .earlyMorning: return "Early Morning"
        case .morning:      return "Morning"
        case .afternoon:    return "Afternoon"
        case .evening:      return "Evening"
        case .night:        return "Night"
        }
    }
}

/// Silent, auto-captured context bundled with every entry. The HealthKit
/// manager (build step 2) and WeatherKit fill these in at log time so the
/// user never types any of it. All fields optional — a Watch log in airplane
/// mode still saves, just with less context.
struct MoodContext: Sendable, Equatable {
    var hrv: Double?               // heart-rate variability (SDNN), milliseconds
    var sleepHours: Double?        // previous night's asleep duration
    var stepCount: Int?            // steps so far today, at log time
    var timeOfDay: TimeOfDayBucket?
    var weekday: Int?              // Calendar convention: 1 = Sunday ... 7 = Saturday
    var weatherCondition: String?
    var temperatureCelsius: Double?

    init(
        hrv: Double? = nil,
        sleepHours: Double? = nil,
        stepCount: Int? = nil,
        timeOfDay: TimeOfDayBucket? = nil,
        weekday: Int? = nil,
        weatherCondition: String? = nil,
        temperatureCelsius: Double? = nil
    ) {
        self.hrv = hrv
        self.sleepHours = sleepHours
        self.stepCount = stepCount
        self.timeOfDay = timeOfDay
        self.weekday = weekday
        self.weatherCondition = weatherCondition
        self.temperatureCelsius = temperatureCelsius
    }
}
