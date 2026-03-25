import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ── Section types ────────────────────────────────────────────────────────────
export type TourSection = 'intro' | 'ai' | 'design' | 'automate' | 'integrate' | 'analyze' | 'operate' | 'finish';

export type TourStep = {
  id: string;
  section: TourSection;
  title: string;
  content: string;
  tip?: string;
  navigateTo?: string;
  targetSelector?: string;
};

type SectionConfig = { label: string; icon: string; color: string; bg: string };

const SECTION_CONFIG: Record<TourSection, SectionConfig> = {
  intro:     { label: 'Welcome',   icon: '✦', color: '#E878F6', bg: 'rgba(232,120,246,0.13)' },
  ai:        { label: 'AI',        icon: '✦', color: '#A78BFA', bg: 'rgba(167,139,250,0.13)' },
  design:    { label: 'Design',    icon: '◈', color: '#60A5FA', bg: 'rgba(96,165,250,0.13)' },
  automate:  { label: 'Automate',  icon: '⚡', color: '#34D399', bg: 'rgba(52,211,153,0.13)' },
  integrate: { label: 'Integrate', icon: '🔗', color: '#FBBF24', bg: 'rgba(251,191,36,0.13)' },
  analyze:   { label: 'Analyze',   icon: '⬡', color: '#F87171', bg: 'rgba(248,113,113,0.13)' },
  operate:   { label: 'Operate',   icon: '▣', color: '#C084FC', bg: 'rgba(192,132,252,0.13)' },
  finish:    { label: 'Done',      icon: '✓', color: '#22D3EE', bg: 'rgba(34,211,238,0.13)' },
};

const SECTION_ORDER: TourSection[] = ['intro', 'ai', 'design', 'automate', 'integrate', 'analyze', 'operate', 'finish'];

// ── Context ──────────────────────────────────────────────────────────────────
export type GuidedTourContextType = {
  steps: TourStep[];
  currentStep: number;
  isOpen: boolean;
  nextStep: () => void;
  prevStep: () => void;
  closeTour: () => void;
  openTour: () => void;
};

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(undefined);

export const useGuidedTour = (): GuidedTourContextType => {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used within GuidedTourProvider');
  return ctx;
};

// ── Provider ─────────────────────────────────────────────────────────────────
type GuidedTourProviderProps = {
  steps: TourStep[];
  children: React.ReactNode;
  mode?: 'day' | 'night';
};

export const GuidedTourProvider: React.FC<GuidedTourProviderProps> = ({ steps, children, mode = 'night' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const animKey = useRef(0);

  // First-time auto-show (keyed to v2 so existing users see the new tour)
  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('corespace_tour_v2');
    if (!seen) setIsOpen(true);
  }, []);

  // Close when steps overflow
  useEffect(() => {
    if (isOpen && currentStep >= steps.length) {
      setIsOpen(false);
      setCurrentStep(0);
      if (typeof window !== 'undefined') localStorage.setItem('corespace_tour_v2', '1');
    }
  }, [isOpen, currentStep, steps.length]);

  const nextStep = useCallback(() => {
    setDirection('forward');
    animKey.current += 1;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setDirection('backward');
    animKey.current += 1;
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') localStorage.setItem('corespace_tour_v2', '1');
  }, []);

  const openTour = useCallback(() => {
    setCurrentStep(0);
    setDirection('forward');
    animKey.current += 1;
    setIsOpen(true);
  }, []);

  const jumpToStep = useCallback((idx: number) => {
    if (idx === currentStep) return;
    setDirection(idx > currentStep ? 'forward' : 'backward');
    animKey.current += 1;
    setCurrentStep(idx);
  }, [currentStep]);

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
  const sectionCfg = step ? SECTION_CONFIG[step.section] : SECTION_CONFIG.intro;
  const isWelcome = step?.section === 'intro' && step?.id === 'welcome';

  // Sections that actually have steps
  const activeSections = SECTION_ORDER.filter((sec) => steps.some((s) => s.section === sec));

  // First step index per section for jump navigation
  const sectionFirstStep = SECTION_ORDER.reduce<Partial<Record<TourSection, number>>>((acc, sec) => {
    const idx = steps.findIndex((s) => s.section === sec);
    if (idx >= 0) acc[sec] = idx;
    return acc;
  }, {});

  // Visited sections (any step seen up to current)
  const visitedSections = new Set(steps.slice(0, currentStep).map((s) => s.section));

  // Steps within current section for in-section counter
  const sectionSteps = steps.filter((s) => s.section === step?.section);
  const stepInSection = sectionSteps.findIndex((s) => s.id === step?.id) + 1;

  const animClass = direction === 'forward' ? 'guided-tour-step-forward' : 'guided-tour-step-backward';

  return (
    <GuidedTourContext.Provider value={{ steps, currentStep, isOpen, nextStep, prevStep, closeTour, openTour }}>
      {children}
      {isOpen && step && (
        <>
          <div className="guided-tour-backdrop" onClick={closeTour} />
          <div
            className="guided-tour-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Halo Internal Guided Tour"
            data-theme={mode}
          >

            {/* ── Section nav strip ── */}
            <div className="guided-tour-section-nav" role="navigation" aria-label="Tour sections">
              {activeSections.map((sec) => {
                const cfg = SECTION_CONFIG[sec];
                const firstIdx = sectionFirstStep[sec];
                const isActive = step.section === sec;
                const isVisited = visitedSections.has(sec);
                return (
                  <button
                    key={sec}
                    className={`guided-tour-section-chip${isActive ? ' active' : ''}${isVisited && !isActive ? ' visited' : ''}`}
                    data-chip-section={sec}
                    onClick={() => firstIdx !== undefined && jumpToStep(firstIdx)}
                    aria-current={isActive ? 'step' : undefined}
                    title={`Jump to ${cfg.label}`}
                  >
                    <span className="guided-tour-section-chip-icon">{cfg.icon}</span>
                    {cfg.label}
                  </button>
                );
              })}
              <button className="guided-tour-close" onClick={closeTour} aria-label="Close tour">✕</button>
            </div>

            {/* ── Body — section color driven by data-section attr + CSS ── */}
            <div
              className={`guided-tour-body ${animClass}`}
              key={animKey.current}
              data-section={step.section}
            >

              {isWelcome ? (
                /* Hero layout for welcome step */
                <div className="guided-tour-hero">
                  <span className="guided-tour-hero-logo">{SECTION_CONFIG.intro.icon}</span>
                  <h2 className="guided-tour-title guided-tour-title-center">{step.title}</h2>
                  <p className="guided-tour-hero-tagline">Halo Internal Platform Walkthrough</p>
                  <p className="guided-tour-content guided-tour-content-center">{step.content}</p>
                  {step.tip && (
                    <div className="guided-tour-tip guided-tour-tip-mt">
                      <span className="guided-tour-tip-icon">💡</span>
                      <span>{step.tip}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard step layout */
                <>
                  <div className="guided-tour-section-header">
                    <div className="guided-tour-section-icon">{sectionCfg.icon}</div>
                    <div className="guided-tour-section-meta">
                      <span className="guided-tour-section-label">
                        {sectionCfg.label}
                      </span>
                      <span className="guided-tour-step-counter">
                        Step {stepInSection} of {sectionSteps.length}
                      </span>
                    </div>
                  </div>

                  <h2 className="guided-tour-title">{step.title}</h2>
                  <p className="guided-tour-content">{step.content}</p>

                  {step.tip && (
                    <div className="guided-tour-tip">
                      <span className="guided-tour-tip-icon">💡</span>
                      <span>{step.tip}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="guided-tour-footer">
              <div className="guided-tour-dots" aria-hidden="true">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`guided-tour-dot${i === currentStep ? ' active' : i < currentStep ? ' visited' : ''}`}
                  />
                ))}
              </div>
              <button
                className="guided-tour-btn guided-tour-btn-secondary"
                onClick={prevStep}
                disabled={isFirst}
                aria-label="Previous step"
              >
                Back
              </button>
              {isLast ? (
                <button className="guided-tour-btn guided-tour-btn-primary" onClick={closeTour}>
                  Finish Tour ✓
                </button>
              ) : (
                <button className="guided-tour-btn guided-tour-btn-primary" onClick={nextStep} aria-label="Next step">
                  Next →
                </button>
              )}
              {!isLast && (
                <button className="guided-tour-btn guided-tour-btn-skip" onClick={closeTour} aria-label="Skip tour">
                  Skip
                </button>
              )}
            </div>

          </div>
        </>
      )}
    </GuidedTourContext.Provider>
  );
};

// Styles are injected via assets/guidedTour.css (loaded in App.tsx)
