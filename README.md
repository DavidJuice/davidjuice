# App Usage Tracker for iPhone

A native iOS app that tracks and displays app usage statistics across different time periods.

## Features

- **Comprehensive Time Period Tracking**: View app usage for:
  - Today
  - 1 Week
  - 2 Weeks
  - 1 Month
  - 3 Months
  - 6 Months
  - 1 Year
  - More than 1 Year

- **Visual Statistics**:
  - Total screen time summary
  - Per-app usage breakdown
  - Usage percentage bars
  - Clean, modern SwiftUI interface

- **Privacy-Focused**: Uses Apple's Screen Time API with proper authorization

## Requirements

- iOS 16.0 or later
- Xcode 15.0 or later
- iPhone or iPad

## Setup Instructions

### 1. Open the Project

```bash
cd AppUsageTracker
open AppUsageTracker.xcodeproj
```

### 2. Configure Signing

1. In Xcode, select the **AppUsageTracker** project in the navigator
2. Select the **AppUsageTracker** target
3. Go to **Signing & Capabilities** tab
4. Select your **Team** from the dropdown
5. Xcode will automatically manage provisioning profiles

### 3. Enable Family Controls Capability

The Family Controls entitlement is already configured in `AppUsageTracker.entitlements`. However, you need to:

1. In the **Signing & Capabilities** tab, ensure **Family Controls** capability is present
2. If not, click **+ Capability** and add **Family Controls**

### 4. Build and Run

1. Select your target device (iPhone or simulator running iOS 16+)
2. Press **Cmd + R** or click the **Run** button
3. The app will build and launch on your device

## First Launch

When you first launch the app:

1. You'll see a permission screen requesting **Screen Time Access**
2. Tap **Grant Access**
3. iOS will prompt you to authorize Screen Time access
4. Once authorized, the app will display usage statistics

## Architecture

### Project Structure

```
AppUsageTracker/
├── AppUsageTrackerApp.swift          # Main app entry point
├── Views/
│   └── ContentView.swift             # Main UI with time period filters
├── Models/
│   └── AppUsageModel.swift           # Data models for usage statistics
├── Services/
│   └── UsageDataService.swift        # Screen Time API integration
├── Assets.xcassets/                  # App icons and assets
└── Info.plist                        # App configuration
```

### Key Components

#### TimePeriod Enum
Defines all supported time periods and their date ranges.

#### AppUsage Model
Represents individual app usage data including:
- App name and bundle identifier
- Total usage time
- Formatted time display

#### UsageDataService
Handles:
- Screen Time API authorization
- Fetching usage statistics
- Data aggregation across time periods

#### ContentView
Main UI featuring:
- Horizontal scrolling time period picker
- Total screen time summary card
- List of apps with usage bars and percentages

## Implementation Notes

### Screen Time API

The app uses Apple's Family Controls framework which requires:

1. **Entitlements**: `com.apple.developer.family-controls` (already configured)
2. **Authorization**: Users must grant explicit permission
3. **DeviceActivityReport**: For production use, implement a DeviceActivityReport extension to get real usage data

### Current Data Source

The current implementation uses **mock data** to demonstrate the UI and functionality. For production use:

1. Implement a **DeviceActivityReport** extension
2. Configure **DeviceActivityMonitor** to track app usage
3. Replace mock data with real Screen Time data

### Privacy

- All Screen Time data stays on the device
- Requires explicit user authorization
- No data is transmitted or stored externally

## Customization

### Adding New Time Periods

Edit the `TimePeriod` enum in `Models/AppUsageModel.swift`:

```swift
enum TimePeriod: String, CaseIterable {
    case yourNewPeriod = "Display Name"

    var days: Int {
        switch self {
        case .yourNewPeriod: return numberOfDays
        // ...
        }
    }
}
```

### Styling

The app uses SwiftUI with native iOS styling. To customize:
- Colors: Modify in `ContentView.swift`
- Layout: Adjust spacing and padding in view components
- Fonts: Update `.font()` modifiers

## Known Limitations

1. **Mock Data**: Currently displays simulated usage data
2. **Real-time Updates**: Requires DeviceActivityReport extension for live data
3. **Historical Data**: Screen Time API has limitations on historical data access

## Next Steps

To make this production-ready:

1. **Implement DeviceActivityReport Extension**:
   - Create a new target for DeviceActivityReport
   - Configure monitoring schedules
   - Process real Screen Time events

2. **Data Persistence**:
   - Add Core Data or SwiftData for caching
   - Store aggregated statistics locally

3. **Enhanced UI**:
   - Add charts and graphs (using Swift Charts)
   - Implement search and filtering
   - Add app categories

4. **Testing**:
   - Unit tests for data processing
   - UI tests for main flows
   - Device testing for authorization flow

## Resources

- [Apple Family Controls Documentation](https://developer.apple.com/documentation/familycontrols)
- [Screen Time API Guide](https://developer.apple.com/documentation/deviceactivity)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)

## License

MIT License - Feel free to use and modify as needed.

## Support

For issues or questions, please open an issue in the repository.
