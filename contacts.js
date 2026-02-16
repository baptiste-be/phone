import { addDoc, auth, checkAuth, collection, db, getDocs, query } from "./app.js";

const contactForm = document.getElementById("contactForm");
const contactList = document.getElementById("contactList");
const phoneRegex = /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;

export async function addContact() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("contactName").value.trim();
  const number = document.getElementById("contactNumber").value.trim();

  if (!name || !phoneRegex.test(number)) {
    return;
  }

  await addDoc(collection(db, "contacts", user.uid, "list"), { name, number });
  document.getElementById("contactName").value = "";
  document.getElementById("contactNumber").value = "";
  await loadContacts();
}

export async function loadContacts() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "contacts", user.uid, "list"));
  const snapshot = await getDocs(q);

  contactList.innerHTML = "";
  if (snapshot.empty) {
    contactList.innerHTML = "<li>Aucun contact.</li>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `<strong>${data.name}</strong><br>${data.number}`;
    contactList.appendChild(li);
  });
}

await checkAuth();
await loadContacts();

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addContact();
});
