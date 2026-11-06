import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { ThemeProvider } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready } = useAuth();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  return ready ? <Slot /> : null;
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    PressStart2P_400Regular,
  });

  if (!loaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <ToastProvider>
              <Gate />
            </ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
