import { addDoc, collection } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { InterviewSession } from "@/types";

/** Firestore collection where completed sessions are stored. */
const SESSIONS_COLLECTION = "interviewSessions";

/**
 * Saves a completed interview session to Firestore.
 *
 * @returns The auto-generated Firestore document ID.
 * @throws  If the user is not authenticated or the write fails.
 */
export async function saveInterviewSession(
  session: InterviewSession,
): Promise<string> {
  if (!session.userId) {
    throw new Error("Cannot save interview session: user is not authenticated.");
  }

  const db = getFirebaseDb();

  // Strip the client-side `id` field — Firestore generates the doc ID.
  const { id: _clientId, ...data } = session;

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), data);
  return docRef.id;
}
