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

## Server Mode

AppUsageTracker supports a **server mode** that exposes usage statistics over a local HTTP API, enabling remote monitoring and automation workflows.

### Enabling Server Mode

Server mode is activated via launch arguments. In Xcode, go to **Product > Scheme > Edit Scheme > Arguments Passed On Launch** and add the desired flags, or pass them programmatically when spawning the app.

### Remote Control Spawn Options

The following spawn options are supported when launching the app in server mode:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--server` | flag | off | Enable server mode to expose the HTTP API |
| `--port <number>` | integer | `8080` | TCP port to listen on |
| `--host <address>` | string | `127.0.0.1` | Bind address (use `0.0.0.0` to listen on all interfaces) |
| `--auth-token <token>` | string | none | Bearer token required for authenticated endpoints |
| `--poll-interval <seconds>` | integer | `60` | How often (in seconds) usage statistics are refreshed |
| `--log-level <level>` | string | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `--read-only` | flag | off | Disable any write/reset endpoints; serve usage data only |

### Example Launch Commands

**Basic local server on the default port:**

```bash
AppUsageTracker --server
```

**Custom port with authentication:**

```bash
AppUsageTracker --server --port 9090 --auth-token my-secret-token
```

**Listen on all interfaces with debug logging:**

```bash
AppUsageTracker --server --host 0.0.0.0 --port 8080 --log-level debug
```

**Read-only server with a 5-minute refresh interval:**

```bash
AppUsageTracker --server --read-only --poll-interval 300
```

### Available API Endpoints

When server mode is active the following REST endpoints are available:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `200 OK` when the server is running |
| `GET` | `/usage` | Returns usage statistics for all time periods |
| `GET` | `/usage?period=<period>` | Returns usage statistics for a specific period (e.g. `today`, `1week`, `1month`) |
| `POST` | `/refresh` | Forces an immediate refresh of usage statistics |
| `POST` | `/reset` | Resets cached statistics (disabled when `--read-only` is set) |

All endpoints that return data use `Content-Type: application/json`. When `--auth-token` is configured, include it in the request header:

```http
Authorization: Bearer <token>
```

### Programmatic Spawning (Swift)

To spawn the app in server mode from another Swift process or test harness, use `Process`:

```swift
import Foundation

let process = Process()
process.executableURL = URL(fileURLWithPath: "/path/to/AppUsageTracker")
process.arguments = [
    "--server",
    "--port", "8080",
    "--auth-token", "my-secret-token",
    "--poll-interval", "60",
    "--log-level", "info"
]

try process.run()
// process.terminate() to stop the server
```

### Security Considerations

- Bind to `127.0.0.1` (the default) unless you explicitly need remote access.
- Always set `--auth-token` when binding to a non-loopback address.
- Use `--read-only` in environments where write operations are not required.
- All Screen Time data served by the API remains local to the device; no data leaves the device network.

## Resources

- [Apple Family Controls Documentation](https://developer.apple.com/documentation/familycontrols)
- [Screen Time API Guide](https://developer.apple.com/documentation/deviceactivity)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)

## License

MIT License - Feel free to use and modify as needed.

## Support

For issues or questions, please open an issue in the repository.
