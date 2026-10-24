import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { InterviewPlan } from "@/types";

const PLANS_COLLECTION = "interviewPlans";

/**
 * Saves an interview plan (config + questions) to Firestore before the
 * interview starts. Returns the auto-generated document ID, which becomes
 * the URL parameter for /interview/[id].
 */
export async function saveInterviewPlan(plan: InterviewPlan): Promise<string> {
  if (!plan.userId) {
    throw new Error("Cannot save interview plan: user is not authenticated.");
  }
  const db = getFirebaseDb();
  const { id: _clientId, ...data } = plan;
  const docRef = await addDoc(collection(db, PLANS_COLLECTION), data);
  return docRef.id;
}

/**
 * Reads a single interview plan by its Firestore document ID.
 * Returns null if not found.
 */
export async function getInterviewPlan(
  planId: string,
): Promise<InterviewPlan | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, PLANS_COLLECTION, planId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<InterviewPlan, "id">) };
}
