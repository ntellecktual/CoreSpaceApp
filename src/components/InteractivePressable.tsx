import React, { useEffect } from 'react';
import { Pressable, PressableProps, Platform } from 'react-native';
import { useUiTheme } from '../context/UiThemeContext';

const STYLE_ID = 'cs-interactive-feedback';
function ensureInteractiveCSS() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '[data-interactive] { cursor: pointer; transition: opacity 0.06s ease, filter 0.06s ease; }',
    '[data-interactive]:hover { opacity: 0.88; filter: brightness(1.08); }',
    '[data-interactive]:active { opacity: 0.70; }',
    '[data-interactive]:focus-visible { outline: 2px solid rgba(140,91,245,0.6); outline-offset: 2px; border-radius: 8px; }',
    '[data-interactive]:focus-visible { outline: 2px solid rgba(140,91,245,0.6); outline-offset: 2px; border-radius: 8px; }',
  ].join('\n');
  document.head.appendChild(style);
}

export function InteractivePressable({ style, ...props }: PressableProps) {
  const { styles } = useUiTheme();
  const isWeb = Platform.OS === 'web';

  useEffect(() => { ensureInteractiveCSS(); }, []);

  return (
    <Pressable
      {...props}
      {...(isWeb ? { dataSet: { interactive: '' } } as any : {})}
      style={(state) => {
        const baseStyle = typeof style === 'function' ? style(state) : style;
        // On web the CSS shim ([data-interactive]) handles hover/active/focus
        // feedback, so skip the JS transform styles that cause
        // "Failed to set indexed property on CSSStyleDeclaration" errors.
        if (isWeb) return baseStyle;
        return [styles.pressableFeedback, baseStyle, state.pressed && styles.pressableFeedbackPressed];
      }}
    />
  );
}
