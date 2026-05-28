import Foundation
import HealthKit
import Observation

/// Owns the single `HKHealthStore`, requests authorization, reads the signals
/// we attach as silent context (HRV, sleep, steps), and — on iOS 18 / watchOS 11
/// — writes the mood itself to `HKStateOfMind`.
@MainActor
@Observable
final class HealthKitManager {
    enum AuthState: Equatable {
        case notDetermined
        case authorized
        case unavailable
    }

    private let store = HKHealthStore()
    private(set) var authState: AuthState = .notDetermined

    static var isHealthDataAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.stepCount),
            HKCategoryType(.sleepAnalysis),
        ]
        if #available(iOS 18.0, watchOS 11.0, *) {
            types.insert(HKObjectType.stateOfMindType())
        }
        return types
    }

    private var shareTypes: Set<HKSampleType> {
        if #available(iOS 18.0, watchOS 11.0, *) {
            return [HKObjectType.stateOfMindType()]
        }
        return []
    }

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            authState = .unavailable
            return
        }
        do {
            try await store.requestAuthorization(toShare: shareTypes, read: readTypes)
            authState = .authorized
        } catch {
            // The prompt failing to present is the only error here; actual
            // read/write grants stay private to the user by design.
            authState = .notDetermined
        }
    }

    /// Reads the current ambient signals in parallel and packages them.
    /// Every field is best-effort: a missing signal returns nil, never throws.
    func captureContext(at date: Date = .now) async -> MoodContext {
        async let hrv = latestHRV()
        async let sleep = lastNightSleepHours(reference: date)
        async let steps = stepsToday(reference: date)
        let calendar = Calendar.current
        return MoodContext(
            hrv: await hrv,
            sleepHours: await sleep,
            stepCount: await steps,
            timeOfDay: TimeOfDayBucket(from: date, calendar: calendar),
            weekday: calendar.component(.weekday, from: date)
        )
    }

    @available(iOS 18.0, watchOS 11.0, *)
    func saveStateOfMind(
        valence: Valence,
        feeling: Feeling?,
        factor: MoodFactor?,
        kind: HKStateOfMind.Kind = .momentaryEmotion,
        date: Date = .now
    ) async -> UUID? {
        let labels = feeling?.healthKitLabel.map { [$0] } ?? []
        let associations = factor?.healthKitAssociation.map { [$0] } ?? []
        let sample = HKStateOfMind(
            date: date,
            kind: kind,
            valence: valence.healthKitValue,
            labels: labels,
            associations: associations
        )
        do {
            try await store.save(sample)
            return sample.uuid
        } catch {
            return nil
        }
    }

    @available(iOS 18.0, watchOS 11.0, *)
    func deleteStateOfMind(sampleID: UUID) async {
        let predicate = HKQuery.predicateForObject(with: sampleID)
        _ = try? await store.deleteObjects(of: HKObjectType.stateOfMindType(), predicate: predicate)
    }

    // MARK: - Context reads

    private func latestHRV() async -> Double? {
        await mostRecentQuantity(
            HKQuantityType(.heartRateVariabilitySDNN),
            unit: .secondUnit(with: .milli)
        )
    }

    private func stepsToday(reference date: Date) async -> Int? {
        let start = Calendar.current.startOfDay(for: date)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: date)
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: HKQuantityType(.stepCount),
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, stats, _ in
                let steps = stats?.sumQuantity()?.doubleValue(for: .count())
                continuation.resume(returning: steps.map { Int($0) })
            }
            store.execute(query)
        }
    }

    /// Sums the "asleep" segments in the 24h window ending at `date` — a good
    /// proxy for "last night" without a full sleep-staging analysis.
    private func lastNightSleepHours(reference date: Date) async -> Double? {
        let start = Calendar.current.date(byAdding: .hour, value: -24, to: date) ?? date
        let predicate = HKQuery.predicateForSamples(withStart: start, end: date)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKCategoryType(.sleepAnalysis),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, _ in
                guard let samples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: nil)
                    return
                }
                let asleep: Set<Int> = [
                    HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                    HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                    HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                    HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                ]
                let seconds = samples
                    .filter { asleep.contains($0.value) }
                    .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
                continuation.resume(returning: seconds > 0 ? seconds / 3600.0 : nil)
            }
            store.execute(query)
        }
    }

    private func mostRecentQuantity(_ type: HKQuantityType, unit: HKUnit) async -> Double? {
        await withCheckedContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: type,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sort]
            ) { _, samples, _ in
                let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit)
                continuation.resume(returning: value)
            }
            store.execute(query)
        }
    }
}
