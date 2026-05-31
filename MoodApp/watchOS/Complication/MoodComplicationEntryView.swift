import SwiftUI
import WidgetKit

struct MoodComplicationEntryView: View {
    let entry: MoodComplicationEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:    circular
        case .accessoryCorner:      corner
        case .accessoryRectangular: rectangular
        case .accessoryInline:      inline
        default:                    circular
        }
    }

    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: symbol)
                .symbolRenderingMode(.hierarchical)
                .font(.title2)
        }
        .widgetAccentable()
    }

    private var corner: some View {
        Image(systemName: symbol)
            .symbolRenderingMode(.hierarchical)
            .font(.title3)
            .widgetLabel {
                Text(timeAgo)
            }
    }

    private var rectangular: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .symbolRenderingMode(.hierarchical)
                .font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text("Mood").font(.caption.weight(.semibold))
                Text(timeAgo).font(.caption2)
            }
            Spacer(minLength: 0)
        }
        .widgetAccentable()
    }

    @ViewBuilder
    private var inline: some View {
        if let date = entry.lastLogDate {
            Text("Mood ") + Text(date, style: .relative)
        } else {
            Text("Tap to check in")
        }
    }

    private var symbol: String {
        entry.latestValence?.symbolName ?? "face.smiling"
    }

    private var timeAgo: String {
        guard let date = entry.lastLogDate else { return "first log" }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: .now)
    }
}
