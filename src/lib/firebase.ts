import {initializeApp, type FirebaseApp, type FirebaseOptions} from 'firebase/app';
import {browserLocalPersistence, getAuth, setPersistence, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import {getFunctions, type Functions} from 'firebase/functions';

const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type FirebaseEnvKey = (typeof REQUIRED_ENV)[number];

function readFirebaseConfig(): FirebaseOptions {
  const env = import.meta.env;
  const missing = REQUIRED_ENV.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env.local and add your Firebase web app keys from the Firebase console.',
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  };
}

const firebaseConfig = readFirebaseConfig();

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const functions: Functions = getFunctions(firebaseApp);

void setPersistence(auth, browserLocalPersistence);

export type {FirebaseEnvKey};
