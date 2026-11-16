import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

// Mostra a notificação mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Push só no Android instalado (build EAS): no Expo Go o push remoto não existe,
 * e no iPhone exigiria a conta de desenvolvedor da Apple.
 */
export const pushSupported =
  Platform.OS === 'android' && Device.isDevice && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Pede permissão e salva o token FCM do aparelho no perfil do morador.
 * As Cloud Functions usam esse token para enviar, pelo Firebase Cloud Messaging,
 * os avisos de comunicados e reuniões.
 */
export async function registerForPush(uid: string): Promise<void> {
  if (!pushSupported) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos da associação',
      importance: AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const token = (await Notifications.getDevicePushTokenAsync()).data as string;
  await updateDoc(doc(db, 'residents', uid), { pushToken: token });
}

/** Remove o token ao sair, para o aparelho parar de receber avisos dessa conta. */
export async function unregisterPush(uid: string): Promise<void> {
  await updateDoc(doc(db, 'residents', uid), { pushToken: null }).catch(() => null);
}
