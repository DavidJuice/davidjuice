import type { ReactNode } from 'react';
import { WizardStepper } from './WizardStepper';
import { useAppStore, type WizardStep } from '../../store/useAppStore';

interface AppShellProps {
  children: ReactNode;
  completedSteps: Set<number>;
}

export function AppShell({ children, completedSteps }: AppShellProps) {
  const currentStep = useAppStore(s => s.currentStep);
  const setStep = useAppStore(s => s.setStep);

  return (
    <div className="min-h-screen bg-cream-light">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Ace Insurance <span className="text-gold">Reconciliation Tool</span>
            </h1>
            <p className="text-sm text-white/60">Book of Business vs AgencyBloc</p>
          </div>
          <SecurityBadge />
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto max-w-7xl border-b border-gray-border bg-white">
        <WizardStepper
          currentStep={currentStep}
          onStepClick={(step: WizardStep) => {
            if (step <= currentStep || completedSteps.has(step)) {
              setStep(step);
            }
          }}
          completedSteps={completedSteps}
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

function SecurityBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
      <span className="text-xs font-medium text-white/80">100% Local Processing</span>
    </div>
  );
}
