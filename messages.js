import {
  addDoc,
  auth,
  checkAuth,
  collection,
  db,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "./app.js";

const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageText = document.getElementById("messageText");

export async function sendMessage() {
  const user = auth.currentUser;
  if (!user) return;

  const text = messageText.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages", "global", "texts"), {
    from: user.uid,
    text,
    timestamp: serverTimestamp()
  });

  messageText.value = "";
}

export function subscribeMessages() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "messages", "global", "texts"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    messagesList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const li = document.createElement("li");
      li.className = `message-bubble ${msg.from === user.uid ? "me" : "other"}`;
      li.innerHTML = `<span>${msg.text || ""}</span>`;
      messagesList.appendChild(li);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  });
}

await checkAuth();
subscribeMessages();

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendMessage();
});
