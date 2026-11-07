# Préparation Vercel, Supabase et Cloudinary

Cette configuration est en cours de validation : ne pas considérer le service prêt pour la production avant les essais réels ci-dessous. Les secrets doivent être saisis dans les paramètres sécurisés de Vercel, **jamais dans Git ni dans la conversation**. Le dépôt est public. Les valeurs SMTP de l'exemple sont fictives : configurez un service SMTP réel et distinct pour la production.

## Base Supabase

Le projet `esm-benin`, dans la région Europe `eu-west-1`, a été créé vide. Son schéma initial a été appliqué via les migrations Supabase `esm_benin_initial` et `esm_benin_request_limits` ; les tables applicatives ont RLS activé et ne sont pas lisibles par les rôles `anon` et `authenticated`. L'API se connecte via PostgreSQL, pas avec la clé publique Supabase.

Dans le tableau de bord Supabase, réinitialisez le mot de passe de base créé lors du provisionnement, puis copiez la chaîne **Transaction pooler** depuis Connect. Configurez-la sous `DATABASE_URL` dans le projet Vercel backend (pas le frontend). Elle contient un mot de passe. Le pooler est nécessaire pour les fonctions serverless. La base est vide ; aucun compte, aucune filière ni aucun document existant n'ont été migrés.

`backend/prisma/supabase/001_initial.sql` documente l'état initial pour une base **neuve** ; ne l'appliquez pas une deuxième fois. La base créée est suivie par les migrations Supabase et non par un historique Prisma initialisé : ne lancez pas `prisma migrate dev` dessus sans établir au préalable une baseline compatible, sous peine de dérive ou de réinitialisation. Toute évolution future doit faire l'objet d'une migration contrôlée et testée.

## Cloudinary

Configurez le preset `esm_benin` en **signed** sur le cloud `dqxukpj7z` et limitez les fichiers autorisés aux PDF de 20 Mo. La configuration doit permettre le type `authenticated` et les fichiers `raw` ; ne rendez pas ces actifs publics. Renseignez `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_PRESET`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET` uniquement dans le backend Vercel. Ne placez jamais la clé secrète dans le frontend.

Un gestionnaire demande une autorisation signée, le navigateur envoie le PDF directement à Cloudinary, puis l'API contrôle le type authentifié, la taille et l'en-tête PDF avant de publier le document. Chaque lien de lecture est établi après contrôle de la filière et expire après 60 secondes. Un lien peut être partagé pendant sa durée de validité. Le téléchargement direct évite la limite de taille des fonctions Vercel. Une signature d'envoi Cloudinary reste techniquement valable jusqu'à une heure même si le ticket applicatif expire au bout de 15 minutes. Mettez en place une surveillance des actifs abandonnés et un nettoyage périodique des tickets et fichiers non finalisés avant exploitation.

Les anciens fichiers locaux `uploads` ne sont pas transférés automatiquement et ne fonctionneront pas avec cette version. Une migration séparée, avec vérification des associations et de la confidentialité, est nécessaire si une base existante est utilisée.

## Projets Vercel

Créer deux projets liés à ce dépôt, en conservant leurs racines séparées : `backend` pour l'API et `frontend` pour Angular. Le connecteur ne permet pas d'effectuer un premier déploiement sans projet ni déploiement initial ; créez ces projets et lancez leur premier déploiement depuis le tableau de bord Vercel. Le code est configuré pour construire le backend avec `npm run build:vercel` et le frontend avec `npm run build:vercel`. Ne définissez pas de proxy entre les deux projets.

Variables du backend pour l'environnement visé :

- `DATABASE_URL` : URL privée du transaction pooler Supabase.
- `JWT_SECRET` : clé aléatoire unique d'au moins 32 caractères, différente de l'exemple.
- `FRONTEND_ORIGINS` : origine HTTPS exacte du frontend (sans chemin ni slash final).
- `FRONTEND_URL` : URL HTTPS du frontend pour les liens de réinitialisation.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_PRESET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` : configuration décrite plus haut.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` : configuration réelle d'un service SMTP. Sans elle, le mot de passe oublié ne fonctionne pas.

`backend/vercel.json` désactive les helpers Node pour laisser Nest traiter les requêtes et route `/api/*` vers la fonction. La limite de la plateforme pour les requêtes de fonction impose une limite de 4 Mo pour les imports CSV/XLSX ; les PDF (20 Mo) partent directement vers Cloudinary.

Variable du frontend : `FRONTEND_API_URL`, URL HTTPS complète de l'API terminée par `/api`, définie **au moment du build**. Les routes Angular sont réécrites vers `index.html`. Définir des valeurs adaptées séparément pour preview et production puis redéployer après chaque changement. Ne pas exposer `DATABASE_URL`, `JWT_SECRET` ou `CLOUDINARY_API_SECRET` au frontend.

Créez le premier administrateur **une seule fois** depuis un environnement sûr disposant du pooler : configurez `DATABASE_URL`, `ADMIN_EMAIL` et un `ADMIN_PASSWORD` fort, puis lancez `npm ci`, `npm run prisma:generate` et `npm run admin` dans `backend`. N'enregistrez pas ce mot de passe dans le dépôt. L'interface ne crée pas de compte administrateur automatiquement.

## Contrôles avant ouverture

- Vérifier un vrai déploiement Vercel, les origines CORS, les appels depuis le frontend et la mise en veille / reprise du pooler.
- Tester avec un vrai compte Cloudinary : dépôt 20 Mo, contrôle PDF, consultation et téléchargement, expiration du lien, impossibilité d'accès sans signature, suppression et fonctionnement du preset signé. Aucun de ces essais Cloudinary réels n'a encore été effectué.
- Tester l'isolation entre deux filières, les rôles, la limitation des tentatives entre plusieurs instances, les sauvegardes et la restauration.
- Tester les e-mails de réinitialisation avec un véritable SMTP. Renseigner les informations légales et de confidentialité et remplacer l'URL Open Graph relative par l'URL publique définitive.
- Un matricule préimporté seul ne prouve pas l'identité d'un étudiant : ajouter une vérification institutionnelle ou un SSO avant d'exposer des documents sensibles. Prévoir audit, surveillance, antivirus, protection XSS, sauvegardes et traitement des actifs abandonnés.

## Création manuelle de l'administrateur via GitHub Actions

Si la connexion PostgreSQL est bloquée sur l'ordinateur local, le workflow `.github/workflows/create-admin.yml` lance le script depuis GitHub Actions. Il ne s'exécute qu'à la demande, sur `main`, après validation et fusion du code. Il écrit dans la **vraie base de production**.

1. Dans GitHub → Settings → Environments, créer ou configurer l'environnement `production` et limiter ses déploiements à la branche `main` ; ajouter une validation obligatoire si le forfait le permet.
2. Dans les secrets de cet environnement, ajouter `DATABASE_URL` (URI Transaction pooler Supabase complète) et `ADMIN_PASSWORD` (mot de passe administrateur fort, 8 caractères minimum et 72 octets maximum). Ne jamais saisir ces secrets dans les inputs du workflow, les journaux, Git ou la conversation. Utiliser un mot de passe différent de celui de la base.
3. Après fusion dans `main`, ouvrir Actions → **Créer le premier administrateur** → Run workflow, sélectionner `main`, saisir l'e-mail administrateur et lancer. Le job ne prend aucun secret depuis les entrées manuelles.
4. Vérifier le résultat. Le script crée un compte, il ne modifie ni ne réinitialise un compte existant ; une adresse déjà utilisée provoque une erreur. En cas de timeout ou d'erreur ambiguë, vérifier si le compte existe avant de relancer.
5. Supprimer le secret temporaire `ADMIN_PASSWORD` de l'environnement après création et éviter de relancer ce workflow sans nécessité. Conserver `DATABASE_URL` uniquement si une autre tâche GitHub autorisée en a besoin ; sinon le supprimer aussi. Les secrets Vercel sont séparés.

Le workflow utilise des dépendances npm verrouillées et ne fournit les secrets qu'aux étapes qui en ont besoin. Protéger la branche `main`, l'accès aux workflows et l'environnement de production : une personne pouvant modifier le workflow ou exécuter du code avec ces secrets peut accéder à la base.
