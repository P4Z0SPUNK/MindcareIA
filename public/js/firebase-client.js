// public/js/firebase-client.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Firebase config provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDo9APRaGiL-REFhkFuYM3ptX58JmgSC44",
  authDomain: "mindcare-ai-f5ca5.firebaseapp.com",
  projectId: "mindcare-ai-f5ca5",
  storageBucket: "mindcare-ai-f5ca5.firebasestorage.app",
  messagingSenderId: "923395548601",
  appId: "1:923395548601:web:afcb83c008267295664268",
  measurementId: "G-DRKJ222PCH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  return await auth.signOut();
}

export function onAuthChange(cb) {
  onAuthStateChanged(auth, user => cb(user));
}

export async function getIdToken() {
  const user = auth.currentUser;
  return user ? await user.getIdToken(true) : null;
}

export { auth };
