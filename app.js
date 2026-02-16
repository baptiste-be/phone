import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authForm = document.getElementById("authForm");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const configHint = document.getElementById("configHint");
const authCard = document.getElementById("authCard");
const dashboard = document.getElementById("dashboard");
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");
const phoneNumberInput = document.getElementById("phoneNumber");
const generateBtn = document.getElementById("generateBtn");
const claimBtn = document.getElementById("claimBtn");
const callTarget = document.getElementById("callTarget");
const callBtn = document.getElementById("callBtn");
const messageTarget = document.getElementById("messageTarget");
const messageBody = document.getElementById("messageBody");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const contactName = document.getElementById("contactName");
const contactPhone = document.getElementById("contactPhone");
const addContactBtn = document.getElementById("addContactBtn");
const contactsList = document.getElementById("contactsList");
const historyList = document.getElementById("historyList");
const toast = document.getElementById("toast");

const formatRegex = /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;

let app;
let auth;
let db;
let currentUser = null;
let unsubContacts = null;
let unsubHistory = null;

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3200);
}

function normalizeFirebaseError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Cet email est déjà utilisé.",
    "auth/invalid-email": "Adresse email invalide.",
    "auth/weak-password": "Mot de passe trop faible (minimum 6 caractères).",
    "auth/invalid-credential": "Identifiants invalides.",
    "auth/user-not-found": "Compte introuvable.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/operation-not-allowed": "Email/Mot de passe non activé dans Firebase Authentication.",
    "auth/network-request-failed": "Erreur réseau. Vérifie ta connexion.",
    "auth/too-many-requests": "Trop de tentatives. Réessaie plus tard.",
    "auth/invalid-api-key": "Configuration Firebase invalide (apiKey)."
  };
  return map[code] || error?.message || "Une erreur est survenue.";
}

function notifyLiquidGlass(title, body) {
  showToast(`${title} — ${body}`);
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(title, { body });
    });
  }
}

function randomPhoneNumber() {
  const parts = Array.from({ length: 5 }, () => `${Math.floor(Math.random() * 100)}`.padStart(2, "0"));
  return parts.join("-");
}

function hasPlaceholderFirebaseConfig() {
  const values = Object.values(firebaseConfig || {});
  return values.some((value) => typeof value === "string" && value.startsWith("YOUR_"));
}

async function generateAvailableNumber() {
  for (let i = 0; i < 40; i += 1) {
    const candidate = randomPhoneNumber();
    const taken = await getDoc(doc(db, "phones", candidate));
    if (!taken.exists()) {
      phoneNumberInput.value = candidate;
      return;
    }
  }
  showToast("Aucun numéro libre trouvé pour le moment.");
}

async function reserveNumber() {
  if (!currentUser) return;
  const number = phoneNumberInput.value.trim();

  if (!formatRegex.test(number)) {
    showToast("Format attendu: XX-XX-XX-XX-XX.");
    return;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const phoneRef = doc(db, "phones", number);
      const phoneDoc = await transaction.get(phoneRef);
      if (phoneDoc.exists()) throw new Error("Ce numéro est déjà pris.");

      const userRef = doc(db, "users", currentUser.uid);
      transaction.set(phoneRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
      transaction.set(userRef, { email: currentUser.email, phoneNumber: number, updatedAt: serverTimestamp() }, { merge: true });
    });

    showToast(`Numéro ${number} réservé.`);
  } catch (error) {
    showToast(error.message || "Réservation impossible.");
  }
}

async function sendHistory(type, target, content = "") {
  if (!currentUser) return;
  await addDoc(collection(db, "users", currentUser.uid, "history"), {
    type,
    target,
    content,
    createdAt: serverTimestamp()
  });
}

function renderList(targetEl, items, renderer) {
  targetEl.innerHTML = "";
  if (!items.length) {
    targetEl.innerHTML = "<li>Aucune donnée.</li>";
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    li.innerHTML = renderer(item);
    targetEl.appendChild(li);
  }
}

async function addContact() {
  if (!currentUser) return;

  const name = contactName.value.trim();
  const phone = contactPhone.value.trim();
  if (!name || !formatRegex.test(phone)) {
    showToast("Contact invalide.");
    return;
  }

  await addDoc(collection(db, "users", currentUser.uid, "contacts"), {
    name,
    phone,
    createdAt: serverTimestamp()
  });

  contactName.value = "";
  contactPhone.value = "";
  showToast("Contact ajouté.");
}

function subscribeUserData(uid) {
  if (unsubContacts) unsubContacts();
  if (unsubHistory) unsubHistory();

  const contactsQuery = query(collection(db, "users", uid, "contacts"), orderBy("createdAt", "desc"));
  unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
    const contacts = snapshot.docs.map((item) => item.data());
    renderList(contactsList, contacts, (item) => `<strong>${item.name}</strong><br><span>${item.phone}</span>`);
  });

  const historyQuery = query(collection(db, "users", uid, "history"), orderBy("createdAt", "desc"));
  unsubHistory = onSnapshot(historyQuery, (snapshot) => {
    const entries = snapshot.docs.map((item) => item.data());
    renderList(historyList, entries, (item) => `<strong>${item.type === "call" ? "Appel" : "Message"}</strong> → ${item.target}<br><small>${item.content || "-"}</small>`);
  });
}

function wireEvents() {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
      showToast("Compte créé avec succès.");
    } catch (error) {
      showToast(normalizeFirebaseError(error));
    }
  });

  loginBtn.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
      showToast("Connexion réussie.");
    } catch (error) {
      showToast(normalizeFirebaseError(error));
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });

  generateBtn.addEventListener("click", generateAvailableNumber);
  claimBtn.addEventListener("click", reserveNumber);
  addContactBtn.addEventListener("click", addContact);

  callBtn.addEventListener("click", async () => {
    const target = callTarget.value.trim();
    if (!formatRegex.test(target)) {
      showToast("Numéro invalide.");
      return;
    }
    await sendHistory("call", target);
    notifyLiquidGlass("Appel", `Vers ${target}`);
  });

  sendMessageBtn.addEventListener("click", async () => {
    const target = messageTarget.value.trim();
    const body = messageBody.value.trim();

    if (!formatRegex.test(target) || !body) {
      showToast("Message invalide.");
      return;
    }

    await sendHistory("message", target, body);
    notifyLiquidGlass("Message", `Envoyé à ${target}`);
    messageBody.value = "";
  });
}

function initAuthStateListener() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
      authCard.classList.remove("hidden");
      dashboard.classList.add("hidden");
      if (unsubContacts) {
        unsubContacts();
        unsubContacts = null;
      }
      if (unsubHistory) {
        unsubHistory();
        unsubHistory = null;
      }
      return;
    }

    authCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    welcome.textContent = `Connecté: ${user.email}`;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { email: user.email, createdAt: serverTimestamp() }, { merge: true });
    }

    phoneNumberInput.value = userSnap.data()?.phoneNumber || "";
    if (!phoneNumberInput.value) await generateAvailableNumber();

    subscribeUserData(user.uid);
  });
}

function boot() {
  if (hasPlaceholderFirebaseConfig()) {
    signupBtn.disabled = true;
    loginBtn.disabled = true;
    configHint.classList.remove("hidden");
    showToast("Configuration Firebase manquante.");
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    wireEvents();
    initAuthStateListener();
  } catch (error) {
    showToast(normalizeFirebaseError(error));
  }
}

boot();
