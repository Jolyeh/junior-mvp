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
