/**
 * firebase.ts — Single source of truth for all Firebase SDK instances.
 *
 * Root cause of "FirebaseError: Failed to get document because the client
 * is offline"
 * -------------------------------------------------------------------------
 * Firestore's default transport is WebSockets via gRPC-WebChannel. On
 * Next.js localhost, corporate proxies, and some browsers the WebSocket
 * handshake fails silently on the very first attempt, so Firestore reports
 * "client is offline" before any document has been read.
 *
 * Fix: `experimentalAutoDetectLongPolling: true`
 *   Tells the SDK to probe both WebSockets and HTTP long-polling at startup
 *   and switch to whichever succeeds. This is transport-agnostic and works
 *   in all environments without sacrificing performance where WebSockets work.
 *
 * Implementation constraint
 * -------------------------
 * `initializeFirestore` must be called BEFORE the first `getFirestore` call
 * for a given app instance, or the SDK will create a default (no long-poll)
 * instance and our subsequent `initializeFirestore` call would fail.
 *
 * We guard against this by:
 *   1. Keeping module-level `_db` and `_app` singletons.
 *   2. Calling `initializeFirestore` with the same options every time — if
 *      a previous call with identical options already ran (e.g. HMR), the
 *      SDK returns the cached instance without error.
 *   3. Never calling the bare `getFirestore()` anywhere in the codebase.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { enableNetwork, initializeFirestore, type Firestore } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Private config
// ---------------------------------------------------------------------------

function readEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function getFirebaseConfig() {
  return {
    apiKey:            readEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain:        readEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId:         readEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket:     readEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId:             readEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };
}

export function isFirebaseConfigured() {
  const c = getFirebaseConfig();
  return (
    c.apiKey.length > 0 &&
    c.authDomain.length > 0 &&
    c.projectId.length > 0 &&
    c.storageBucket.length > 0 &&
    c.messagingSenderId.length > 0 &&
    c.appId.length > 0
  );
}

// ---------------------------------------------------------------------------
// Firestore settings — kept in one place so initializeFirestore always
// receives identical options (idempotent across HMR / multiple calls).
// ---------------------------------------------------------------------------

const FIRESTORE_SETTINGS = {
  /**
   * Probe WebSockets and HTTP long-polling at startup; automatically pick
   * whichever succeeds. This eliminates "client is offline" on localhost,
   * corporate proxies, and environments where WebSocket upgrade is blocked.
   */
  experimentalAutoDetectLongPolling: true,
} as const;

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

/**
 * Returns the Firebase App singleton.
 * Firestore is initialised here (with auto-detect long-polling) to guarantee
 * our transport settings are applied before any other Firestore call.
 */
export function getFirebaseApp(): FirebaseApp {
  if (_app && _db) return _app;

  const config = getFirebaseConfig();

  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to .env.local.",
    );
  }

  _app = getApps().length > 0 ? getApp() : initializeApp(config);

  // initializeFirestore with IDENTICAL settings is safe to call multiple
  // times — the SDK returns the same cached instance without error.
  _db = initializeFirestore(_app, FIRESTORE_SETTINGS);

  return _app;
}

/** Returns the Firestore singleton, guaranteed to have long-polling enabled. */
export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  getFirebaseApp(); // populates _db as a side effect
  if (!_db) throw new Error("Firestore could not be initialised.");
  return _db;
}

/**
 * Eagerly kicks off the Firestore network connection so the WebSocket /
 * long-polling handshake finishes BEFORE the first getDoc() call.
 *
 * Call once per page-load from the top of any useEffect that will read
 * Firestore. The underlying SDK deduplies repeated calls automatically.
 *
 * This eliminates the race where getDoc() runs before the initial
 * connection probe succeeds and receives a fromCache=true + !exists
 * snapshot, which the SDK translates into "client is offline".
 */
export async function warmUpFirestore(): Promise<void> {
  try {
    await enableNetwork(getFirebaseDb());
  } catch {
    // enableNetwork() may reject if the SDK is shutting down — not fatal.
  }
}

/**
 * Wraps a Firestore operation in a retry loop with exponential back-off.
 *
 * Only retries on Code.UNAVAILABLE ("client is offline" / transient network
 * errors). Any other FirestoreError or non-Firestore error propagates
 * immediately.
 *
 * @param op       - Async factory for the Firestore read/write to attempt.
 * @param maxTries - Maximum attempts (default 4 → 3 retries after the first).
 */
export async function withFirestoreRetry<T>(
  op: () => Promise<T>,
  maxTries = 4,
): Promise<T> {
  let delay = 500; // ms, doubles each attempt
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await op();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const isOffline =
        code === "unavailable" ||
        (err instanceof Error &&
          err.message.toLowerCase().includes("client is offline"));

      if (!isOffline || attempt === maxTries) throw err;

      // Re-kick the network connection before the next attempt
      await warmUpFirestore();
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
  // TypeScript: unreachable, but needed to satisfy return type
  throw new Error("withFirestoreRetry: exhausted retries");
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
