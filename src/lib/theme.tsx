import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Palette = {
  bg: string; surface: string; surface2: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; good: string; warn: string; bad: string;
  goodBg: string; warnBg: string; badBg: string; buckets: string[]; scrim: string;
};

const dark: Palette = {
  bg: '#000000', surface: '#0E110C', surface2: '#182014', ink: '#F2EFE6', muted: '#9BA593', line: '#232B1E',
  accent: '#A4E030', accentInk: '#0A1200', good: '#A4E030', warn: '#F2B84B', bad: '#FF6B6B',
  goodBg: '#17270B', warnBg: '#2A2110', badBg: '#2E1414',
  buckets: ['#A4E030', '#FFB23F', '#4DB8FF', '#FF6FB0', '#B39DFF', '#3FE0D0', '#E6D84D', '#9BA593'],
  scrim: 'rgba(0,0,0,0.7)',
};

const light: Palette = {
  bg: '#F3F6EE', surface: '#FFFFFF', surface2: '#E8EEDF', ink: '#10150B', muted: '#586351', line: '#D3DBC8',
  accent: '#3F7A00', accentInk: '#FFFFFF', good: '#2F7A00', warn: '#8A5A00', bad: '#C62828',
  goodBg: '#E1F0CC', warnBg: '#FBEBC8', badBg: '#FADADA',
  buckets: ['#3F7A00', '#C46A00', '#1565C0', '#C2185B', '#6A4FC4', '#00897B', '#8C7A00', '#586351'],
  scrim: 'rgba(0,0,0,0.5)',
};

export const fonts = {
  display: 'PressStart2P_400Regular',
  body: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  bold: 'JetBrainsMono_700Bold',
};

type Mode = 'dark' | 'light';
type ThemeCtx = { c: Palette; mode: Mode; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ c: dark, mode: 'dark', toggle: () => {} });
const KEY = 'brokeexe-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [saved, setSaved] = useState<Mode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'dark' || v === 'light') setSaved(v); })
      .catch(() => {});
  }, []);

  const mode: Mode = saved ?? (system === 'light' ? 'light' : 'dark');
  const toggle = useCallback(() => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setSaved(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, [mode]);

  const value = useMemo(() => ({ c: mode === 'light' ? light : dark, mode, toggle }), [mode, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
