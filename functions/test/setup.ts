import { getApps, initializeApp } from 'firebase-admin/app';

// O "npm test" já define essas variáveis; os valores abaixo permitem rodar o jest
// com os emuladores ligados manualmente (firebase emulators:start).
process.env.GCLOUD_PROJECT ??= 'demo-champs';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
