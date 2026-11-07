# ESM BÉNIN — API

Backend autonome NestJS, Prisma et PostgreSQL. Node.js 22.12 ou supérieur et PostgreSQL sont requis.

```sh
npm ci
cp .env.example .env
# Modifier DATABASE_URL et JWT_SECRET (clé aléatoire de 32 caractères minimum).
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run admin  # une seule fois, après configuration de ADMIN_EMAIL et ADMIN_PASSWORD
npm run start:dev
```

Les dépendances sont dans ce dossier (`node_modules`). Prisma doit pouvoir télécharger ses moteurs depuis `binaries.prisma.sh`. Pour une base existante, sauvegarder et vérifier l'historique des migrations avant d'appliquer le schéma. Le stockage des documents (`uploads`) et la base PostgreSQL doivent également être sauvegardés lors d'un déplacement.

Si PostgreSQL affiche `Authentication failed`, vérifiez `DATABASE_URL` dans `.env` : ces identifiants sont ceux de PostgreSQL, pas du compte ESM BÉNIN. Encodez les caractères spéciaux du mot de passe dans l'URL (par exemple `@` devient `%40`). Vous pouvez tester séparément avec `psql -h localhost -p 5432 -U NOM_UTILISATEUR -d bibliotheque -W`. Ne publiez jamais votre fichier `.env` réel.

Pour les mots de passe oubliés, configurez `FRONTEND_URL` et les variables `SMTP_*` du fichier `.env`. Après la génération Prisma, `npm run build && npm test` exécute les tests avec une base simulée.

### Mise à niveau : documents, matières et filières

**Attention : ce changement élargit aussi l’accès aux documents existants.** Tous les documents d’une matière deviennent visibles par toutes les filières associées à cette matière, quelle que soit leur ancienne filière. Le niveau sert uniquement à informer et filtrer, il ne restreint pas l’accès. Vérifiez ces associations et les documents concernés avant de rouvrir l’accès aux étudiants ; retirez les documents qui ne doivent pas être partagés ainsi. Modifier les filières d’une matière modifie immédiatement l’accès à tous ses documents, y compris les téléchargements directs.

Sur une base existante :
1. Sauvegardez la base et les fichiers `uploads`, puis interrompez l’accès à l’application pendant la mise à niveau. Conservez l’historique local des migrations Prisma. S’il est absent ou incohérent, faites-vous accompagner ; ne réinitialisez pas la base.
2. Générez et appliquez une migration adaptée à cet historique avec `npm run prisma:migrate -- --name documents_par_matiere`, après avoir vérifié le plan. Cette évolution rend `Document.filiereId` facultatif pour conserver l’ancienne filière, maintient `Document.niveauId` facultatif en base afin de préserver les éventuels documents sans niveau, ajoute un index sur `matiereId` et, si elle n’existait pas encore, crée la relation matières–filières. Ne confirmez aucune réinitialisation ni perte de données. L’ancienne filière n’est plus renseignée sur les nouveaux documents. Le niveau est obligatoire à l’ajout, mais ne sert pas aux autorisations. Les éventuels documents sans niveau restent visibles avec « Tous les niveaux » et sont signalés « Niveau non renseigné ».
3. **Uniquement si la reprise initiale des associations n’a pas déjà été effectuée**, exécutez `psql -h HOTE -p PORT -U UTILISATEUR -d BASE -W -f prisma/scripts/backfill-matiere-filieres.sql` avec les paramètres de votre base. Le script récupère les associations déductibles des anciens documents. Ne le relancez pas après avoir modifié les associations : il pourrait rétablir celles qui ont été retirées volontairement.
4. Vérifiez et complétez manuellement les filières de chaque matière, en particulier les matières sans document historique. Puis régénérez le client avec `npm run prisma:generate` et redémarrez l’API. Le champ technique `sortOrder` des niveaux reste en base pour préserver les données existantes.

La migration et la reprise n’ont pas été exécutées dans cet environnement ; elles doivent être testées sur une copie de la base avant la production.

Pour importer des matières, le fichier doit contenir `code,name,filiereIds`. Séparez plusieurs identifiants de filières par `|` ; les identifiants sont visibles dans la liste des filières. Les exports de matières utilisent le même format.
