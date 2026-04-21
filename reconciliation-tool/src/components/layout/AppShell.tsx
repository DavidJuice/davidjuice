import type { ReactNode } from 'react';
import { WizardStepper } from './WizardStepper';
import { useAppStore, type AppMode } from '../../store/useAppStore';

const BOB_STEPS = [
  { step: 1, label: 'Upload Files' },
  { step: 2, label: 'Map Fields' },
  { step: 3, label: 'Configure' },
  { step: 4, label: 'Results' },
];

const COMMISSION_STEPS = [
  { step: 1, label: 'Upload Files' },
  { step: 2, label: 'Map Fields' },
  { step: 3, label: 'Results' },
];

interface AppShellProps {
  children: ReactNode;
  completedSteps: Set<number>;
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function AppShell({ children, completedSteps, currentStep, onStepClick }: AppShellProps) {
  const mode = useAppStore(s => s.mode);
  const setMode = useAppStore(s => s.setMode);

  const steps = mode === 'commissions' ? COMMISSION_STEPS : BOB_STEPS;
  const subtitle = mode === 'commissions'
    ? 'Commission Sync to AgencyBloc'
    : 'Book of Business vs AgencyBloc';

  return (
    <div className="min-h-screen bg-cream-light">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Ace Insurance <span className="text-gold">Reconciliation Tool</span>
            </h1>
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>
          <SecurityBadge />
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="mx-auto max-w-7xl border-b border-gray-border bg-white">
        <ModeSwitcher activeMode={mode} onModeChange={setMode} />
      </div>

      {/* Stepper */}
      <div className="mx-auto max-w-7xl border-b border-gray-border bg-white">
        <WizardStepper
          currentStep={currentStep}
          onStepClick={onStepClick}
          completedSteps={completedSteps}
          steps={steps}
        />
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>

      {/* Security footer */}
      <footer className="border-t border-gray-border bg-white/80 py-3 text-center text-xs text-gray">
        All data is processed locally on your device. Nothing is uploaded to any server.
      </footer>
    </div>
  );
}

function ModeSwitcher({ activeMode, onModeChange }: { activeMode: AppMode; onModeChange: (mode: AppMode) => void }) {
  const modes: { key: AppMode; label: string }[] = [
    { key: 'bob', label: 'Book of Business' },
    { key: 'commissions', label: 'Commissions' },
  ];

  return (
    <div className="flex gap-1 px-6 py-2">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onModeChange(m.key)}
          className={`
            rounded-lg px-4 py-2 text-sm font-semibold transition-all
            ${activeMode === m.key
              ? 'bg-navy text-white shadow-sm'
              : 'text-gray hover:bg-cream-light hover:text-navy'
            }
          `}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function SecurityBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
      <span className="text-xs font-medium text-white/80">100% Local Processing</span>
    </div>
  );
}
