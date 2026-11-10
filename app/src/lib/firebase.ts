import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Valores vêm do arquivo .env (veja .env.example). São identificadores públicos
// do projeto Firebase; a proteção real dos dados está nas Security Rules.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const firstInit = getApps().length === 0;
export const firebaseApp = firstInit ? initializeApp(firebaseConfig) : getApp();

function createAuth(): Auth {
  if (Platform.OS === 'web' || !firstInit) return getAuth(firebaseApp);
  // getReactNativePersistence só existe no build React Native do SDK e não
  // aparece nas tipagens padrão; mantém o morador logado entre aberturas do app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const auth = createAuth();
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  `https://southamerica-east1-${firebaseConfig.projectId}.cloudfunctions.net/api`;
