# Campus — bibliothèque numérique universitaire

Monorepo Angular 19 / NestJS 11 / Prisma 7 / PostgreSQL. L'interface est responsive, en bleu nuit et orange.

## Démarrage local

Prérequis : Node.js 22.12+ (ou une version compatible avec Prisma 7), npm et PostgreSQL installé et démarré localement. Créez la base `bibliotheque` et l'utilisateur PostgreSQL, puis vérifiez les identifiants et le port dans `backend/.env`. Prisma télécharge ses moteurs depuis `binaries.prisma.sh` : ce domaine doit être accessible pendant l'installation et les commandes Prisma.

```sh
npm install
cp backend/.env.example backend/.env
# Adapter DATABASE_URL et remplacer JWT_SECRET par une clé aléatoire d'au moins 32 caractères.
npm run prisma:generate -w backend
npm run prisma:migrate -w backend -- --name init
# ADMIN_EMAIL et ADMIN_PASSWORD sont lus depuis backend/.env.
# Cette commande crée le compte : les variables seules ne le créent pas.
npm run admin -w backend
npm run dev:api
# Dans un autre terminal
npm run dev:web
```

Ouvrir http://localhost:4200 et utiliser le formulaire « Se connecter ». L'application appelle directement l'API sur le même hôte, port 3000, sans proxy. Pour un autre hébergement, renseigner l'URL complète de l'API (y compris `/api`) dans la balise `campus-api-url` de `frontend/src/index.html`, par exemple `https://api.exemple.org/api`. Après modification, reconstruire le frontend. Dans `backend/.env`, indiquer les origines exactes autorisées à appeler l'API dans `FRONTEND_ORIGINS`, séparées par des virgules, par exemple `https://campus.exemple.org`. Redémarrer l'API après modification. En production, utiliser HTTPS pour les deux services.

La route `/api/auth/login` accepte uniquement **POST**, pas GET : saisir son URL dans un navigateur provoque donc `Cannot GET /api/auth/login`. Pour tester l'API directement :

```sh
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemple.org","password":"votre-mot-de-passe"}'
```

Utiliser l'adresse et le mot de passe du compte effectivement créé avec `npm run admin -w backend`. Cette commande est à exécuter une seule fois par adresse. Si le compte existe déjà, changer `ADMIN_PASSWORD` dans `.env` ne modifie pas son mot de passe dans la base.

Les fichiers sont enregistrés dans `backend/uploads` au lancement depuis le workspace backend : prévoir un stockage privé, persistant et sauvegardé. Ne jamais exposer ce dossier directement.

## Utilisation

L'administrateur crée des filières, niveaux et matières, puis préautorise les étudiants. Il peut téléverser des PDF de 20 Mo maximum. Un étudiant s'inscrit avec un matricule préautorisé, son adresse e-mail et un mot de passe ; le catalogue et les fichiers sont filtrés côté serveur selon sa filière. Les gestionnaires voient tous les documents. La désactivation d'un étudiant ou d'un compte bloque aussi les JWT existants dès la requête suivante.

Les données académiques et étudiants sont modifiables et importables/exportables depuis l'administration. Les imports sont transactionnels (tout ou rien), limités à 5 000 lignes et aux fichiers CSV/XLSX de 5 Mo. Utiliser la première feuille, avec ces en-têtes exacts :

- Filières et matières : `code,name`
- Niveaux : `code,name,sortOrder` (ordre facultatif)
- Étudiants : `matricule,firstName,lastName,filiereId,niveauId,isEligible` (statut facultatif ; true/false)

Les identifiants de filière et niveau sont affichés dans leurs listes et peuvent être repris dans le fichier étudiants. Les codes, matricules et e-mails sont uniques. La suppression d'une catégorie utilisée est bloquée par la base.

## Sécurité et limites avant production

- **Un matricule seul ne prouve pas l'identité** : quelqu'un qui connaît le matricule d'un autre étudiant peut s'enregistrer à sa place. Ajouter une vérification d'identité via SSO universitaire ou code envoyé à une adresse institutionnelle fiable avant utilisation réelle.
- Ajouter limitation de débit sur connexion/inscription, audit, supervision, politique de sauvegarde, protection antivirus des PDF, HTTPS et politique de sécurité du navigateur. Les jetons sont stockés en sessionStorage et expirent après huit heures ; une protection contre les injections XSS reste indispensable.
- Seuls les PDF sont pris en charge actuellement. Les autres formats exigent une validation et un traitement adaptés.
- La bibliothèque `xlsx` disponible sur npm présente des vulnérabilités connues ; remplacer ou isoler le traitement des fichiers non fiables avant tout déploiement public. Auditer également les dépendances avec `npm audit`.
- Les niveaux et matières ne sont pas associés à une filière dans le modèle validé ; les documents, eux, le sont. L'interface ne fait pas de routage Angular ni de guards côté client ; l'autorisation est appliquée par les guards NestJS.
