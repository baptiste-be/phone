# Phone®

Phone® est une application web Firebase (Auth + Firestore) avec interface sombre Liquid Glass responsive.

## Fonctionnalités

- Création de compte / connexion
- Génération automatique d’un numéro unique `XX-XX-XX-XX-XX`
- Gestion des contacts
- Messagerie temps réel
- Enregistrement des appels
- Historique en temps réel

## Fichiers

- `login.html` : connexion / création de compte
- `index.html` : accueil utilisateur
- `contact.html` + `contacts.js` : contacts
- `message.html` + `messages.js` : chat global temps réel
- `calls.html` + `calls.js` : enregistrement appels
- `history.html` + `history.js` : historique
- `app.js` : auth Firebase, checkAuth, helpers Firestore
- `style.css` : thème sombre liquid glass

## Structure Firestore

- `users/{uid}` → `email`, `phoneNumber`
- `contacts/{uid}/list/{contactId}` → `{ name, number }`
- `messages/global/texts/{msgId}` → `{ from, text, timestamp }`
- `history/{uid}/calls/{callId}` → `{ number, type, timestamp }`

## Lancer en local

```bash
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173/login.html`.
