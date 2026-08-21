# Turminha da Tata

Sistema de gestão e acompanhamento infantil — área administrativa, portal das cuidadoras e portal dos pais.

Especificação completa: [docs/spec.md](docs/spec.md)
Preparação para produção: [docs/deploy.md](docs/deploy.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7 · Auth.js v5

## Desenvolvimento local

1. Configure `.env` (veja `.env.example`) com `DATABASE_URL` e `AUTH_SECRET`
2. `npm install`
3. `npx prisma migrate dev` — aplica as migrations no banco local
4. `npm run db:seed` — cria o usuário administrador inicial
5. `npm run dev`

## Scripts úteis

| Comando               | O que faz                                          |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`           | Sobe o servidor de desenvolvimento                  |
| `npm run build`         | Build de produção                                   |
| `npm run db:migrate`    | Cria/aplica migrations em desenvolvimento           |
| `npm run db:seed`       | Roda o seed (usuário administrador inicial)         |
| `npm run db:studio`     | Abre o Prisma Studio para inspecionar o banco        |
| `npm run db:backup`     | Gera um dump do banco em `./backups`                 |
| `npm run db:restore`    | Restaura um dump (`-- caminho/do/arquivo.dump`)      |
| `npm run icons:generate`| Regenera os ícones do PWA a partir do mascote        |
