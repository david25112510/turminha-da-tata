# Documentação técnica

Referência de arquitetura do sistema Turminha da Tata. Para o comportamento esperado do produto, veja [spec.md](spec.md); para deploy e operação, veja [deploy.md](deploy.md).

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) — nesta versão `middleware.ts` foi renomeado para `proxy.ts` (ver `src/proxy.ts`)
- **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma 7** — a partir da v7 a URL de conexão sai do `schema.prisma` e vai para `prisma.config.ts`; o `PrismaClient` usa um driver adapter (`@prisma/adapter-pg`) em vez de ler `DATABASE_URL` diretamente
- **Auth.js v5** (Credentials provider, sessão JWT)
- **bcryptjs** para hash de senha

Não há camada de API REST/GraphQL separada: toda escrita passa por **Server Actions** do Next.js (funções `"use server"` chamadas diretamente pelos formulários), e toda leitura é feita em Server Components via Prisma diretamente. O único endpoint HTTP tradicional é `src/app/api/auth/[...nextauth]/route.ts`, exigido pelo Auth.js.

## Estrutura de pastas

```
prisma/
  schema.prisma        modelo de dados completo
  migrations/           histórico de migrations
  seed.ts               cria o usuário administrador inicial
src/
  app/
    admin/               área administrativa (role ADMIN)
    cuidadora/            portal das cuidadoras (role CAREGIVER)
    pais/                 portal dos responsáveis (role GUARDIAN)
    login/                autenticação
    api/auth/[...nextauth]/  handler do Auth.js
    manifest.ts           manifest do PWA
    offline/              página de fallback offline
  auth.ts                configuração do Auth.js (providers, callbacks, tipos de sessão)
  proxy.ts               controle de acesso por papel nas rotas /admin, /cuidadora, /pais
  lib/                   lógica de negócio e helpers compartilhados (ver seção própria)
  types/next-auth.d.ts   augmentation de tipos da sessão (id, role)
scripts/                 ferramentas de linha de comando (backup, ícones)
docs/                    spec.md, deploy.md, architecture.md (este arquivo)
public/
  icons/                 ícones do PWA
  uploads/                fotos enviadas (não versionado, disco local)
  sw.js                   service worker
```

Cada portal (`admin`, `cuidadora`, `pais`) tem seu próprio `layout.tsx` com navegação e verificação de sessão, e cada rota que lida com uma criança específica normalmente tem um par `page.tsx` (leitura) + `actions.ts` (escrita) na mesma pasta.

## Modelo de dados

O schema completo está em `prisma/schema.prisma` (38 models/enums). Agrupado por domínio:

### Identidade e acesso
- **User** — conta de login (`email`, `passwordHash`, `role: ADMIN | CAREGIVER | GUARDIAN`, `active`). Contas inativas não conseguem logar (checado em `src/auth.ts`).
- **Guardian** — dados de um responsável; `userId` opcional (1:1 com `User`) só existe se o responsável tiver acesso ao portal dos pais.

### Cadastros
- **Child** — dados da criança **e** as configurações financeiras/de horário (`contractedEntryTime`, `contractedExitTime`, `contractedDays`, `toleranceMinutes`, `monthlyFee`, `overtimeHourRate`, `dueDay`, `imageAuthorized`).
- **GuardianChild** — tabela de junção Guardian↔Child. É aqui que vivem o parentesco, `isPrimary`, `isFinancialResponsible` e **as permissões granulares** (`receiveNotifications`, `viewRoutine`, `viewPhotos`, `authorizeMedication`, `authorizePickup`, `viewFinancial`, `receiveCommunications`) — todas checadas no portal dos pais antes de exibir cada seção.
- **AuthorizedPickupPerson** — pessoa autorizada a retirar a criança, sempre vinculada ao `Guardian` que autorizou.

### Operação (registros diários — a "jornada")
`Attendance`, `HomeDeparture`, `MealRecord`, `SleepRecord`, `HygieneRecord`, `Activity`/`ActivityChild` (N:N, uma atividade pode ter várias crianças), `MoodRecord`, `HealthProfile` (ficha fixa por criança), `HealthLog` (registros de temperatura/observação ao longo do tempo), `MedicationAuthorization`/`MedicationAdministration`, `Incident`, `Photo`.

Todos esses models guardam **quem registrou** (`recordedById`/`administeredById`/etc., FK para `User`) e **quando**, o que sustenta tanto a jornada quanto a auditoria (ver abaixo) sem precisar de uma tabela de log separada.

### Comunicação
- **Announcement** — comunicado publicado pela administração; `target: ALL | GUARDIAN | CHILD` decide se `targetGuardianId`/`targetChildId` são usados. `type: EVENT` com `eventDate` alimenta a Agenda.
- **Notification** — item da central de notificações de um responsável, gerado automaticamente (ver "Pipeline de notificações").

### Financeiro
- **MonthlyInvoice** — fechamento mensal de uma criança (`@@unique([childId, referenceMonth, referenceYear])`), com `monthlyFee`, `overtimeTotal`, `discounts`, `otherCharges`, `totalAmount`, `status`.
- **Payment** — pagamento (parcial ou total) associado a uma invoice.

O detalhamento diário das horas excedentes **não é armazenado** — é sempre recalculado a partir de `Attendance` + configuração da criança (ver `src/lib/financial.ts`). Isso evita duplicar dado e garante que o detalhamento mostrado aos pais e ao admin nunca fique dessincronizado do total.

## Autenticação e controle de acesso

- `src/auth.ts` configura o Credentials provider: `authorize()` delega a `src/lib/verify-credentials.ts` (`verifyCredentials(email, password)`, testável isoladamente com Prisma mockado), que busca o `User` por e-mail, confere `active` e o hash da senha, e retorna `{ id, email, name, role }`. A sessão é JWT; `role` e `id` são propagados no callback `jwt`/`session` e tipados em `src/types/next-auth.d.ts`.
- **Rate limiting no login** (`src/lib/rate-limit.ts`): 5 tentativas falhas por e-mail em uma janela de 15 minutos (em memória, por processo — não sobrevive a restart nem escala para múltiplas instâncias sem um store compartilhado). A checagem principal fica em `src/app/login/actions.ts` (mensagem amigável ao usuário) e a aplicação real acontece dentro de `authorize()`, já que esse é o ponto alcançado por qualquer caminho de login, não só pelo formulário.
- `src/proxy.ts` (equivalente ao antigo `middleware.ts`) mapeia prefixo de rota → papel exigido via `src/lib/access-control.ts` (`requiredRoleForPath`, `isAuthorizedForPath` — funções puras, testadas isoladamente). `/admin` → `ADMIN`, `/cuidadora` → `CAREGIVER`, `/pais` → `GUARDIAN`. Sem sessão, redireciona para `/login?callbackUrl=...`; com papel errado, redireciona para `/login`.
- **Autorização dentro das Server Actions** (`src/lib/authz.ts`): o proxy protege rotas por papel, mas cada Server Action valida por conta própria — nunca depende só do proxy como barreira. Helpers principais: `requireAdmin()` / `requireCaregiver()` / `requireGuardian()` (papel da sessão), `requireActiveChild(childId)` (a criança existe e está ativa), `requireAdminChild(childId)` / `requireCaregiverChild(childId)` (combinação papel + criança), e `requireAuthorizedPickupPerson(childId, personType, personId)`, que resolve um responsável (`GuardianChild`) ou uma pessoa autorizada (`AuthorizedPickupPerson`) cadastrada para aquela criança especificamente — a interface das cuidadoras oferece apenas essas pessoas como opção no registro de entrada/saída, nunca um campo de texto livre.
- Dentro do portal dos pais, o controle de acesso é **duas camadas**: o proxy garante que só um `GUARDIAN` logado entra em `/pais/*`; cada página então usa `src/lib/guardian.ts` (`requireGuardian()`) para carregar os vínculos `GuardianChild` do usuário e checa a permissão específica daquela seção (ex.: `link.viewFinancial`) antes de renderizar dado sensível. `src/lib/authz.ts` também expõe `requireGuardianChildPermission()` para o mesmo padrão em Server Actions do portal dos pais.
- Autorização de imagem (`Child.imageAuthorized`) é checada tanto no upload (`src/lib/photo-actions.ts` recusa se a criança não tiver autorização, e exige papel `ADMIN`/`CAREGIVER`) quanto na exibição (`/pais/fotos` e a jornada só mostram fotos se `viewPhotos && imageAuthorized`).
- Consultas que retornam `User` para a UI usam `select` explícito (nunca o objeto inteiro) para não puxar `passwordHash` desnecessariamente — ver `/admin/configuracoes`.

## Lógica de negócio central

### Jornada (`src/lib/journey.ts`)
`buildTimeline(childId, start, end)` consulta em paralelo todos os models de registro diário do período, normaliza cada um para `{ time, label, detail }` e ordena por horário. É consumida tanto pelo portal das cuidadoras (`/cuidadora/criancas/[id]`, com formulários de registro rápido ao lado) quanto pelo portal dos pais (`/pais/jornada`, somente leitura).

### Pipeline de notificações (`src/lib/notifications.ts`)
`notifyGuardians(childId, type, title, body, requirePermission?)` busca todos os `GuardianChild` daquela criança com `receiveNotifications: true` (e, opcionalmente, uma permissão adicional como `viewFinancial`) e cria uma `Notification` para cada um. É chamada a partir das Server Actions que registram eventos importantes: check-in/check-out (`src/app/cuidadora/actions.ts`), alimentação, fim de soneca, ocorrência (`src/app/cuidadora/criancas/[id]/actions.ts`), upload de foto (`src/lib/photo-actions.ts`) e fechamento de mês (`src/app/admin/financeiro/actions.ts`).

### Cálculo de hora excedente (`src/lib/financial.ts`)
Método de **tolerância como limiar**, não como desconto: se o atraso na saída for menor ou igual à tolerância configurada da criança, não há cobrança; se ultrapassar, cobra-se o atraso **total** em minutos (não só o excedente à tolerância) pelo valor por minuto (`overtimeHourRate / 60`). Essa regra foi validada contra o exemplo exato da especificação (42 min de atraso × R$0,30/min = R$12,60).

`getMonthlyOvertimeBreakdown` aplica esse cálculo a todas as `Attendance` do mês com `checkOutTime`, e `closeMonth` soma ao `monthlyFee` da criança para gerar/atualizar a `MonthlyInvoice` (idempotente via upsert). `effectiveStatus` computa "Vencido" em tempo de leitura quando `dueDate` já passou e o status ainda é `PENDING`/`PARTIALLY_PAID`, sem precisar de um job agendado.

### Auditoria (`src/lib/audit.ts`)
`getRecentActivity(start, end)` não usa uma tabela de log dedicada — agrega os mesmos models operacionais (mais `Payment`/`MonthlyInvoice`) filtrando pelo intervalo, e monta uma entrada por evento com ator, criança e descrição. É o mesmo padrão de dado usado pela jornada, só que sem filtrar por criança e cruzando todos os tipos de registro.

### Dashboard e relatórios (`src/lib/dashboard.ts`, `src/lib/reports.ts`)
O dashboard (`getDashboardData`) calcula indicadores e alertas em tempo real a cada carregamento da página — não há cache/materialização. Os relatórios (`getChildrenReport`, `getRoutineReport`, `getSecurityReport`, `getFinancialReport`) recebem um intervalo de datas e usam principalmente `groupBy` do Prisma para agregações.

## Mapa de rotas

| Portal | Rota | Conteúdo |
|---|---|---|
| Público | `/login` | Autenticação; redireciona por papel após o login |
| Admin | `/admin` | Dashboard (indicadores, rotina do dia, alertas) |
| Admin | `/admin/criancas`, `/admin/criancas/nova`, `/admin/criancas/[id]` | Cadastro, listagem e detalhe (responsáveis, pessoas autorizadas, fotos) |
| Admin | `/admin/responsaveis`, `/admin/responsaveis/novo` | Cadastro e listagem de responsáveis |
| Admin | `/admin/financeiro`, `/admin/financeiro/[childId]` | Visão geral e fechamento mensal por criança |
| Admin | `/admin/comunicados` | Publicação de comunicados/avisos/eventos |
| Admin | `/admin/relatorios` | Relatórios com filtro de período |
| Admin | `/admin/auditoria` | Histórico unificado de ações |
| Admin | `/admin/configuracoes` | Gestão de usuários (ativar/desativar) |
| Cuidadora | `/cuidadora` | Painel do dia (check-in/check-out por criança) |
| Cuidadora | `/cuidadora/criancas/[id]` | Jornada + registro rápido de todos os tipos de evento |
| Pais | `/pais` | Início — status do dia e notificações recentes |
| Pais | `/pais/jornada`, `/pais/fotos`, `/pais/atividades`, `/pais/comunicados`, `/pais/agenda`, `/pais/financeiro` | Cada seção do menu (todas respeitam a permissão correspondente em `GuardianChild`) |

Rotas com `[id]`/`[childId]` são dinâmicas; todas as demais listadas como "Admin"/"Cuidadora"/"Pais" são protegidas pelo `src/proxy.ts`.

## Padrões de código

- **Rótulos em português**: todo enum do Prisma tem seu `_LABELS: Record<string, string>` correspondente em `src/lib/labels.ts` — nunca renderizar o valor bruto do enum na UI.
- **Server Actions**: cada pasta de rota que escreve dado tem seu `actions.ts` com funções `"use server"`, chamadas via `<form action={...}>`. Padrão de validação: checagem simples de campos obrigatórios lançando `Error` (Next.js exibe via error boundary), sem biblioteca de validação de schema.
- **Datas**: `src/lib/date.ts` centraliza `todayRange()`/`todayDateOnly()` (limites do dia local) e formatação (`formatTime`, `formatDuration`).
- **Identidade visual em código**: cores da marca usadas diretamente como classes arbitrárias do Tailwind (`bg-[#FF6F8E]`, `text-[#1FA787]` etc.) e fontes via variáveis CSS (`font-[family-name:var(--font-baloo)]` para títulos, Poppins como corpo). Não há tema Tailwind customizado centralizando essas cores — ver "Dívida técnica".

## Scripts

| Script | Uso |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Cria o usuário administrador inicial (`prisma/seed.ts`) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:backup` / `db:restore` | `scripts/backup-db.mjs` / `restore-db.mjs`, wrappers de `pg_dump`/`pg_restore` |
| `npm run icons:generate` | `scripts/generate-icons.mjs` — gera os ícones do PWA a partir de `design/assets/tata-bust-nobg-full.png` usando `sharp` |

## Dívida técnica e limitações conhecidas

- **Uploads em disco local** (`public/uploads/`): não funciona em hospedagem com múltiplas instâncias ou filesystem somente-leitura (ex. Vercel). Precisa migrar para armazenamento de objetos antes de produção nesses ambientes — detalhado em `deploy.md`.
- **Sem testes automatizados**: toda validação até aqui foi manual (typecheck + build + smoke test via curl/scripts). Cobertura automatizada ainda não existe.
- **Sem rate limiting** no login nem em nenhuma Server Action.
- **Cores da marca hardcoded** em vez de centralizadas no tema do Tailwind — refatoração de baixo risco, mas não feita ainda.
- **Notificações são apenas in-app** (tabela `Notification`, lidas ao abrir `/pais`); não há push/e-mail/SMS.
- **`getDashboardData`/relatórios recalculam tudo a cada request** — não há cache. Para o volume de uma creche isso é não é um problema hoje, mas não escala indefinidamente sem revisão.
- **Alertas de "horas excedentes acumuladas"** no dashboard não têm um limiar configurável — qualquer valor acima de zero aparece como alerta.
