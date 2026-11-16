/**
 * Observabilidade do app:
 * - Firebase Crashlytics: travamentos e erros, com a pilha de chamadas, no console do Firebase;
 * - Firebase Analytics: telas mais usadas (estatística anônima de uso).
 *
 * São módulos nativos: só existem no app instalado (build EAS). No Expo Go e na web
 * as funções abaixo simplesmente não fazem nada, para o desenvolvimento continuar funcionando.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics');
type AnalyticsModule = typeof import('@react-native-firebase/analytics');

const nativeAvailable =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

function load<T>(loader: () => T): T | null {
  if (!nativeAvailable) return null;
  try {
    return loader();
  } catch {
    return null;
  }
}

// require dentro de função: no Expo Go o módulo nativo não existe e o import quebraria o app
/* eslint-disable @typescript-eslint/no-require-imports */
const crash = load(() => require('@react-native-firebase/crashlytics') as CrashlyticsModule);
const analytics = load(() => require('@react-native-firebase/analytics') as AnalyticsModule);
/* eslint-enable @typescript-eslint/no-require-imports */

/** Registra um erro tratado (que não derrubou o app) para análise no Crashlytics. */
export function reportError(error: unknown, context?: string) {
  if (!crash) return;
  const err = error instanceof Error ? error : new Error(String(error));
  if (context) crash.log(crash.getCrashlytics(), context);
  crash.recordError(crash.getCrashlytics(), err);
}

/** Associa os relatórios ao id do morador (só o id interno, sem nome ou e-mail). */
export function identifyUser(uid: string | null) {
  if (crash && uid) crash.setUserId(crash.getCrashlytics(), uid).catch(() => null);
  if (analytics) analytics.setUserId(analytics.getAnalytics(), uid).catch(() => null);
}

/** Registra a tela aberta, para saber quais funcionalidades os moradores mais usam. */
export function trackScreen(path: string) {
  if (!analytics) return;
  analytics.logScreenView(analytics.getAnalytics(), { screen_name: path, screen_class: path }).catch(() => null);
}
