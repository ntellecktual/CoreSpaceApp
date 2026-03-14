import { useState } from 'react';
import { GuideStep, Page } from '../types';

export function useHomeScreenState() {
  const [page, setPage] = useState<Page>('admin');
  const [guidedMode, setGuidedMode] = useState(false);
  const [activeGuide, setActiveGuide] = useState<GuideStep | null>(null);

  return {
    page,
    guidedMode,
    activeGuide,
    setPage,
    toggleGuidedMode: () => setGuidedMode((value) => !value),
    openGuide: (step: GuideStep) => setActiveGuide(step),
    closeGuide: () => setActiveGuide(null),
  };
}
