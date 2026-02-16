import { auth, checkAuth, collection, db, onSnapshot, orderBy, query } from "./app.js";

const historyList = document.getElementById("historyList");

export function subscribeHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "history", user.uid, "calls"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    historyList.innerHTML = "";
    if (snapshot.empty) {
      historyList.innerHTML = "<li>Aucun appel enregistré.</li>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const call = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `<strong>${call.type || "appel"}</strong> · ${call.number || "-"}`;
      historyList.appendChild(li);
    });
  });
}

await checkAuth();
subscribeHistory();
