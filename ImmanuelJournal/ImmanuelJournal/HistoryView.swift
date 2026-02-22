import SwiftUI
import SwiftData

struct HistoryView: View {
    @Query(
        filter: #Predicate<JournalEntry> { $0.isFinalized },
        sort: \JournalEntry.createdAt,
        order: .reverse
    )
    private var entries: [JournalEntry]

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    emptyState
                } else {
                    entryList
                }
            }
            .navigationTitle("My History")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed")
                .font(.system(size: 56))
                .foregroundStyle(.tertiary)

            Text("No Entries Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Complete your first journal entry\nto see it appear here.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private var entryList: some View {
        List {
            ForEach(entries) { entry in
                NavigationLink(destination: LetterView(entry: entry)) {
                    EntryRowView(entry: entry)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
            }
        }
        .listStyle(.plain)
    }
}

struct EntryRowView: View {
    let entry: JournalEntry

    private var formattedDate: String {
        entry.createdAt.formatted(date: .long, time: .shortened)
    }

    private var preview: String {
        let text = entry.gratitude.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { return "No content" }
        return String(text.prefix(100)) + (text.count > 100 ? "…" : "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "heart.fill")
                    .font(.caption)
                    .foregroundStyle(.accentColor)
                Text(formattedDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Text(preview)
                .font(.body)
                .foregroundStyle(.primary)
                .lineLimit(2)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
        )
    }
}

struct LetterView: View {
    let entry: JournalEntry

    private var formattedDate: String {
        entry.createdAt.formatted(date: .long, time: .shortened)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "leaf.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.accentColor)

                    Text("Immanuel Journal")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(formattedDate)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Divider()
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 24)

                // Steps
                ForEach(Array(entry.allStepTexts.enumerated()), id: \.offset) { index, step in
                    if !step.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        letterSection(
                            title: step.title,
                            subtitle: step.subtitle,
                            body: step.body,
                            icon: JournalViewModel.steps[index].icon,
                            isLast: index == entry.allStepTexts.count - 1
                        )
                    }
                }

                // Footer
                VStack(spacing: 8) {
                    Divider()
                        .padding(.bottom, 8)

                    Image(systemName: "heart.fill")
                        .foregroundStyle(.accentColor.opacity(0.5))

                    Text("Written with Immanuel Journaling")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 24)
            }
            .padding(24)
        }
        .background(Color(.systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func letterSection(title: String, subtitle: String, body: String, icon: String, isLast: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(.accentColor)
                    .frame(width: 28, height: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text(body)
                .font(.body)
                .lineSpacing(6)
                .foregroundStyle(.primary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
        )
        .padding(.bottom, isLast ? 0 : 12)
    }
}

#Preview {
    HistoryView()
        .modelContainer(for: JournalEntry.self, inMemory: true)
}
