import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useUiTheme } from '../context/UiThemeContext';

type BrandLogoProps = {
  width?: number;
  height?: number;
  logoUri?: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

const nightLogoSource = require('../../assets/mainhalologo.png');
const dayLogoSource = require('../../assets/secondaryhalologo.png');

export function BrandLogo({
  width = 148,
  height = 40,
  logoUri,
  style,
  accessibilityLabel = 'Halo Internal logo',
}: BrandLogoProps) {
  const theme = useUiTheme();
  const resolvedMode = (theme as any).mode?.mode ?? theme.mode;

  return React.createElement(Image, {
    source: logoUri?.trim() ? { uri: logoUri.trim() } : resolvedMode === 'day' ? dayLogoSource : nightLogoSource,
    resizeMode: logoUri?.trim() ? 'contain' : 'cover',
    style: [{ width, height }, style],
    accessibilityRole: 'image',
    accessibilityLabel,
  });
}
