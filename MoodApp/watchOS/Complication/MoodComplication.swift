import WidgetKit
import SwiftUI

struct MoodComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "mood.complication", provider: MoodComplicationProvider()) { entry in
            MoodComplicationEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Mood")
        .description("Time since your last check-in. Tap to log.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}
