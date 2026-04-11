import { useState, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { UploadPage } from './components/upload/UploadPage';
import { MappingPage } from './components/mapping/MappingPage';
import { ConfigurePage } from './components/configure/ConfigurePage';
import { ResultsPage } from './components/results/ResultsPage';
import { useAppStore, type WizardStep } from './store/useAppStore';

function App() {
  const currentStep = useAppStore(s => s.currentStep);
  const setStep = useAppStore(s => s.setStep);
  const reset = useAppStore(s => s.reset);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const goToStep = useCallback((step: WizardStep) => {
    setStep(step);
  }, [setStep]);

  const completeAndProceed = useCallback((fromStep: WizardStep, toStep: WizardStep) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(fromStep);
      return next;
    });
    goToStep(toStep);
  }, [goToStep]);

  const handleStartOver = useCallback(() => {
    reset();
    setCompletedSteps(new Set());
  }, [reset]);

  return (
    <AppShell completedSteps={completedSteps}>
      {currentStep === 1 && (
        <UploadPage
          onProceed={() => completeAndProceed(1, 2)}
        />
      )}
      {currentStep === 2 && (
        <MappingPage
          onProceed={() => completeAndProceed(2, 3)}
          onBack={() => goToStep(1)}
        />
      )}
      {currentStep === 3 && (
        <ConfigurePage
          onProceed={() => completeAndProceed(3, 4)}
          onBack={() => goToStep(2)}
        />
      )}
      {currentStep === 4 && (
        <ResultsPage
          onBack={() => goToStep(3)}
          onStartOver={handleStartOver}
        />
      )}
    </AppShell>
  );
}

export default App;
