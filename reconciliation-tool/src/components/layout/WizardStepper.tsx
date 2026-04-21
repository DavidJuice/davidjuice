const BOB_STEPS: { step: number; label: string }[] = [
  { step: 1, label: 'Upload Files' },
  { step: 2, label: 'Map Fields' },
  { step: 3, label: 'Configure' },
  { step: 4, label: 'Results' },
];

interface WizardStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
  steps?: { step: number; label: string }[];
}

export function WizardStepper({ currentStep, onStepClick, completedSteps, steps = BOB_STEPS }: WizardStepperProps) {
  return (
    <nav className="flex items-center gap-2 px-6 py-4">
      {steps.map(({ step, label }, index) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const isClickable = isCompleted || step <= currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={`h-px w-8 transition-colors ${
                  isCompleted || step <= currentStep ? 'bg-gold' : 'bg-gray-border'
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-navy text-white shadow-md'
                  : isCompleted
                    ? 'bg-gold/15 text-gold-dark cursor-pointer hover:bg-gold/25'
                    : isClickable
                      ? 'bg-cream text-gray cursor-pointer hover:bg-gray-light'
                      : 'bg-cream/50 text-gray/40 cursor-not-allowed'
                }
              `}
            >
              <span
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                  ${isActive
                    ? 'bg-gold text-navy'
                    : isCompleted
                      ? 'bg-gold text-white'
                      : 'bg-gray-border text-gray'
                  }
                `}
              >
                {isCompleted ? '✓' : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
