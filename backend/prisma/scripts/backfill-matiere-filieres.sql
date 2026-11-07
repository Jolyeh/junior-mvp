-- Après création de la table de relation Prisma, conserver les associations
-- déjà présentes dans les documents. Les matières sans document devront être
-- associées manuellement par un gestionnaire.
BEGIN;
INSERT INTO "_FiliereToMatiere" ("A", "B")
SELECT DISTINCT "filiereId", "matiereId" FROM "Document"
ON CONFLICT ("A", "B") DO NOTHING;
COMMIT;
