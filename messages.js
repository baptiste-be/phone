import {
  addDoc,
  auth,
  checkAuth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "./app.js";

const contactsForChat = document.getElementById("contactsForChat");
const chatDirectory = document.getElementById("chatDirectory");
const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageText = document.getElementById("messageText");
const sendBtn = document.getElementById("sendBtn");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");

let contactsCache = [];
let activeChatId = null;
let activePeer = null;
let unsubscribeMessages = null;

function formatDate(ts) {
  const date = ts?.toDate ? ts.toDate() : null;
  if (!date) return "";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, "users", user.uid));
  return { uid: user.uid, email: user.email || "", phoneNumber: snap.data()?.phoneNumber || "" };
}

async function resolveUserByPhone(phone) {
  const q = query(collection(db, "users"), where("phoneNumber", "==", phone));
  const res = await getDocs(q);
  if (res.empty) return null;
  const docSnap = res.docs[0];
  return { uid: docSnap.id, ...docSnap.data() };
}

async function getOrCreateChat(contact) {
  const me = auth.currentUser;
  if (!me) return null;

  const peer = contact.uid ? contact : { ...(await resolveUserByPhone(contact.number)), name: contact.name };
  if (!peer?.uid) {
    chatSubtitle.textContent = "Ce contact n'a pas de compte Phone® actif.";
    return null;
  }

  const existing = await getDocs(query(collection(db, "users", me.uid, "chats"), where("peerUid", "==", peer.uid)));
  if (!existing.empty) {
    const data = existing.docs[0].data();
    return { chatId: existing.docs[0].id, peer: { uid: peer.uid, name: data.peerName || contact.name, phone: data.peerPhone || contact.number } };
  }

  const meProfile = await getCurrentUserProfile();
  const chatId = [me.uid, peer.uid].sort().join("_");
  const now = serverTimestamp();

  await setDoc(doc(db, "chats", chatId), {
    participants: [me.uid, peer.uid],
    createdAt: now,
    updatedAt: now,
    lastMessage: ""
  }, { merge: true });

  await setDoc(doc(db, "users", me.uid, "chats", chatId), {
    peerUid: peer.uid,
    peerName: contact.name || peer.name || peer.email || peer.phoneNumber,
    peerPhone: contact.number || peer.phoneNumber || "",
    updatedAt: now,
    lastMessage: ""
  }, { merge: true });

  await setDoc(doc(db, "users", peer.uid, "chats", chatId), {
    peerUid: me.uid,
    peerName: meProfile?.email || "Contact",
    peerPhone: meProfile?.phoneNumber || "",
    updatedAt: now,
    lastMessage: ""
  }, { merge: true });

  return { chatId, peer: { uid: peer.uid, name: contact.name || peer.name || peer.email || "Contact", phone: contact.number || peer.phoneNumber || "" } };
}

function selectChat(chatId, peer) {
  activeChatId = chatId;
  activePeer = peer;
  chatTitle.textContent = peer?.name ? `Conversation · ${peer.name}` : "Conversation";
  chatSubtitle.textContent = peer?.phone ? `Numéro : ${peer.phone}` : "";
  messageText.disabled = false;
  sendBtn.disabled = false;

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messagesList.innerHTML = "";

    snapshot.forEach((entry) => {
      const msg = entry.data();
      const me = auth.currentUser;
      const li = document.createElement("li");
      li.className = `message-bubble ${msg.from === me?.uid ? "me" : "other"}`;
      li.innerHTML = `<span>${msg.text || ""}</span><small>${formatDate(msg.timestamp)}</small>`;
      messagesList.appendChild(li);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  });
}

async function renderContacts() {
  const me = auth.currentUser;
  if (!me) return;

  const snapshot = await getDocs(query(collection(db, "contacts", me.uid, "list")));
  contactsCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  contactsForChat.innerHTML = "";
  if (!contactsCache.length) {
    contactsForChat.innerHTML = "<li>Aucun contact</li>";
    return;
  }

  contactsCache.forEach((contact) => {
    const li = document.createElement("li");
    li.className = "selectable";
    li.innerHTML = `<strong>${contact.name}</strong><br><span>${contact.number}</span>`;
    li.addEventListener("click", async () => {
      const chat = await getOrCreateChat(contact);
      if (!chat) return;
      selectChat(chat.chatId, chat.peer);
    });
    contactsForChat.appendChild(li);
  });
}

function subscribeDirectory() {
  const me = auth.currentUser;
  if (!me) return;

  const chatsQuery = query(collection(db, "users", me.uid, "chats"), orderBy("updatedAt", "desc"));
  onSnapshot(chatsQuery, (snapshot) => {
    chatDirectory.innerHTML = "";

    if (snapshot.empty) {
      chatDirectory.innerHTML = "<li>Aucune conversation</li>";
      return;
    }

    snapshot.forEach((entry) => {
      const chat = entry.data();
      const li = document.createElement("li");
      li.className = `selectable ${activeChatId === entry.id ? "active" : ""}`;
      li.innerHTML = `<strong>${chat.peerName || "Conversation"}</strong><br><small>${chat.lastMessage || "Aucun message"}</small>`;
      li.addEventListener("click", () => {
        selectChat(entry.id, { uid: chat.peerUid, name: chat.peerName, phone: chat.peerPhone });
      });
      chatDirectory.appendChild(li);
    });
  });
}

async function sendMessage() {
  const me = auth.currentUser;
  if (!me || !activeChatId) return;

  const text = messageText.value.trim();
  if (!text) return;

  const now = serverTimestamp();

  await addDoc(collection(db, "chats", activeChatId, "messages"), {
    from: me.uid,
    text,
    timestamp: now
  });

  await setDoc(doc(db, "chats", activeChatId), { updatedAt: now, lastMessage: text }, { merge: true });

  if (activePeer?.uid) {
    await setDoc(doc(db, "users", me.uid, "chats", activeChatId), { updatedAt: now, lastMessage: text }, { merge: true });
    await setDoc(doc(db, "users", activePeer.uid, "chats", activeChatId), { updatedAt: now, lastMessage: text }, { merge: true });
  }

  messageText.value = "";
}

await checkAuth();
await renderContacts();
subscribeDirectory();

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendMessage();
});
