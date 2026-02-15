# Liquid Glass Phone

Mini application web "Liquid Glass" pour créer un compte email, réserver un numéro unique au format `XX-XX-XX-XX-XX`, appeler, envoyer des messages, gérer des contacts et voir l'historique, avec Firebase.

## Fonctionnalités

- Authentification Firebase Email / Mot de passe.
- Génération aléatoire d'un numéro non utilisé.
- Réservation atomique du numéro dans Firestore.
- Historique des appels et messages.
- Gestion des contacts.
- Notifications style "liquid glass" (toast + Notifications navigateur).
- Synchronisation multi-appareils via Firebase (auth + Firestore).

## Setup

1. Crée un projet Firebase.
2. Active **Authentication > Email/Password**.
3. Crée une base **Cloud Firestore**.
4. Remplace les valeurs de `firebase-config.js` par tes clés.
5. Lance un serveur local, par exemple:

```bash
python3 -m http.server 4173
```

Puis ouvre <http://localhost:4173>.

## Structure Firestore utilisée

- `users/{uid}`
  - `email`, `phoneNumber`, timestamps
- `phones/{number}`
  - `uid`, `createdAt`
- `users/{uid}/contacts/{contactId}`
- `users/{uid}/history/{entryId}`

## Règles Firestore (exemple simplifié)

À adapter selon ton besoin de sécurité:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /phones/{phoneNumber} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```
