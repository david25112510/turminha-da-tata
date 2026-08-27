-- Troca o booleano único `imageAuthorized` por 5 categorias de autorização de imagem.
-- Preserva o dado existente: uma autorização geral antiga cobria, na prática, tanto o registro
-- interno quanto a exibição ao responsável (era o único uso que existia) — então vira
-- imageAuthInternal + imageAuthGuardianShare com o mesmo valor. As 3 categorias novas
-- (institucional, redes sociais, publicidade) nascem false para todo mundo, mesmo quem já tinha
-- imageAuthorized=true: autorização geral não vira autorização automática para publicidade.

ALTER TABLE "children" RENAME COLUMN "imageAuthorized" TO "imageAuthInternal";

ALTER TABLE "children" ADD COLUMN "imageAuthGuardianShare" BOOLEAN NOT NULL DEFAULT false;
UPDATE "children" SET "imageAuthGuardianShare" = "imageAuthInternal";

ALTER TABLE "children" ADD COLUMN "imageAuthInstitutional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "children" ADD COLUMN "imageAuthSocialMedia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "children" ADD COLUMN "imageAuthAdvertising" BOOLEAN NOT NULL DEFAULT false;
