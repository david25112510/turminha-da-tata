# Documentação técnica

Referência de arquitetura do sistema Turminha da Tata. Para o comportamento esperado do produto, veja [spec.md](spec.md); para deploy e operação, veja [deploy.md](deploy.md); para proteção de dados pessoais, veja [lgpd.md](lgpd.md).

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
    pais/
      (portal)/            rotas normais do portal (route group — não aparece na URL)
      contrato/            tela de aceite, fora do route group de propósito
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
  uploads/                fotos enviadas quando não há storage S3/R2 configurado (não versionado, disco local)
  sw.js                   service worker
```

Cada portal (`admin`, `cuidadora`, `pais`) tem seu próprio `layout.tsx` com navegação e verificação de sessão, e cada rota que lida com uma criança específica normalmente tem um par `page.tsx` (leitura) + `actions.ts` (escrita) na mesma pasta.

## Modelo de dados

O schema completo está em `prisma/schema.prisma` (51 models/enums — número cresce; ver o arquivo
para a lista completa e atualizada). Agrupado por domínio:

### Identidade e acesso
- **User** — conta de login (`email`, `passwordHash`, `role: ADMIN | CAREGIVER | GUARDIAN`, `active`). Contas inativas não conseguem logar (checado em `src/auth.ts`).
- **Guardian** — dados de um responsável; `userId` opcional (1:1 com `User`) só existe se o responsável tiver acesso ao portal dos pais.

### Cadastros
- **Child** — dados da criança **e** as configurações financeiras/de horário (`contractedEntryTime`, `contractedExitTime`, `contractedDays`, `toleranceMinutes`, `monthlyFee`, `overtimeHourRate`, `dueDay`, `imageAuthorized`).
- **GuardianChild** — tabela de junção Guardian↔Child. É aqui que vivem o parentesco, `isPrimary`, `isFinancialResponsible` e **as permissões granulares** (`receiveNotifications`, `viewRoutine`, `viewPhotos`, `authorizeMedication`, `authorizePickup`, `viewFinancial`, `receiveCommunications`) — todas checadas no portal dos pais antes de exibir cada seção.
- **AuthorizedPickupPerson** — pessoa autorizada a retirar a criança, sempre vinculada ao `Guardian` que autorizou.

### Operação (registros diários — a "jornada")
`Attendance`, `HomeDeparture`, `MealRecord`, `SleepRecord`, `HygieneRecord`, `WaterRecord`, `Activity`/`ActivityChild` (N:N, uma atividade pode ter várias crianças), `MoodRecord`, `HealthProfile` (ficha fixa por criança), `HealthLog` (registros de temperatura/observação ao longo do tempo), `MedicationAuthorization`/`MedicationAdministration`, `Incident`, `Photo`.

Todos esses models guardam **quem registrou** (`recordedById`/`administeredById`/etc., FK para `User`) e **quando**, o que sustenta tanto a jornada quanto a parte operacional da auditoria (ver "Auditoria" abaixo) sem precisar de uma tabela de log dedicada para esses eventos. `Attendance` também guarda `checkInGuardianId`/`checkInAuthorizedPickupPersonId` (e os equivalentes de saída) — FK opcional para o `Guardian`/`AuthorizedPickupPerson` resolvido pelo servidor no check-in/check-out, além do snapshot de nome/parentesco já existente (mantido para preservar o histórico mesmo se o cadastro da pessoa mudar depois).

### Comunicação
- **Announcement** — comunicado publicado pela administração; `target: ALL | GUARDIAN | CHILD` decide se `targetGuardianId`/`targetChildId` são usados. `type: EVENT` com `eventDate` alimenta a Agenda.
- **Notification** — item da central de notificações de um responsável, gerado automaticamente (ver "Pipeline de notificações").

### Financeiro
- **MonthlyInvoice** — fechamento mensal de uma criança (`@@unique([childId, referenceMonth, referenceYear])`), com `monthlyFee`, `overtimeTotal`, `discounts`, `otherCharges`, `totalAmount`, `status`. Imutável depois de `PAID`/`PARTIALLY_PAID`/`CANCELLED` (ver "Cálculo de hora excedente" abaixo).
- **InvoiceItem** — a fotografia de cada item que compôs o total no momento do fechamento (`MONTHLY_FEE`, um `OVERTIME` por dia com excedente, `DISCOUNT`/`OTHER` quando informados, e `CREDIT`/`DEBIT`/`ADJUSTMENT` para lançamentos posteriores via `applyInvoiceAdjustment`). Itens de excedente guardam a data original em `metadata.date` (ISO) — é o que `getMonthlyOvertimeBreakdown` lê de volta.
- **Payment** — pagamento (parcial ou total) associado a uma invoice.

O detalhamento diário das horas excedentes é **congelado em `InvoiceItem` no momento do fechamento** (`closeMonth`, em `src/lib/financial.ts`) — uma vez que existe `MonthlyInvoice` para o período, `getMonthlyOvertimeBreakdown` lê esse snapshot em vez de recalcular a partir de `Attendance`, então o detalhamento mostrado aos pais e ao admin nunca diverge do total da fatura, mesmo que dados de presença mudem depois. Só recalcula ao vivo quando ainda não existe fatura para o período (mês corrente/aberto).

### Auditoria
- **AuditLog** — trilha estruturada de mutações administrativas: `actorUserId`, `action`, `entity`/`entityId`, `oldData`/`newData` (JSON), `ip`, `userAgent`, `createdAt`. Escrita só por `recordAuditLog()` (`src/lib/audit-log.ts`), nunca diretamente pelas rotas — ver "Pipeline de notificações"-equivalente em "Lógica de negócio central".

### Contrato digital
- **ContractVersion** — o texto do contrato (`content`, texto plano) numa versão nomeada (`"1.0"`, `"2.0"`...) e um `status: DRAFT | PUBLISHED | ARCHIVED`. Só uma versão fica `PUBLISHED` por vez; publicar uma nova arquiva a anterior, nunca a edita ou apaga.
- **ContractAcceptance** — o aceite de **um** responsável para **uma** criança numa **versão específica** do contrato (`@@unique([childId, guardianId, versionId])` — nunca sobrescrito, é assim que o histórico entre versões se preserva). Guarda `status: PENDING | ACCEPTED | CANCELLED`, `acceptedAt`/`acceptedByUserId`/`ip`/`userAgent`, e a assinatura manuscrita (`signatureUrl`, `signedAt`, `documentHash` — SHA-256 de versão+conteúdo+criança+responsável+assinatura, verificação de integridade simples, não criptográfica).

### Consentimento LGPD
- **ConsentVersion**/**ConsentAcceptance** — mesmo desenho do contrato digital acima (versão publicada, aceite com assinatura/hash/IP/userAgent), mas por **responsável**, não por par criança/responsável (`@@unique([guardianId, versionId])`) — o consentimento é sobre o tratamento dos dados pessoais do próprio titular, não faz sentido duplicar por filho. Distinto tanto do contrato de prestação de serviços quanto de `Child.imageAuthorized` — ver `docs/lgpd.md` para a finalidade de cada um dos três.

## Autenticação e controle de acesso

- `src/auth.ts` configura o Credentials provider: `authorize()` delega a `src/lib/verify-credentials.ts` (`verifyCredentials(email, password)`, testável isoladamente com Prisma mockado), que busca o `User` por e-mail, confere `active` e o hash da senha, e retorna `{ id, email, name, role }`. A sessão é JWT; `role` e `id` são propagados no callback `jwt`/`session` e tipados em `src/types/next-auth.d.ts`.
- **MFA (TOTP) para ADMIN**: `User.totpSecret`/`User.totpEnabled` (`totpSecret` fica em texto plano — não dá para hashear um segredo TOTP, já que ele precisa ser lido de volta a cada verificação). `src/lib/totp.ts` implementa RFC 6238/4226 do zero (HMAC-SHA1, Base32, `otpauth://` Key URI), sem dependência externa, testado contra os vetores oficiais do RFC 4226 Apêndice D. A decisão "este login exige código?" é extraída para `src/lib/mfa.ts` (`checkMfaRequirement(userId, role, totpCode)`) justamente para ser testável sem construir a instância inteira do NextAuth — `authorize()` chama essa função depois de validar a senha e, se falhar, trata como credencial inválida (mesmo caminho de erro genérico, não distingue "senha errada" de "código errado"). Mesmo padrão dual-check do rate limiting: `src/app/login/actions.ts` faz um pré-check sem efeito colateral (decide só se mostra o segundo passo do formulário) e a aplicação real está sempre dentro de `authorize()`. Ativação/desativação ficam em `/admin/configuracoes` (`TotpSettings`): gerar o segredo não grava nada — só `confirmTotpEnrollmentAction` grava `totpSecret`+`totpEnabled` juntos, depois de validar um código real gerado a partir dele (garante que o admin realmente configurou o app antes de travar a própria conta); desativar exige a senha atual (reautenticação), mesmo padrão de trocar a senha.
- **Recuperação de senha** (`/esqueci-senha`, `/redefinir-senha`): `src/lib/password-reset.ts` gera um token de 256 bits (`crypto.randomBytes(32)`), persiste só o hash SHA-256 dele (`PasswordResetToken.tokenHash`), com TTL de 1h e uso único (`usedAt`). A resposta de `/esqueci-senha` é sempre a mesma (existindo ou não o e-mail) — evita enumeração de contas. O e-mail é enviado via `src/lib/email.ts` (API HTTP da Resend); sem `RESEND_API_KEY`/`EMAIL_FROM` configurados, o token ainda é gerado mas o e-mail não sai (só log no servidor — ver `deploy.md`).
- **Rate limiting no login** (`src/lib/rate-limit.ts`): 5 tentativas falhas por e-mail em uma janela de 15 minutos. Usa Upstash Redis (REST, sem SDK — mesmo padrão de `src/lib/email.ts`) quando `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estão configurados; sem isso, cai para um Map em memória do processo (não sobrevive a restart, não escala para múltiplas instâncias — ver `docs/deploy.md`). A checagem principal fica em `src/app/login/actions.ts` (mensagem amigável ao usuário) e a aplicação real acontece dentro de `authorize()`, já que esse é o ponto alcançado por qualquer caminho de login, não só pelo formulário.
- `src/proxy.ts` (equivalente ao antigo `middleware.ts`) mapeia prefixo de rota → papel exigido via `src/lib/access-control.ts` (`requiredRoleForPath`, `isAuthorizedForPath` — funções puras, testadas isoladamente). `/admin` → `ADMIN`, `/cuidadora` → `CAREGIVER`, `/pais` → `GUARDIAN`. Sem sessão, redireciona para `/login?callbackUrl=...`; com papel errado, redireciona para `/login`.
- **Autorização dentro das Server Actions** (`src/lib/authz.ts`): o proxy protege rotas por papel, mas cada Server Action valida por conta própria — nunca depende só do proxy como barreira. Helpers principais: `requireAdmin()` / `requireCaregiver()` / `requireGuardian()` (papel da sessão), `requireActiveChild(childId)` (a criança existe e está ativa), `requireAdminChild(childId)` / `requireCaregiverChild(childId)` (combinação papel + criança), e `requireAuthorizedPickupPerson(childId, personType, personId)`, que resolve um responsável (`GuardianChild`) ou uma pessoa autorizada (`AuthorizedPickupPerson`) cadastrada para aquela criança especificamente — a interface das cuidadoras oferece apenas essas pessoas como opção no registro de entrada/saída, nunca um campo de texto livre.
- Dentro do portal dos pais, o controle de acesso é **duas camadas**: o proxy garante que só um `GUARDIAN` logado entra em `/pais/*`; cada página então usa `src/lib/guardian.ts` (`requireGuardian()`) para carregar os vínculos `GuardianChild` do usuário e checa a permissão específica daquela seção (ex.: `link.viewFinancial`) antes de renderizar dado sensível. `src/lib/authz.ts` também expõe `requireGuardianChildPermission()` para o mesmo padrão em Server Actions do portal dos pais.
- **Bloqueio por contrato pendente**: `src/app/pais/(portal)/` é um *route group* do Next — não aparece na URL (`(portal)/jornada/page.tsx` continua servindo `/pais/jornada`), mas isola o `layout.tsx` que checa `ContractAcceptance` pendente e redireciona para `/pais/contrato` quando há alguma. `/pais/contrato` (fora do grupo) não herda esse layout — por isso nunca entra em loop de redirecionamento e continua acessível mesmo com contrato pendente.
- Autorização de imagem (`Child.imageAuthorized`) é checada tanto no upload (`src/lib/photo-actions.ts` recusa se a criança não tiver autorização, e exige papel `ADMIN`/`CAREGIVER`) quanto na exibição (`/pais/fotos` e a jornada só mostram fotos se `viewPhotos && imageAuthorized`).
- Consultas que retornam `User` para a UI usam `select` explícito (nunca o objeto inteiro) para não puxar `passwordHash` desnecessariamente — ver `/admin/configuracoes`.

## Lógica de negócio central

### Jornada (`src/lib/journey.ts`)
`buildTimeline(childId, start, end)` consulta em paralelo todos os models de registro diário do período, normaliza cada um para `{ time, label, detail }` e ordena por horário. É consumida tanto pelo portal das cuidadoras (`/cuidadora/criancas/[id]`, com formulários de registro rápido ao lado) quanto pelo portal dos pais (`/pais/jornada`, somente leitura).

### Pipeline de notificações (`src/lib/notifications.ts`)
`notifyGuardians(childId, type, title, body, requirePermission?)` busca todos os `GuardianChild` daquela criança com `receiveNotifications: true` (e, opcionalmente, uma permissão adicional como `viewFinancial`) e cria uma `Notification` para cada um. É chamada a partir das Server Actions que registram eventos importantes: check-in/check-out (`src/app/cuidadora/actions.ts`), alimentação, fim de soneca, ocorrência (`src/app/cuidadora/criancas/[id]/actions.ts`), upload de foto (`src/lib/photo-actions.ts`) e fechamento de mês (`src/app/admin/financeiro/actions.ts`).

Canal externo por guardian: push é a preferência (`sendPushToGuardian`, `src/lib/push.ts`); quando esse guardian não tem nenhuma `PushSubscription` registrada (nunca habilitou push naquele dispositivo — `sendPushToGuardian` retorna `false` nesse caso específico, não em falha de entrega de uma assinatura já existente), cai para e-mail via `src/lib/email.ts` (mesma configuração Resend da recuperação de senha), se `Guardian.email` existir. Nunca os dois juntos, e sem nenhum dos dois se nem push nem Resend estiverem configurados — só a `Notification` in-app, sempre criada independente de canal externo.

### Cálculo de hora excedente (`src/lib/financial.ts`)
Método de **tolerância como dedução**, não como limiar: o atraso bruto (saída real − horário contratado) tem a tolerância **subtraída**, nunca negativo — passar 1 minuto da tolerância cobra 1 minuto, não o atraso inteiro. Valor por minuto: `overtimeHourRate / 60`. Exemplo (17:30 contratado, tolerância 15 min, R$15,00/h, saída 17:50): 20 min de atraso bruto − 15 min de tolerância = 5 min cobrados × R$0,25/min = R$1,25 — mesmo exemplo de `docs/spec.md` §29, mesma regra coberta caso a caso em `src/lib/financial.test.ts`.

`getMonthlyOvertimeBreakdown` aplica esse cálculo a todas as `Attendance` do mês com `checkOutTime`, e `closeMonth` soma ao `monthlyFee` da criança para gerar/atualizar a `MonthlyInvoice` (upsert). Uma fatura já `PAID`, `PARTIALLY_PAID` ou `CANCELLED` é imutável: `closeMonth` recusa recalcular (lança erro) em vez de sobrescrever silenciosamente — só faturas `PENDING`/`OVERDUE` (ou inexistentes) podem ser (re)fechadas. `effectiveStatus` computa "Vencido" em tempo de leitura quando `dueDate` já passou e o status ainda é `PENDING`/`PARTIALLY_PAID`, sem precisar de um job agendado.

### Pagamento via Pix (`src/lib/mercadopago.ts`)
Integração com a API HTTP do Mercado Pago (sem SDK — mesmo padrão de `src/lib/email.ts`/`src/lib/push.ts`, um `fetch` direto). `isMercadoPagoConfigured()` checa só `MERCADO_PAGO_ACCESS_TOKEN`; sem ele, o botão "Pagar com Pix" simplesmente não aparece no Portal dos Pais — o app funciona igual sem esse recurso.

No portal dos pais, `generatePixChargeAction` (`src/app/pais/(portal)/financeiro/actions.ts`) gera uma cobrança Pix pelo **saldo em aberto** da fatura (não o total, para já contemplar pagamentos parciais anteriores) e grava um `PixCharge` (`invoiceId`, `externalPaymentId` do Mercado Pago, QR code + código copia-e-cola, `expiresAt`). Idempotente por reaproveitamento: se já existir uma `PixCharge` `pending` ainda não expirada para aquela fatura, ela é devolvida em vez de criar outra no Mercado Pago — evita cobranças duplicadas em cliques repetidos.

**A confirmação nunca vem do cliente** — só do webhook `POST /api/webhooks/mercadopago` (`src/app/api/webhooks/mercadopago/route.ts`), que valida a assinatura HMAC-SHA256 do Mercado Pago (`verifyMercadoPagoSignature`, header `x-signature`; pulada se `MERCADO_PAGO_WEBHOOK_SECRET` não estiver configurado — aceitável só em dev local), consulta o pagamento de verdade via API (nunca confia no payload da notificação sozinho) e, se `approved`, credita o valor da `PixCharge` na fatura (cria `Payment` com `method: "PIX"`, atualiza `paidAmount`/`status`, marca a `PixCharge` como `approved`) dentro de uma transação. Idempotente contra reenvio do mesmo evento (uma `PixCharge` já `approved` é ignorada na segunda notificação) e recusa creditar faturas já `CANCELLED`. Notifica os responsáveis (`FINANCIAL`) na confirmação, mesmo pipeline de `src/lib/notifications.ts`.

O admin só visualiza as cobranças Pix de cada fatura (somente leitura, em `/admin/financeiro/[childId]`) — quem gera a cobrança é sempre o responsável, no Portal dos Pais.

### Auditoria (`src/lib/audit.ts`, `src/lib/audit-log.ts`)
`getRecentActivity(start, end)` combina duas fontes: os models operacionais (mais `Payment`/`MonthlyInvoice`), agregados por intervalo como antes, **e** a tabela dedicada `AuditLog` (via `getAuditLogEntries`), que registra `actorUserId`, `entity`/`entityId`, `oldData`/`newData` (JSON) e IP/user-agent para as mutações administrativas sensíveis — cadastro de criança, cadastro/permissões de responsável, pessoa autorizada, fechamento de mês, pagamento, ativar/desativar usuário. `recordAuditLog()` em `src/lib/audit-log.ts` é chamado a partir de cada Server Action correspondente (nunca dentro de código de leitura); falha ao gravar o log não derruba a operação principal (try/catch com log em `console.error`). As duas fontes são mescladas e ordenadas antes de chegar em `/admin/auditoria`.

Desde a auditoria de rotina (`src/app/cuidadora/actions.ts`, `src/app/cuidadora/criancas/[id]/actions.ts`), toda entrada/saída de criança (`CHILD_CHECK_IN`/`CHILD_CHECK_OUT`) e todo registro da timeline diária (`ROUTINE_MEAL_CREATED`, `ROUTINE_SLEEP_STARTED`/`ROUTINE_SLEEP_ENDED`, `ROUTINE_HYGIENE_CREATED`, `ROUTINE_WATER_CREATED`, `ROUTINE_MOOD_CREATED`, `ROUTINE_HEALTH_CREATED`, `ROUTINE_INCIDENT_CREATED`, `ROUTINE_MEDICATION_CREATED`, `ROUTINE_ACTIVITY_CREATED`) também grava `AuditLog`, com `actorUserId` sendo sempre a cuidadora autenticada.

### Consentimento LGPD (`src/lib/consent.ts`, `src/app/pais/consentimento/`)
`ensureConsentAcceptance({ guardianId, actorUserId })` espelha `ensureContractAcceptance` (mesmo bootstrap preguiçoso da versão `PUBLISHED` a partir de `src/lib/consent-template.ts`) e é chamada logo depois dela em `createGuardianAction`. O wizard de aceite (ler → assinar → confirmar) e o próprio `SignaturePad` são reaproveitados do contrato via um componente genérico, `src/components/tata/DocumentAcceptanceWizard.tsx` — `ContractAcceptanceCard.tsx` e `ConsentAcceptanceCard.tsx` são hoje wrappers finos dele, cada um só passando os textos/rótulos específicos do seu documento. `acceptConsentAction` segue o mesmo padrão de hash/idempotência de `acceptContractAction`. O bloqueio do portal (`src/app/pais/(portal)/layout.tsx`) checa contrato pendente primeiro, consentimento depois — se os dois estiverem pendentes, o responsável só vê o consentimento na navegação seguinte ao aceitar o contrato.

### Contrato digital (`src/lib/contract.ts`, `src/app/pais/contrato/`, `src/app/admin/contratos/`)
`ensureContractAcceptance({ childId, guardianId, actorUserId })` é chamada uma única vez, dentro de `createGuardianAction` (`src/app/admin/responsaveis/actions.ts`), logo depois de criar o vínculo `GuardianChild` — é o único lugar do código que cria esse vínculo hoje. Ela busca a `ContractVersion` `PUBLISHED` atual (criando a `"1.0"` com o texto padrão de `src/lib/contract-template.ts` na primeira vez que for necessária — bootstrap preguiçoso, sem passo de seed separado) e garante uma `ContractAcceptance` `PENDING` para aquele par criança/responsável.

A assinatura manuscrita é um componente próprio (`src/components/tata/SignaturePad.tsx`, canvas + Pointer Events, sem dependência externa) consumido por um wizard de 3 passos (`ContractAcceptanceCard.tsx`: ler → assinar → confirmar) que só envia ao servidor uma vez, no fim. `acceptContractAction` decodifica o PNG (base64), reaproveita `uploadFile()` de `src/lib/storage.ts` (mesmo mecanismo das fotos), calcula o `documentHash` e é idempotente — uma segunda chamada para uma `ContractAcceptance` já `ACCEPTED` retorna sem efeito (cobre duplo clique e duas abas abertas, sem precisar de lock/transação).

Publicar uma nova versão (`publishNewVersionAction`, admin) arquiva a atual, cria a próxima, e gera `ContractAcceptance` `PENDING` só para vínculos `GuardianChild` **ativos** que ainda não têm aceite dessa versão — aceites de versões antigas nunca são tocados.

### Dashboard e relatórios (`src/lib/dashboard.ts`, `src/lib/reports.ts`)
O dashboard (`getDashboardData`) calcula indicadores e alertas em tempo real a cada carregamento da página — não há cache/materialização. Os relatórios (`getChildrenReport`, `getRoutineReport`, `getSecurityReport`, `getFinancialReport`) recebem um intervalo de datas e usam principalmente `groupBy` do Prisma para agregações.

## Mapa de rotas

| Portal | Rota | Conteúdo |
|---|---|---|
| Público | `/login` | Autenticação; redireciona por papel após o login |
| Público | `/esqueci-senha`, `/redefinir-senha` | Recuperação de senha por e-mail (token de uso único, 1h de validade) |
| Admin | `/admin` | Dashboard (indicadores, rotina do dia, alertas) |
| Admin | `/admin/criancas`, `/admin/criancas/nova`, `/admin/criancas/[id]`, `/admin/criancas/[id]/editar` | Cadastro, listagem, detalhe (responsáveis, pessoas autorizadas, fotos) e edição dos campos operacionais/contratuais (identidade — nome, CPF, sexo, data de nascimento — não é editável por lá) |
| Admin | `/admin/responsaveis`, `/admin/responsaveis/novo` | Cadastro e listagem de responsáveis |
| Admin | `/admin/financeiro`, `/admin/financeiro/[childId]` | Visão geral e fechamento mensal por criança |
| Admin | `/admin/comunicados` | Publicação de comunicados/avisos/eventos |
| Admin | `/admin/relatorios` | Relatórios com filtro de período |
| Admin | `/admin/auditoria` | Histórico unificado de ações |
| Admin | `/admin/configuracoes` | Gestão de usuários (ativar/desativar) |
| Admin | `/admin/contratos`, `/admin/contratos/[id]` | Lista com busca/filtro (status, período), detalhe com conteúdo + assinatura, publicação de nova versão |
| Cuidadora | `/cuidadora` | Painel do dia (check-in/check-out por criança) |
| Cuidadora | `/cuidadora/criancas/[id]` | Jornada + registro rápido de todos os tipos de evento |
| Pais | `/pais/contrato` | Fora do route group `(portal)` — tela de aceite (ler, assinar, confirmar), sempre acessível independente de pendência |
| Pais | `/pais/consentimento` | Fora do route group `(portal)` — mesmo wizard, para o termo LGPD; checada depois do contrato no layout |
| Pais | `/pais` | Início — status do dia e notificações recentes |
| Pais | `/pais/jornada`, `/pais/fotos`, `/pais/atividades`, `/pais/comunicados`, `/pais/agenda`, `/pais/financeiro`, `/pais/documentos`, `/pais/documentos/[acceptanceId]` | Cada seção do menu (todas respeitam a permissão correspondente em `GuardianChild`; `documentos` lista os contratos já aceitos) |

Rotas com `[id]`/`[childId]`/`[acceptanceId]` são dinâmicas; todas as demais listadas como "Admin"/"Cuidadora"/"Pais" são protegidas pelo `src/proxy.ts`. As rotas de `/pais/*` (exceto `/pais/contrato`) vivem em `src/app/pais/(portal)/` — ver "Bloqueio por contrato pendente" acima.

## Padrões de código

- **Rótulos em português**: todo enum do Prisma tem seu `_LABELS: Record<string, string>` correspondente em `src/lib/labels.ts` — nunca renderizar o valor bruto do enum na UI.
- **Server Actions**: cada pasta de rota que escreve dado tem seu `actions.ts` com funções `"use server"`, chamadas via `<form action={...}>`. Padrão de validação: checagem simples de campos obrigatórios lançando `Error` (Next.js exibe via error boundary), sem biblioteca de validação de schema.
- **Datas**: `src/lib/date.ts` centraliza `todayRange()`/`todayDateOnly()` (limites do dia local) e formatação (`formatTime`, `formatDuration`).
- **Identidade visual em código**: tokens de design centralizados em `src/app/globals.css` (`--color-tata-*` — verde/amarelo/coral/azul/lilás com variantes soft/dark, `--radius-tata-*`, `--shadow-tata-card`/`-hover`, `--ease-tata`, animações `tata-animate-in`/`tata-animate-pop`/`tata-mascot-idle`), consumidos via classes Tailwind (`bg-tata-green`, `shadow-tata-card` etc.) — não mais cores arbitrárias soltas pelo código. Fontes via variáveis CSS (`font-[family-name:var(--font-baloo)]` para títulos, Poppins como corpo).

## Scripts

| Script | Uso |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Cria o usuário administrador inicial (`prisma/seed.ts`) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:backup` / `db:restore` | `scripts/backup-db.mjs` / `restore-db.mjs`, wrappers de `pg_dump`/`pg_restore` |
| `npm run icons:generate` | `scripts/generate-icons.mjs` — gera os ícones do PWA a partir de `design/assets/tata-bust-nobg-full.png` usando `sharp` |
| `npm run test:e2e` | Testes E2E com Playwright (`e2e/*.spec.ts`) — login por papel, fluxo completo da cuidadora, isolamento de dados. Requer Postgres; `e2e/global-setup.ts`/`global-teardown.ts` criam e removem dados próprios prefixados `e2e-` |

## Dívida técnica e limitações conhecidas

- **Sessão JWT não é revalidada contra o banco a cada requisição**: `requireRole`/`requireSession` (`src/lib/authz.ts`) leem `role`/`id` direto do token, nunca reconferem `User.active` depois do login. Desativar um usuário bloqueia um **login novo** (`verifyCredentials` confere `active`), mas uma sessão já aberta continua funcionando normalmente até o token expirar sozinho — até 30 dias por padrão do Auth.js, renovado a cada uso (`updateAge: 24h`). Comparar com `requireActiveChild`, que **sempre** reconfere o status da criança no banco a cada chamada — a mesma política não foi aplicada ao usuário. Corrigir exigiria reconferir `active` no callback `session`/`jwt` (uma query a mais por requisição) ou migrar para sessão de banco (`strategy: "database"`, com revogação real).
- **Senha padrão do admin fixa no código**: `prisma/seed.ts` cria sempre `admin@turminhadatata.com.br` / `TrocarSenha123!` — previsível para qualquer pessoa com acesso ao repositório. Precisa ser trocada manualmente logo após o primeiro deploy (ver `deploy.md`); o ideal seria o seed gerar uma senha aleatória e imprimi-la uma vez no log, em vez de uma fixa.
- **Uploads**: `src/lib/storage.ts` envia para um bucket S3-compatível quando `STORAGE_S3_BUCKET` está configurado; sem isso, cai para disco local (`public/uploads/`), que não funciona em hospedagem com múltiplas instâncias ou filesystem somente-leitura (ex. Vercel) — detalhado em `deploy.md`.
- **Rate limiting do login em memória** (`src/lib/rate-limit.ts`): não sobrevive a restart nem é compartilhado entre múltiplas instâncias. Migrar para um store compartilhado (Redis) antes de hospedar com mais de uma instância — detalhado em `deploy.md`.
- **Notificações são in-app + push + e-mail de fallback** (tabela `Notification`, Web Push via `PushSubscription`/`src/lib/push.ts`, e-mail via `src/lib/email.ts` quando não há assinatura de push); não há SMS.
- **`getDashboardData`/relatórios recalculam tudo a cada request** — não há cache. Para o volume de uma creche isso não é um problema hoje, mas não escala indefinidamente sem revisão.
- **Alertas de "horas excedentes acumuladas"** no dashboard não têm um limiar configurável — qualquer valor acima de zero aparece como alerta.
