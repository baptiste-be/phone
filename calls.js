import { addDoc, auth, checkAuth, collection, db, serverTimestamp } from "./app.js";

const callForm = document.getElementById("callForm");
const phoneRegex = /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;

export async function saveCall() {
  const user = auth.currentUser;
  if (!user) return;

  const number = document.getElementById("callNumber").value.trim();
  const type = document.getElementById("callType").value;

  if (!phoneRegex.test(number)) {
    return;
  }

  await addDoc(collection(db, "history", user.uid, "calls"), {
    number,
    type,
    timestamp: serverTimestamp()
  });

  document.getElementById("callNumber").value = "";
}

await checkAuth();

callForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCall();
});
