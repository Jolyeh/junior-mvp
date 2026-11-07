# Campus — bibliothèque numérique universitaire

Monorepo Angular 19 / NestJS 11 / Prisma 7 / PostgreSQL. L'interface est responsive, en bleu nuit et orange.

## Démarrage local

Prérequis : Node.js 22.12+ (ou une version compatible avec Prisma 7), npm, Docker et Docker Compose. Prisma télécharge ses moteurs depuis `binaries.prisma.sh` : ce domaine doit être accessible pendant l'installation et les commandes Prisma.

```sh
npm install
docker compose up -d
cp backend/.env.example backend/.env
# Modifier JWT_SECRET : au moins 32 caractères aléatoires
npm run prisma:generate -w backend
npm run prisma:migrate -w backend -- --name init
# Créer le premier administrateur (utiliser un mot de passe fort et unique)
ADMIN_EMAIL=admin@exemple.org ADMIN_PASSWORD='votre-mot-de-passe-fort' npm run admin -w backend
npm run dev:api
# Dans un autre terminal
npm run dev:web
```

Ouvrir http://localhost:4200. Le serveur Angular transmet `/api` à NestJS sur le port 3000. En production, configurer un proxy inverse HTTPS servant le frontend et transférant `/api` vers le backend. Les fichiers sont enregistrés dans `backend/uploads` au lancement depuis le workspace backend : prévoir un volume privé, persistant et sauvegardé. Ne jamais exposer ce dossier directement.

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
