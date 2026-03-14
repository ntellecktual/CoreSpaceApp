import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type TourStep = {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
};

export type GuidedTourContextType = {
  steps: TourStep[];
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  closeTour: () => void;
  openTour: () => void;
  isOpen: boolean;
};

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(undefined);

export const useGuidedTour = () => {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used within GuidedTourProvider');
  return ctx;
};

type GuidedTourProviderProps = {
  steps: TourStep[];
  children: React.ReactNode;
};

// Section groupings derived from step id prefixes for the progress rail
const SECTION_MAP: Record<string, string> = {
  welcome: 'Welcome',
  'workspace-overview': 'Workspaces',
  'workspace-creator': 'Workspaces',
  'workspace-dscsa-demo': 'Workspaces',
  'dscsa-carton': 'DSCSA Serialization',
  'dscsa-boxes': 'DSCSA Serialization',
  'dscsa-units': 'DSCSA Serialization',
  'dscsa-lot': 'DSCSA Serialization',
  'workflow-manufacturer': 'Supply Chain',
  'workflow-distributor': 'Supply Chain',
  'workflow-pharmacy': 'Supply Chain',
  'workflow-traceability': 'Supply Chain',
  'signal-studio-overview': 'Signal Studio',
  'signal-studio-flows': 'Signal Studio',
  'signal-studio-publish': 'Signal Studio',
  'enduser-overview': 'End User',
  'enduser-intake': 'End User',
  'enduser-lifecycle': 'End User',
  'admin-roles': 'Admin',
  'admin-tags-policies': 'Admin',
  'tour-complete': 'Finish',
};

function getSectionLabel(stepId: string): string {
  return SECTION_MAP[stepId] ?? '';
}

export const GuidedTourProvider: React.FC<GuidedTourProviderProps> = ({ steps, children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // First-time user logic: only show tour if not previously completed
  useEffect(() => {
    const seenTour = typeof window !== 'undefined' && localStorage.getItem('corespace_seen_tour');
    if (!seenTour) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && currentStep >= steps.length) {
      setIsOpen(false);
      setCurrentStep(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('corespace_seen_tour', '1');
      }
    }
  }, [isOpen, currentStep, steps.length]);

  const nextStep = useCallback(() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  const prevStep = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), []);
  const closeTour = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('corespace_seen_tour', '1');
    }
  }, []);
  const openTour = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
      else if (e.key === 'Escape') closeTour();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, nextStep, prevStep, closeTour]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progressPct = steps.length > 1 ? ((currentStep) / (steps.length - 1)) * 100 : 100;
  const sectionLabel = step ? getSectionLabel(step.id) : '';

  return (
    <GuidedTourContext.Provider value={{ steps, currentStep, nextStep, prevStep, closeTour, openTour, isOpen }}>
      {children}
      {isOpen && step && (
        <>
          <div className="guided-tour-backdrop" onClick={closeTour} />
          <div className="guided-tour-modal" role="dialog" aria-label="Guided Tour">
            {/* Section badge */}
            {sectionLabel && <span className="guided-tour-section">{sectionLabel}</span>}

            {/* Step counter */}
            <span className="guided-tour-counter">Step {currentStep + 1} of {steps.length}</span>

            <h2>{step.title}</h2>
            <p>{step.content}</p>

            {/* Progress bar */}
            <div className="guided-tour-progress-track">
              <div
                className="guided-tour-progress-fill"
                ref={(el) => { if (el) el.style.setProperty('--tour-progress', `${progressPct}%`); }}
              />
            </div>

            <div className="guided-tour-actions">
              <button className="guided-tour-btn guided-tour-btn-secondary" onClick={prevStep} disabled={isFirst}>Back</button>
              {isLast ? (
                <button className="guided-tour-btn guided-tour-btn-primary" onClick={closeTour}>Finish Tour</button>
              ) : (
                <button className="guided-tour-btn guided-tour-btn-primary" onClick={nextStep}>Next</button>
              )}
              {!isLast && <button className="guided-tour-btn guided-tour-btn-skip" onClick={closeTour}>Skip Tour</button>}
            </div>
          </div>
        </>
      )}
    </GuidedTourContext.Provider>
  );
};

// Styles are in assets/guidedTour.css
