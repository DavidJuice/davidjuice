import SwiftUI

struct ContentView: View {
    @StateObject private var usageService = UsageDataService.shared
    @State private var selectedPeriod: TimePeriod = .today
    @State private var usageStats: UsageStatistics?
    @State private var isLoading = false
    @State private var showingAuthRequest = false

    var body: some View {
        NavigationView {
            VStack {
                if !usageService.isAuthorized {
                    authorizationView
                } else {
                    usageView
                }
            }
            .navigationTitle("App Usage Tracker")
            .navigationBarTitleDisplayMode(.large)
        }
        .task {
            await loadUsageData()
        }
    }

    // Authorization request view
    private var authorizationView: some View {
        VStack(spacing: 20) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("Screen Time Access Required")
                .font(.title2)
                .fontWeight(.bold)

            Text("This app needs access to Screen Time data to track your app usage.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Button(action: {
                Task {
                    showingAuthRequest = true
                    do {
                        try await usageService.requestAuthorization()
                        await loadUsageData()
                    } catch {
                        print("Authorization failed: \(error)")
                    }
                    showingAuthRequest = false
                }
            }) {
                Text("Grant Access")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .padding(.horizontal)
            .disabled(showingAuthRequest)
        }
        .padding()
    }

    // Main usage view
    private var usageView: some View {
        VStack(spacing: 0) {
            // Time period picker
            timePeriodPicker

            if isLoading {
                Spacer()
                ProgressView()
                    .scaleEffect(1.5)
                Spacer()
            } else if let stats = usageStats {
                // Total screen time summary
                totalScreenTimeView(stats: stats)

                // App usage list
                appUsageList(stats: stats)
            }
        }
    }

    private var timePeriodPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(TimePeriod.allCases, id: \.self) { period in
                    Button(action: {
                        selectedPeriod = period
                        Task {
                            await loadUsageData()
                        }
                    }) {
                        Text(period.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedPeriod == period ? Color.blue : Color.gray.opacity(0.2))
                            .foregroundColor(selectedPeriod == period ? .white : .primary)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Color(uiColor: .systemBackground))
    }

    private func totalScreenTimeView(stats: UsageStatistics) -> some View {
        VStack(spacing: 8) {
            Text("Total Screen Time")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text(stats.formattedTotalTime)
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.blue)

            Text(selectedPeriod.rawValue)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(uiColor: .secondarySystemBackground))
    }

    private func appUsageList(stats: UsageStatistics) -> some View {
        List {
            ForEach(stats.apps) { app in
                AppUsageRow(app: app, totalScreenTime: stats.totalScreenTime)
            }
        }
        .listStyle(.plain)
    }

    private func loadUsageData() async {
        isLoading = true
        usageStats = await usageService.fetchUsageStatistics(for: selectedPeriod)
        isLoading = false
    }
}

struct AppUsageRow: View {
    let app: AppUsage
    let totalScreenTime: TimeInterval

    var usagePercentage: Double {
        guard totalScreenTime > 0 else { return 0 }
        return (app.totalTime / totalScreenTime) * 100
    }

    var body: some View {
        HStack(spacing: 12) {
            // App icon placeholder
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 50, height: 50)

                Text(String(app.appName.prefix(1)))
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(app.appName)
                    .font(.headline)

                HStack(spacing: 4) {
                    Text(app.formattedTime)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("•")
                        .foregroundColor(.secondary)

                    Text(String(format: "%.1f%%", usagePercentage))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Usage bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 4)
                            .cornerRadius(2)

                        Rectangle()
                            .fill(Color.blue)
                            .frame(width: geometry.size.width * (usagePercentage / 100), height: 4)
                            .cornerRadius(2)
                    }
                }
                .frame(height: 4)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    ContentView()
}
