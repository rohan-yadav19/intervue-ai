import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { InterviewFeedback, InterviewSession } from "@/types";

/** Firestore collections */
const SESSIONS_COLLECTION = "interviewSessions";
const FEEDBACK_COLLECTION = "interviewFeedback";

/* ------------------------------------------------------------------ */
/*  Write                                                               */
/* ------------------------------------------------------------------ */

/**
 * Saves a completed interview session to Firestore.
 * @returns The auto-generated Firestore document ID.
 */
export async function saveInterviewSession(
  session: InterviewSession,
): Promise<string> {
  if (!session.userId) {
    throw new Error("Cannot save interview session: user is not authenticated.");
  }

  const db = getFirebaseDb();
  const { id: _clientId, ...data } = session;
  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), data);
  return docRef.id;
}

/**
 * Saves AI-generated feedback for a session to Firestore.
 * @returns The auto-generated Firestore document ID.
 */
export async function saveFeedback(
  feedback: InterviewFeedback,
): Promise<string> {
  const db = getFirebaseDb();
  const { id: _clientId, ...data } = feedback;
  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), data);
  return docRef.id;
}

/* ------------------------------------------------------------------ */
/*  Read                                                                */
/* ------------------------------------------------------------------ */

/**
 * Reads a single interview session by its Firestore document ID.
 * Returns null if not found.
 */
export async function getInterviewSession(
  sessionId: string,
): Promise<InterviewSession | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<InterviewSession, "id">) };
}

/**
 * Reads all sessions for a given user, sorted newest-first.
 * @param maxResults – optional upper bound (default 50)
 */
export async function getUserSessions(
  userId: string,
  maxResults = 50,
): Promise<InterviewSession[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("completedAt", "desc"),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<InterviewSession, "id">),
  }));
}

/**
 * Returns existing feedback for a session if it was already generated,
 * so we don't call Gemini again on every page refresh.
 */
export async function getFeedbackForSession(
  sessionId: string,
): Promise<InterviewFeedback | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    where("sessionId", "==", sessionId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<InterviewFeedback, "id">) };
}
