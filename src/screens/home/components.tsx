import React from 'react';
import { BlurView } from 'expo-blur';
import { Modal, ScrollView, StyleProp, Text, TextInput, TextStyle, View } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useUiTheme } from '../../context/UiThemeContext';
import { GuideStep } from './types';

function withAlpha(hex: string, alphaHex: string) {
  return `${hex}${alphaHex}`;
}

function getContrastTextColor(hex: string) {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((item) => item + item).join('') : raw;
  if (normalized.length !== 6) {
    return '#FFFFFF';
  }
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.56 ? '#111111' : '#FFFFFF';
}

export const Card = React.memo(function Card({ title, children, blurred = false }: { title?: string; children: React.ReactNode; blurred?: boolean }) {
  const { mode, styles } = useUiTheme();

  const content = (
    <View style={[styles.card, blurred && styles.moduleWidgetCard]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );

  if (!blurred) {
    return content;
  }

  return (
    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={[styles.cardBlurWrap, styles.moduleWidgetBlur]}>
      {content}
    </BlurView>
  );
});

export const LabeledInput = React.memo(function LabeledInput({
  label,
  helperText,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  returnKeyType,
  accessibilityHint,
  secureTextEntry,
  labelStyle,
  helperTextStyle,
  inputTextStyle,
  placeholderTextColor,
}: {
  label: string;
  helperText?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  accessibilityHint?: string;
  secureTextEntry?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  helperTextStyle?: StyleProp<TextStyle>;
  inputTextStyle?: StyleProp<TextStyle>;
  placeholderTextColor?: string;
}) {
  const { mode, styles } = useUiTheme();
  const inputLabel = label.replace('*', '').trim();
  const inputSurfaceColor = mode === 'day' ? '#FFFFFF' : '#1A2340';
  const thresholdTextColor = getContrastTextColor(inputSurfaceColor);
  const thresholdPlaceholderColor = withAlpha(thresholdTextColor, mode === 'day' ? '8A' : 'B8');

  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputLabelRow}>
        <Text style={[styles.inputLabel, { color: thresholdTextColor }, labelStyle]}>{label}</Text>
        {!!helperText && <Text style={[styles.inputHelperText, { color: thresholdTextColor }, helperTextStyle]}>{helperText}</Text>}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? thresholdPlaceholderColor}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        accessibilityLabel={inputLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.input, multiline && styles.inputMulti, { color: thresholdTextColor }, inputTextStyle]}
      />
    </View>
  );
});

export function ProcessStepper({
  title,
  steps,
  activeIndex,
}: {
  title: string;
  steps: GuideStep[];
  activeIndex: number;
}) {
  const { styles } = useUiTheme();

  return (
    <View style={styles.processCard}>
      <Text style={styles.processTitle}>{title}</Text>
      <View style={styles.stepRow}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.stepItem}>
            <View style={[styles.stepDot, index <= activeIndex && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, index <= activeIndex && styles.stepDotTextActive]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, index <= activeIndex && styles.stepLabelActive]} numberOfLines={1}>
              {step.title.replace('Step ' + (index + 1) + ': ', '')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function HintStrip({
  steps,
  onGuide,
}: {
  steps: GuideStep[];
  onGuide: (step: GuideStep) => void;
}) {
  const { styles } = useUiTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hintRow}>
      {steps.map((step) => (
        <Pressable
          key={step.title}
          style={styles.hintBubble}
          onPress={() => onGuide(step)}
          accessibilityRole="button"
          accessibilityLabel={step.title}
          accessibilityHint="Opens a focused guidance tip"
        >
          <Text style={styles.hintBubbleTitle}>{step.title}</Text>
          <Text style={styles.hintBubbleText} numberOfLines={2}>
            {step.detail}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function GuideModal({
  step,
  onClose,
}: {
  step: GuideStep | null;
  onClose: () => void;
}) {
  const { styles } = useUiTheme();

  return (
    <Modal transparent visible={!!step} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close guide"
        accessibilityHint="Closes the guide panel"
      >
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <Text style={styles.modalTitle}>{step?.title}</Text>
          <Text style={styles.modalText}>{step?.detail}</Text>
          <Pressable style={styles.primaryButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Got it" accessibilityHint="Closes this guide step">
            <Text style={styles.primaryButtonText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
