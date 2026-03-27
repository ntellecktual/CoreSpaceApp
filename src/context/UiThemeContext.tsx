import React, { createContext, useContext, useMemo, useState } from 'react';
import { getStyles, ThemeMode } from '../screens/HomeScreen.styles';

type UiThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  styles: ReturnType<typeof getStyles>;
};

const UiThemeContext = createContext<UiThemeContextValue | undefined>(undefined);

export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('day');

  const value = useMemo<UiThemeContextValue>(
    () => ({
      mode,
      toggleMode: () => setMode((current) => (current === 'night' ? 'day' : 'night')),
      styles: getStyles(mode),
    }),
    [mode],
  );

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

export function useUiTheme() {
  const context = useContext(UiThemeContext);
  if (!context) {
    throw new Error('useUiTheme must be used within UiThemeProvider');
  }
  return context;
}
