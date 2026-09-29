import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }

  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, getGoogleProvider());
  return credential.user;
}

export async function signOutUser() {
  await firebaseSignOut(getFirebaseAuth());
}
