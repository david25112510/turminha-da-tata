# Turminha da Tata

## Portal de Matrícula

O portal público `/matricula` oferece formulário mobile-first e aprovação em `/admin/matriculas`. A solicitação fica isolada do domínio operacional até a decisão; a aprovação materializa criança, vínculo e pendências documentais de forma transacional e idempotente.

Sistema de gestão e acompanhamento infantil — área administrativa, portal das cuidadoras e portal dos pais.

Especificação completa: [docs/spec.md](docs/spec.md)
Documentação técnica (arquitetura, modelo de dados, lógica de negócio): [docs/architecture.md](docs/architecture.md)
Preparação para produção: [docs/deploy.md](docs/deploy.md)
Proteção de dados pessoais (LGPD): [docs/lgpd.md](docs/lgpd.md)

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
| `npm run test`          | Testes unitários (Vitest)                           |
| `npm run test:e2e`      | Testes E2E (Playwright) — veja abaixo                |
| `npm run db:migrate`    | Cria/aplica migrations em desenvolvimento           |
| `npm run db:seed`       | Roda o seed (usuário administrador inicial)         |
| `npm run db:studio`     | Abre o Prisma Studio para inspecionar o banco        |
| `npm run db:backup`     | Gera um dump do banco em `./backups`                 |
| `npm run db:restore`    | Restaura um dump (`-- caminho/do/arquivo.dump`)      |
| `npm run icons:generate`| Regenera os ícones do PWA a partir do mascote        |

## Testes E2E

`npm run test:e2e` roda os fluxos críticos (`e2e/*.spec.ts`) num Chromium real contra o servidor de dev:
login por papel, o fluxo completo da cuidadora pelo celular (chegada → alimentação → humor → sono →
timeline) e isolamento de dados entre famílias. Requer Postgres rodando — `e2e/global-setup.ts` cria dados
próprios prefixados `e2e-` antes da suíte e `e2e/global-teardown.ts` os remove depois; nunca toca em dados
reais. Se o servidor de dev já estiver no ar em `http://localhost:3000`, a suíte o reaproveita; senão, sobe
um sozinho. `npm run test:e2e:ui` abre o modo interativo do Playwright para depurar um teste específico.

## CI

`.github/workflows/ci.yml` roda `npm ci`, `npm run lint`, `npm run test` e `npm run build` a cada
push/PR, com um Postgres de serviço. Os testes E2E não rodam no CI ainda — ver o comentário no
próprio workflow para o motivo e como rodá-los localmente.

## Licença

Software proprietário — ver [LICENSE](LICENSE). O repositório é público para fins de consulta e
portfólio; isso não concede permissão de uso, cópia ou redistribuição.
