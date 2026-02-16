import {
  addDoc,
  auth,
  checkAuth,
  collection,
  db,
  getDocs,
  phoneRegex,
  query,
  where
} from "./app.js";

const contactForm = document.getElementById("contactForm");
const contactList = document.getElementById("contactList");

async function resolveUidFromPhone(number) {
  const q = query(collection(db, "users"), where("phoneNumber", "==", number));
  const res = await getDocs(q);
  if (res.empty) return null;
  return res.docs[0].id;
}

export async function addContact() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("contactName").value.trim();
  const number = document.getElementById("contactNumber").value.trim();

  if (!name || !phoneRegex.test(number)) {
    return;
  }

  const uid = await resolveUidFromPhone(number);

  await addDoc(collection(db, "contacts", user.uid, "list"), {
    name,
    number,
    uid: uid || null
  });

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
