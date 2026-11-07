# ESM BÉNIN — bibliothèque numérique universitaire

Application Angular 21 / NestJS 11 / Prisma 7 / PostgreSQL. Sans Docker ni proxy de développement. Les étudiants accèdent à un catalogue filtré par filière et à leur profil ; les gestionnaires disposent d'une administration distincte.

## Installation locale

Prérequis : Node.js 22.12 ou supérieur compatible avec Prisma 7 et Angular 21, npm et PostgreSQL installé et démarré. Créez la base PostgreSQL et son utilisateur. **Chaque projet est indépendant** : ses dépendances et son `package-lock.json` se trouvent dans son propre dossier. Ne lancez pas `npm ci` à la racine.

Dans un premier terminal, installez et démarrez le backend :

```sh
cd backend
npm ci
cp .env.example .env
# Modifier DATABASE_URL, JWT_SECRET, ADMIN_EMAIL et ADMIN_PASSWORD dans .env.
# JWT_SECRET : clé aléatoire unique d'au moins 32 caractères.
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run admin  # une seule fois pour créer le premier administrateur
npm run start:dev
```

Dans un second terminal, installez et démarrez le frontend :

```sh
cd frontend
npm ci
npm start
```

Les dépendances sont installées dans `backend/node_modules` et `frontend/node_modules`. Vous pouvez déplacer chaque dossier avec son `package.json`, son `package-lock.json` et ses fichiers. Si la machine, le système ou la version de Node change, réinstallez avec `npm ci` : certains modules (par exemple bcrypt) sont compilés pour leur environnement. Après avoir déplacé le backend, vérifiez son fichier `.env` local et régénérez Prisma si nécessaire. Pour un déplacement en production, transférez et sauvegardez aussi la base PostgreSQL et le dossier privé `backend/uploads`.

Depuis la racine uniquement, des raccourcis optionnels restent disponibles : `npm run install:all`, `npm run dev:api`, `npm run dev:web` et `npm run build`. Ils exécutent npm séparément dans chaque projet.

Ouvrir http://localhost:4200. La création de l'administrateur lit ses identifiants depuis `backend/.env` ; les renseigner ne crée pas automatiquement le compte. Modifier `ADMIN_PASSWORD` après sa création ne modifie pas le mot de passe en base. Un compte existant peut changer son mot de passe depuis son profil.

**Attention aux secrets :** le fichier `.env.example` est un modèle partagé ; ne pas y placer de vrais mots de passe. Les valeurs précédemment publiées dans ce fichier doivent être considérées comme compromises et remplacées, y compris les mots de passe PostgreSQL et administrateur. Configurez les valeurs réelles uniquement dans `backend/.env`, ignoré par Git.

### Mise à jour d'une base existante

Cette version ajoute `User.tokenVersion` et la table `PasswordReset`. Sauvegardez d'abord la base. Pour une base de développement existante, après avoir configuré `backend/.env` et régénéré le client, appliquez le schéma avec :

```sh
cd backend
npx prisma db push
```

Vérifiez le plan affiché et **n'acceptez pas de perte de données**. Les anciens jetons seront invalidés : reconnectez-vous. Si vous gérez déjà des migrations Prisma, créez une migration compatible avec votre historique plutôt que d'effacer la base. Aucune migration initiale versionnée n'est fournie ici ; établissez une baseline et des migrations revues avant tout déploiement en production.

### Mot de passe oublié

Configurez `FRONTEND_URL` avec l'origine publique exacte du site et `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, ainsi que `SMTP_USER` et `SMTP_PASS` si votre serveur SMTP exige une authentification. Redémarrez l'API. Sans SMTP configuré ou si l'envoi échoue, aucun courriel n'est envoyé ; l'API donne volontairement la même réponse qu'en cas d'adresse inconnue, pour ne pas révéler l'existence d'un compte. Vérifiez les journaux de l'API et le dossier indésirable, ou contactez votre établissement.

Le lien expire après 30 minutes, ne peut être utilisé qu'une fois et invalide les sessions existantes. Le changement depuis le profil exige l'ancien mot de passe et déconnecte aussi l'utilisateur. Les nouveaux mots de passe étudiants et les réinitialisations exigent **au moins 10 caractères et au maximum 72 octets** ; la création initiale d'un administrateur exige au moins 8 caractères.

### URL et accès à l'API

Par défaut, l'application appelle l'API directement sur le même hôte au port 3000, sans proxy. Pour un autre hébergement, définir l'URL complète de l'API (avec `/api`) dans la balise `campus-api-url` de `frontend/src/index.html`, puis reconstruire le frontend. Dans `backend/.env`, renseigner `FRONTEND_ORIGINS` avec les origines exactes autorisées, séparées par des virgules. Redémarrer l'API après modification. Configurer le serveur de fichiers statiques pour renvoyer `index.html` sur les routes Angular, notamment `/connexion` et `/reset-password`.

`/api/auth/login` accepte uniquement **POST**. Ouvrir l'URL directement dans le navigateur envoie un GET et renvoie `Cannot GET /api/auth/login`. Pour tester :

```sh
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemple.org","password":"votre-mot-de-passe"}'
```

Les PDF sont enregistrés dans `backend/uploads` au lancement depuis le workspace backend. Prévoir un stockage privé, persistant et sauvegardé ; ne jamais exposer ce dossier directement.

### Dépannage de PostgreSQL

`Authentication failed against the database server` signifie que PostgreSQL refuse les identifiants de **DATABASE_URL** dans `backend/.env`. Ce ne sont pas l'e-mail et le mot de passe du compte ESM BÉNIN. L'API vérifie désormais la connexion au démarrage et indique le problème sans afficher les secrets.

1. Vérifiez que PostgreSQL fonctionne et que la base et l'utilisateur indiqués dans `.env` existent.
2. Vérifiez le nom d'utilisateur, le mot de passe, l'hôte, le port et la base dans `DATABASE_URL`. Remplacez les valeurs d'exemple par celles de votre installation ; ne publiez pas ce fichier.
3. Dans l'URL, encodez les caractères spéciaux du mot de passe : `@` devient `%40`, `%` devient `%25` et `#` devient `%23`. L'encodage ne modifie pas le mot de passe PostgreSQL lui-même.
4. Pour vérifier indépendamment de l'application, utilisez `psql -h localhost -p 5432 -U NOM_UTILISATEUR -d bibliotheque -W` en remplaçant le nom et la base par les valeurs de votre configuration. Le mot de passe sera demandé sans être écrit dans la commande. Si cette connexion échoue, corrigez les identifiants ou les droits PostgreSQL avant de redémarrer l'API.

Si la connexion PostgreSQL fonctionne mais que des tables ou colonnes manquent, consultez la section « Mise à jour d'une base existante » et sauvegardez d'abord vos données.

### Dépannage des dépendances

Si `Cannot find module 'rxjs'` apparaît, arrêtez les serveurs et réinstallez **dans le projet concerné**, sans supprimer l'autre :

```sh
# Depuis backend (ou frontend pour l'interface)
rm -rf node_modules
npm ci
# Dans backend uniquement :
npm run prisma:generate
```

Prisma télécharge ses moteurs depuis `binaries.prisma.sh` ; ce domaine doit être accessible. La génération doit réussir avant la compilation du backend. Chaque dossier a son propre fichier `package-lock.json`.

## Gestion et import/export

Le gestionnaire crée les filières, niveaux et matières, puis préautorise les matricules. Les étudiants s'inscrivent avec leur matricule. Les documents sont limités aux PDF de 20 Mo. Le contrôle des filières est appliqué côté API, y compris sur le téléchargement direct.

Les imports CSV/XLSX sont réservés aux gestionnaires, transactionnels (tout ou rien), limités à 5 Mo et 5 000 lignes ; les formules et cellules fusionnées Excel sont refusées. Les archives Excel sont également contrôlées après décompression. Utiliser la première feuille avec ces en-têtes :

- Filières et matières : `code,name`
- Niveaux : `code,name,sortOrder` (ordre facultatif)
- Étudiants : `matricule,firstName,lastName,filiereId,niveauId,isEligible` (statut facultatif ; true/false)

Les identifiants nécessaires à l'import des étudiants sont affichés dans les listes de filières et niveaux. Les codes, matricules et e-mails sont uniques. La suppression d'une donnée utilisée est bloquée.

## Tests

Après génération Prisma :

```sh
cd backend
npm run build
npm test
npm audit --omit=dev
cd ../frontend
npm run build
npm audit --omit=dev
```

Les tests backend utilisent une base simulée ; ils ne remplacent pas des tests d'intégration avec PostgreSQL, SMTP et un navigateur réels.

## Limites à traiter avant production

- **Un matricule seul ne prouve pas l'identité.** Quelqu'un connaissant celui d'un autre étudiant peut s'inscrire à sa place. Ajouter une vérification via le SSO universitaire ou une adresse institutionnelle vérifiée avant de rendre le service public.
- Mettre en place HTTPS, une politique de sécurité navigateur, une analyse antivirus des PDF, des sauvegardes, un journal d'audit et une supervision. Les JWT restent en sessionStorage : une protection XSS est indispensable. La limitation des tentatives est en mémoire, par instance ; utiliser un stockage partagé et une limitation réseau pour plusieurs instances.
- Les imports de documents non fiables doivent être isolés et surveillés malgré les contrôles de taille. Les niveaux et matières ne sont pas liés à une filière dans le modèle validé ; chaque document, lui, est lié à une seule filière.
- Réaliser des tests réels avec PostgreSQL et SMTP et vérifier régulièrement `npm audit` (y compris les dépendances de développement) avant mise en production.
