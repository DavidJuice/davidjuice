import WidgetKit
import SwiftUI

struct MoodCheckInWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "mood.checkin", provider: MoodWidgetProvider()) { entry in
            MoodWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(URL(string: "moodapp://checkin"))
        }
        .configurationDisplayName("Check In")
        .description("Tap to log how you're feeling.")
        .supportedFamilies([
            .systemSmall,
            .accessoryRectangular,
            .accessoryCircular,
        ])
    }
}

struct MoodWidgetEntryView: View {
    let entry: MoodWidgetEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:    circular
        case .accessoryRectangular: rectangular
        default:                    small
        }
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol)
                .font(.system(size: 36))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(tint)
            Spacer(minLength: 0)
            Text("Check in")
                .font(.headline)
            if let date = entry.lastLogDate {
                Text(date, format: .relative(presentation: .named))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                Text("First log")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var rectangular: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(tint)
                .font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text("Check in").font(.headline)
                if let date = entry.lastLogDate {
                    Text(date, format: .relative(presentation: .named))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: symbol)
                .symbolRenderingMode(.hierarchical)
                .font(.title2)
        }
    }

    private var symbol: String {
        entry.latestValence?.symbolName ?? "face.smiling"
    }

    private var tint: Color {
        entry.latestValence?.color ?? .accentColor
    }
}
