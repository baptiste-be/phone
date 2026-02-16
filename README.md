# Phone®

Application web de communication au style liquid glass (inspiration Apple), avec Firebase.

## Fonctionnalités

- Authentification Email/Mot de passe Firebase.
- Création de compte avec choix optionnel d'un numéro au format `XX-XX-XX-XX-XX` (si disponible).
- Génération aléatoire d'un numéro libre.
- Réservation atomique du numéro dans Firestore.
- Appels/messages avec historique.
- Contacts enregistrés.
- Synchronisation multi-appareils via Firebase.

## Setup

1. Crée un projet Firebase.
2. Active **Authentication > Email/Password**.
3. Crée une base **Cloud Firestore**.
4. Remplace les valeurs de `firebase-config.js`.
5. Lance:

```bash
python3 -m http.server 4173
```

Puis ouvre <http://localhost:4173>.
