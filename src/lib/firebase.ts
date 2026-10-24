import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

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

/**
 * Returns (or creates) the Firebase app singleton.
 * On first call, also initialises Firestore with long-polling so that
 * getFirestore() calls everywhere else return the same configured instance.
 */
export function getFirebaseApp(): FirebaseApp {
  const config = getFirebaseConfig();

  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to .env.local.",
    );
  }

  if (getApps().length > 0) {
    // App already exists — Firestore was already initialised.
    return getApp();
  }

  const app = initializeApp(config);

  // Initialise Firestore with long-polling immediately after the app is
  // created so that every subsequent getFirestore(app) call returns this
  // pre-configured instance instead of the default WebSocket one.
  //
  // WHY long-polling?
  //   The default transport is WebSockets over gRPC-WebChannel. In many
  //   environments — Next.js localhost, corporate proxies, Safari — the
  //   WebSocket handshake fails silently on startup and Firestore reports
  //   "client is offline" on the very first document read. HTTP long-polling
  //   uses plain fetch requests that succeed in all those environments.
  initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Returns the Firestore instance (pre-configured with long-polling). */
export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
