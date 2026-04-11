import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useReconciliation } from '../../hooks/useReconciliation';

interface ConfigurePageProps {
  onProceed: () => void;
  onBack: () => void;
}

export function ConfigurePage({ onProceed, onBack }: ConfigurePageProps) {
  const matchConfig = useAppStore(s => s.matchConfig);
  const setMatchConfig = useAppStore(s => s.setMatchConfig);
  const bobRecords = useAppStore(s => s.bobRecords);
  const abRecords = useAppStore(s => s.abRecords);
  const isReconciling = useAppStore(s => s.isReconciling);
  const parsedSources = useAppStore(s => s.parsedSources);
  const { preprocessHumana, runReconciliation, getMatchPreview } = useReconciliation();

  const [preview, setPreview] = useState<{ bobCount: number; abCount: number; estimatedMatches: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get Humana date columns
  const humanaSource = parsedSources.get('humana_bob');
  const humanaHeaders = humanaSource?.headers || [];

  // Pre-process Humana on first load
  useEffect(() => {
    if (bobRecords.some(r => r._source === 'humana_bob')) {
      preprocessHumana();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update preview when config changes
  useEffect(() => {
    if (bobRecords.length > 0 || abRecords.length > 0) {
      setPreview(getMatchPreview());
    }
  }, [bobRecords.length, abRecords.length, matchConfig.includeMiddleName, getMatchPreview]);

  const handleRunReconciliation = useCallback(async () => {
    setError(null);
    try {
      await runReconciliation();
      onProceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    }
  }, [runReconciliation, onProceed]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold text-navy">Configure Matching</h2>
        <p className="mt-1 text-sm text-gray">
          Review matching settings before running the reconciliation. BOB is the anchor/reference.
        </p>
      </div>

      {/* Data summary */}
      {preview && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="BOB Records" value={preview.bobCount} color="navy" />
          <StatCard label="AB Records" value={preview.abCount} color="navy" />
          <StatCard label="Estimated Matches" value={preview.estimatedMatches} color="gold" />
        </div>
      )}

      {/* Middle name info */}
      <div className={`rounded-lg border px-4 py-3 text-sm ${
        matchConfig.includeMiddleName
          ? 'border-success/30 bg-success-light/50'
          : 'border-warning/30 bg-warning-light/50'
      }`}>
        <p className="font-medium text-navy">
          Middle Name: {matchConfig.includeMiddleName ? 'Included' : 'Excluded'}
        </p>
        <p className="text-xs text-gray mt-1">
          {matchConfig.includeMiddleName
            ? 'All sources have middle name data. Identifiers use: First + Middle + Last + DOB.'
            : 'Not all sources have middle name data. Identifiers use: First + Last + DOB (middle name excluded globally for consistency).'
          }
        </p>
      </div>

      {/* Configuration options */}
      <div className="rounded-xl border border-gray-border bg-white shadow-sm">
        <div className="border-b border-gray-border/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-navy">Matching Rules</h3>
        </div>

        <div className="space-y-4 p-5">
          {/* Escalation options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-navy">Duplicate Resolution (Escalation)</p>
            <p className="text-xs text-gray">
              When multiple records share the same primary key (Name + DOB), the system escalates by adding more fields to the identifier.
            </p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={matchConfig.escalateWithPhone}
                onChange={(e) => setMatchConfig({ escalateWithPhone: e.target.checked })}
                className="h-4 w-4 rounded border-gray-border text-gold accent-gold"
              />
              <span className="text-sm text-navy">
                Level 2: Add Phone Number to identifier when duplicates found
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={matchConfig.escalateWithZip}
                onChange={(e) => setMatchConfig({ escalateWithZip: e.target.checked })}
                className="h-4 w-4 rounded border-gray-border text-gold accent-gold"
              />
              <span className="text-sm text-navy">
                Level 3: Add Zip Code to identifier when still duplicates
              </span>
            </label>
          </div>

          {/* Humana date column */}
          {humanaHeaders.length > 0 && (
            <div className="space-y-2 border-t border-gray-border/50 pt-4">
              <p className="text-sm font-medium text-navy">Humana Log History — Date Column</p>
              <p className="text-xs text-gray">
                Humana BOB contains log history. Select the column that has the date to identify the most recent record per person.
              </p>
              <select
                value={matchConfig.humanaDateColumn}
                onChange={(e) => setMatchConfig({ humanaDateColumn: e.target.value })}
                className="w-full max-w-sm rounded-lg border border-gray-border bg-white px-3 py-2 text-sm text-navy"
              >
                <option value="effectiveDate">Effective Date (mapped)</option>
                {humanaHeaders.map(h => (
                  <option key={h} value={h}>{h} (raw column)</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error-light px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-border px-6 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
        >
          Back to Field Mapping
        </button>
        <button
          onClick={handleRunReconciliation}
          disabled={isReconciling || bobRecords.length === 0 || abRecords.length === 0}
          className={`
            rounded-lg px-8 py-2.5 text-sm font-semibold transition-all
            ${isReconciling
              ? 'bg-navy/70 text-white cursor-wait'
              : bobRecords.length > 0 && abRecords.length > 0
                ? 'bg-gold text-navy shadow-md hover:bg-gold-dark hover:text-white hover:shadow-lg'
                : 'bg-gray-border text-gray cursor-not-allowed'
            }
          `}
        >
          {isReconciling ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Reconciling...
            </span>
          ) : (
            'Run Reconciliation'
          )}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border border-gray-border bg-white p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray">{label}</p>
      <p className={`text-2xl font-bold ${color === 'gold' ? 'text-gold-dark' : 'text-navy'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
