import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const phoneRegex = /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;
let currentMode = "login";

function randomPhoneNumber() {
  const parts = Array.from({ length: 5 }, () => String(Math.floor(Math.random() * 100)).padStart(2, "0"));
  return parts.join("-");
}

function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function normalizeError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Cet email est déjà utilisé.",
    "auth/invalid-email": "Adresse email invalide.",
    "auth/weak-password": "Mot de passe trop faible (minimum 6 caractères).",
    "auth/invalid-credential": "Identifiants invalides.",
    "auth/user-not-found": "Utilisateur introuvable.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/network-request-failed": "Erreur réseau.",
    "auth/operation-not-allowed": "Active Email/Mot de passe dans Firebase Authentication."
  };
  return map[code] || error?.message || "Une erreur est survenue.";
}

export function generatePhoneNumber(uid) {
  let seed = 0;
  for (let i = 0; i < uid.length; i += 1) {
    seed = (seed * 33 + uid.charCodeAt(i)) >>> 0;
  }

  const digits = [];
  while (digits.length < 10) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const chunk = String(seed).padStart(10, "0");
    for (const c of chunk) {
      digits.push(c);
      if (digits.length === 10) break;
    }
  }

  return `${digits[0]}${digits[1]}-${digits[2]}${digits[3]}-${digits[4]}${digits[5]}-${digits[6]}${digits[7]}-${digits[8]}${digits[9]}`;
}

async function reservePhoneForUser(uid, email = "") {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const existingPhone = userSnap.data()?.phoneNumber;

  if (phoneRegex.test(existingPhone || "")) {
    const phoneRef = doc(db, "phones", existingPhone);
    const phoneSnap = await getDoc(phoneRef);
    if (!phoneSnap.exists()) {
      await setDoc(phoneRef, { uid, createdAt: serverTimestamp() }, { merge: true });
    }
    await setDoc(userRef, { email, updatedAt: serverTimestamp() }, { merge: true });
    return existingPhone;
  }

  const deterministic = generatePhoneNumber(uid);
  const candidates = [deterministic, ...Array.from({ length: 80 }, randomPhoneNumber)];

  for (const candidate of candidates) {
    const result = await runTransaction(db, async (transaction) => {
      const phoneRef = doc(db, "phones", candidate);
      const phoneTaken = await transaction.get(phoneRef);
      if (phoneTaken.exists()) {
        return null;
      }

      const userInTx = await transaction.get(userRef);
      const currentPhone = userInTx.data()?.phoneNumber;
      if (phoneRegex.test(currentPhone || "")) {
        return currentPhone;
      }

      transaction.set(phoneRef, { uid, createdAt: serverTimestamp() });
      transaction.set(
        userRef,
        { email, phoneNumber: candidate, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return candidate;
    });

    if (phoneRegex.test(result || "")) {
      return result;
    }
  }

  throw new Error("Impossible d'attribuer un numéro Phone® pour le moment.");
}

export async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      const phone = await reservePhoneForUser(user.uid, user.email || "");
      safeText("userEmail", user.email || "-");
      safeText("userPhone", phone);
      resolve(user);
    });
  });
}

export async function submitForm(mode) {
  const email = document.getElementById("email")?.value?.trim() || "";
  const password = document.getElementById("password")?.value || "";

  if (!email || !password) {
    throw new Error("Email et mot de passe requis.");
  }

  if (mode === "register") {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await reservePhoneForUser(cred.user.uid, email);
    return cred;
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export function toggleMode() {
  currentMode = currentMode === "login" ? "register" : "login";

  const title = document.getElementById("authTitle");
  const submitBtn = document.getElementById("submitBtn");
  const modeSwitch = document.getElementById("modeSwitch");

  if (title) title.textContent = currentMode === "login" ? "Connexion" : "Créer un compte";
  if (submitBtn) submitBtn.textContent = currentMode === "login" ? "Se connecter" : "Créer le compte";
  if (modeSwitch) {
    modeSwitch.textContent =
      currentMode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter";
  }
}

export function getCurrentMode() {
  return currentMode;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}

export { auth, db, phoneRegex };
export {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  doc,
  setDoc,
  getDoc,
  runTransaction
};
