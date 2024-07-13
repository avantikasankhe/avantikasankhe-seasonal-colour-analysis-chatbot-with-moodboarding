// lib/auth.ts
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseApp } from "./firebase"; // Ensure the correct path to your firebase config

const auth = getAuth(firebaseApp);

export const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
