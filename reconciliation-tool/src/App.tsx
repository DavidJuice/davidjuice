import { useState, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { UploadPage } from './components/upload/UploadPage';
import { MappingPage } from './components/mapping/MappingPage';
import { ConfigurePage } from './components/configure/ConfigurePage';
import { ResultsPage } from './components/results/ResultsPage';
import { CommissionUploadPage } from './components/commission/CommissionUploadPage';
import { CommissionMappingPage } from './components/commission/CommissionMappingPage';
import { CommissionResultsPage } from './components/commission/CommissionResultsPage';
import { useAppStore, type WizardStep } from './store/useAppStore';
import { useCommissionStore, } from './store/useCommissionStore';
import type { CommissionWizardStep } from './types/commission';

function App() {
  const mode = useAppStore(s => s.mode);

  // BOB wizard state
  const bobStep = useAppStore(s => s.currentStep);
  const setBobStep = useAppStore(s => s.setStep);
  const bobReset = useAppStore(s => s.reset);
  const [bobCompleted, setBobCompleted] = useState<Set<number>>(new Set());

  // Commission wizard state
  const commStep = useCommissionStore(s => s.currentStep);
  const setCommStep = useCommissionStore(s => s.setStep);
  const commReset = useCommissionStore(s => s.reset);
  const [commCompleted, setCommCompleted] = useState<Set<number>>(new Set());

  // BOB navigation
  const bobGoTo = useCallback((step: WizardStep) => setBobStep(step), [setBobStep]);

  const bobCompleteAndProceed = useCallback((from: WizardStep, to: WizardStep) => {
    setBobCompleted(prev => { const next = new Set(prev); next.add(from); return next; });
    bobGoTo(to);
  }, [bobGoTo]);

  const handleBobStartOver = useCallback(() => {
    bobReset();
    setBobCompleted(new Set());
  }, [bobReset]);

  // Commission navigation
  const commGoTo = useCallback((step: CommissionWizardStep) => setCommStep(step), [setCommStep]);

  const commCompleteAndProceed = useCallback((from: CommissionWizardStep, to: CommissionWizardStep) => {
    setCommCompleted(prev => { const next = new Set(prev); next.add(from); return next; });
    commGoTo(to);
  }, [commGoTo]);

  const handleCommStartOver = useCallback(() => {
    commReset();
    setCommCompleted(new Set());
  }, [commReset]);

  // Current mode state
  const currentStep = mode === 'commissions' ? commStep : bobStep;
  const completedSteps = mode === 'commissions' ? commCompleted : bobCompleted;

  const handleStepClick = useCallback((step: number) => {
    if (mode === 'commissions') {
      if (step <= commStep || commCompleted.has(step)) {
        setCommStep(step as CommissionWizardStep);
      }
    } else {
      if (step <= bobStep || bobCompleted.has(step)) {
        setBobStep(step as WizardStep);
      }
    }
  }, [mode, commStep, commCompleted, setCommStep, bobStep, bobCompleted, setBobStep]);

  return (
    <AppShell
      completedSteps={completedSteps}
      currentStep={currentStep}
      onStepClick={handleStepClick}
    >
      {mode === 'bob' && (
        <>
          {bobStep === 1 && (
            <UploadPage onProceed={() => bobCompleteAndProceed(1, 2)} />
          )}
          {bobStep === 2 && (
            <MappingPage
              onProceed={() => bobCompleteAndProceed(2, 3)}
              onBack={() => bobGoTo(1)}
            />
          )}
          {bobStep === 3 && (
            <ConfigurePage
              onProceed={() => bobCompleteAndProceed(3, 4)}
              onBack={() => bobGoTo(2)}
            />
          )}
          {bobStep === 4 && (
            <ResultsPage
              onBack={() => bobGoTo(3)}
              onStartOver={handleBobStartOver}
            />
          )}
        </>
      )}
      {mode === 'commissions' && (
        <>
          {commStep === 1 && (
            <CommissionUploadPage onProceed={() => commCompleteAndProceed(1, 2)} />
          )}
          {commStep === 2 && (
            <CommissionMappingPage
              onProceed={() => commCompleteAndProceed(2, 3)}
              onBack={() => commGoTo(1)}
            />
          )}
          {commStep === 3 && (
            <CommissionResultsPage
              onBack={() => commGoTo(2)}
              onStartOver={handleCommStartOver}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

export default App;
