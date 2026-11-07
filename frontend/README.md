# ESM BÉNIN — interface

Application Angular autonome. Node.js 22.12 ou supérieur est requis.

```sh
npm ci
npm start
# ou : npm run build
```

Les dépendances sont installées dans ce dossier (`node_modules`). L'interface appelle directement l'API sur le même hôte au port 3000. Pour une autre adresse, renseignez la balise `campus-api-url` dans `src/index.html` avec l'URL complète incluant `/api`. Configurez aussi `FRONTEND_ORIGINS` dans le backend et redémarrez-le. En production, servez `index.html` pour les routes Angular et utilisez HTTPS.

Si vous déplacez ce dossier vers une autre machine ou un autre système, réinstallez les dépendances avec `npm ci`.

Avant la mise en ligne, complétez les pages « Mentions légales » et « Confidentialité » avec les informations vérifiées de votre établissement. Dans `src/index.html`, remplacez la valeur relative de `og:image` par l'URL publique absolue de `assets/partage.jpg` pour les aperçus des réseaux sociaux.
