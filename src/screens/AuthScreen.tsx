import React, { useState } from 'react';
import { Platform } from 'react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { NebulaBackground } from '../components/NebulaBackground';
import { useAppState } from '../context/AppStateContext';
import { useUiTheme } from '../context/UiThemeContext';
import { GoogleOutlined, WindowsOutlined, ArrowLeftOutlined } from '@ant-design/icons';

type AuthMode = 'login' | 'signup';

type AuthScreenProps = {
  onBackToOverview?: () => void;
};

export function AuthScreen({ onBackToOverview }: AuthScreenProps) {
  const { styles } = useUiTheme();
  const { signInWithEmail, signInWithProvider, createAccount } = useAppState();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createAdminAccount, setCreateAdminAccount] = useState(false);
  const [message, setMessage] = useState('');

  const onEmailAuth = () => {
    const result =
      mode === 'login'
        ? signInWithEmail(email, password)
        : createAccount(fullName, email, password, createAdminAccount);
    setMessage(result.message);
  };

  const onGoogle = () => {
    const result = signInWithProvider('google');
    setMessage(result.message);
  };

  const onMicrosoft = () => {
    const result = signInWithProvider('microsoft');
    setMessage(result.message);
  };

  const inputStyle = {
    width: '100%' as const,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#263374' }}>
      {/* Shared animated nebula + stars */}
      <NebulaBackground mode="night" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ width: '100%', zIndex: 1 } as any}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
      >
        {/* Centered glass card */}
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(16,22,52,0.90)',
            overflow: 'hidden',
            padding: 36,
            alignItems: 'center',
            ...(Platform.OS === 'web'
              ? {
                  // Only apply web-specific styles on web
                  boxShadow: '0 8px 48px rgba(0,0,0,0.40)',
                  // backgroundImage and backdropFilter are not supported by React Native View
                  backgroundImage: 'linear-gradient(180deg, rgba(20,28,65,0.90), rgba(14,20,48,0.95))',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  gap: 0,
                }
              : {})
          } as any}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <BrandLogo width={220} height={78} />
          </View>

          {/* Heading */}
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={{ color: '#C9D4F0', fontSize: 13, textAlign: 'center', marginBottom: 22 }}>
            {mode === 'login' ? 'Sign in to access your workspaces' : 'Get started with Halo Internal for free'}
          </Text>

          {/* Inputs */}
          <View style={{ width: '100%', gap: 12, marginBottom: 16 }}>
            {mode === 'signup' && (
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="rgba(201,184,234,0.5)"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                textContentType="name"
                style={inputStyle as any}
              />
            )}
            <TextInput
              placeholder="Email"
              placeholderTextColor="rgba(201,184,234,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={inputStyle as any}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor="rgba(201,184,234,0.5)"
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
              secureTextEntry
              style={inputStyle as any}
            />
          </View>

          {/* Forgot password (login only) */}
          {mode === 'login' && (
            <Pressable style={{ alignSelf: 'flex-end', marginBottom: 14, marginTop: -6 }}>
              <Text style={{ color: '#FFD332', fontSize: 13, fontWeight: '600' }}>Forgot your password?</Text>
            </Pressable>
          )}

          {/* Admin toggle (signup only) */}
          {mode === 'signup' && (
            <Pressable
              onPress={() => setCreateAdminAccount((c) => !c)}
              style={{
                width: '100%',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: createAdminAccount ? 'rgba(38,51,116,0.55)' : 'rgba(255,255,255,0.10)',
                backgroundColor: createAdminAccount ? 'rgba(38,51,116,0.20)' : 'rgba(255,255,255,0.04)',
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: '#D4DEEF', fontSize: 13, lineHeight: 19 }}>
                {createAdminAccount
                  ? '✅ Admin Account — full access to Workspace Creator, Signal Studio, and Tenant settings'
                  : '👤 Standard Account — day-to-day operations, intake, and record management'}
              </Text>
            </Pressable>
          )}

          {/* Primary CTA */}
          <Pressable
            onPress={onEmailAuth}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 10,
              backgroundImage: 'linear-gradient(135deg, #263374, #1a2455)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            } as any}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>

          {!!message && (
            <Text style={{ color: '#FF8A8A', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 4 }}>{message}</Text>
          )}

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <Text style={{ color: 'rgba(201,184,234,0.50)', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>OR CONTINUE WITH</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </View>

          {/* Social buttons */}
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <Pressable
              onPress={onGoogle}
              style={{
                flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <GoogleOutlined style={{ color: '#D4DEEF', fontSize: 16 }} />
              <Text style={{ color: '#D4DEEF', fontSize: 13, fontWeight: '600' }}>Google</Text>
            </Pressable>
            <Pressable
              onPress={onMicrosoft}
              style={{
                flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <WindowsOutlined style={{ color: '#D4DEEF', fontSize: 16 }} />
              <Text style={{ color: '#D4DEEF', fontSize: 13, fontWeight: '600' }}>Microsoft</Text>
            </Pressable>
          </View>

          {/* Toggle mode */}
          <View style={{ alignItems: 'center', marginTop: 20, gap: 6 }}>
            <Pressable onPress={() => { setMode((c) => (c === 'login' ? 'signup' : 'login')); setMessage(''); }}>
              <Text style={{ color: '#C9D4F0', fontSize: 13 }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: '#FFD332', fontWeight: '700' }}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
            {!!onBackToOverview && (
              <Pressable onPress={onBackToOverview} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ArrowLeftOutlined style={{ color: '#8A9BC2', fontSize: 12 }} />
                <Text style={{ color: '#8A9BC2', fontSize: 12 }}>Back to platform overview</Text>
              </Pressable>
            )}
          </View>

          {mode === 'signup' && (
            <Text style={{ color: '#8A9BC2', fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 16 }}>
              Tip: Choose Admin if you're setting up workspaces and automations for your team.
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={{ marginTop: 32, alignItems: 'center', gap: 6, opacity: 0.5 }}>
          <Text style={{ color: '#C9D4F0', fontSize: 11 }}>© 2026 Halo Internal. All rights reserved.</Text>
          <Text style={{ color: '#8A9BC2', fontSize: 10 }}>Powered by Bebo AI</Text>
        </View>
      </ScrollView>
    </View>
  );
}
