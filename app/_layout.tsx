import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initDB } from '../src/db/init';
import { seedDB } from '../src/db/seed';

type AppState = 'LOADING' | 'READY' | 'ERROR';

export default function RootLayout() {
  const [appState, setAppState] = useState<AppState>('LOADING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bootstrap = async () => {
    try {
      setAppState('LOADING');
      setErrorMsg(null);

      const db = await initDB();
      await seedDB(db);

      setAppState('READY');
    } catch (error: any) {
      console.error('Critical failure during bootstrap:', error);
      setErrorMsg(error?.message || 'Unknown error occurred.');
      setAppState('ERROR');
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  if (appState === 'LOADING') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Iniciando banco de dados...</Text>
      </View>
    );
  }

  if (appState === 'ERROR') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Falha crítica ao iniciar banco local</Text>
        <Text style={styles.errorSubtitle}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={bootstrap}>
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
