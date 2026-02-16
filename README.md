# Phone®

Application web complète Firebase (Authentication + Firestore) avec interface sombre Liquid Glass floue et responsive.

## Fonctionnalités

- Connexion / création de compte
- Attribution automatique d’un numéro Phone® unique au format `XX-XX-XX-XX-XX`
- Contacts personnels
- Messagerie réelle basée sur les contacts
- Répertoire des anciennes conversations
- Enregistrement d’appels
- Historique des appels en temps réel

## Architecture

- `app.js` : module central Firebase + auth + génération/réservation de numéro + exports Firestore
- `login.html` : page d’authentification
- `index.html` : tableau d’accueil + navigation
- `contact.html` / `contacts.js` : gestion des contacts
- `message.html` / `messages.js` : messagerie (contacts, conversations, messages)
- `calls.html` / `calls.js` : enregistrement des appels
- `history.html` / `history.js` : historique des appels
- `style.css` : design global Liquid Glass (flou, transparence, responsive)

## Structure Firestore

- `users/{uid}`
  - `email`
  - `phoneNumber`
- `phones/{number}`
  - `uid`
- `contacts/{uid}/list/{contactId}`
  - `name`, `number`, `uid`
- `users/{uid}/chats/{chatId}`
  - `peerUid`, `peerName`, `peerPhone`, `lastMessage`, `updatedAt`
- `chats/{chatId}`
  - `participants[]`, `lastMessage`, `updatedAt`
- `chats/{chatId}/messages/{messageId}`
  - `from`, `text`, `timestamp`
- `history/{uid}/calls/{callId}`
  - `number`, `type`, `timestamp`

## Lancer localement

```bash
python3 -m http.server 4173
```

Ouvrir ensuite `http://localhost:4173/login.html`.
