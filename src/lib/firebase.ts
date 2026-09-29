import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";

function readEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function getFirebaseConfig() {
  return {
    apiKey: readEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: readEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: readEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();

  return (
    config.apiKey.length > 0 &&
    config.authDomain.length > 0 &&
    config.projectId.length > 0 &&
    config.storageBucket.length > 0 &&
    config.messagingSenderId.length > 0 &&
    config.appId.length > 0
  );
}

export function getFirebaseApp(): FirebaseApp {
  const config = getFirebaseConfig();

  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to .env.local.",
    );
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(config);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
