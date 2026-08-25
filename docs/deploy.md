# Preparação para produção

## Deploy no Railway

Passo a passo específico (o restante deste documento vale para qualquer hospedagem):

1. **Criar o projeto**: no painel do Railway, "New Project" → "Deploy from GitHub repo" → selecione
   `david25112510/turminha-da-tata`. O Railway detecta Next.js via Nixpacks automaticamente
   (`railway.toml`, já no repo, define o comando de start: `npx prisma migrate deploy && npm run
   start` — aplica as migrations pendentes antes de cada subida, sem gerar nada novo nem perguntar
   nada, seguro mesmo quando não há migration pendente).
2. **Adicionar o Postgres**: no mesmo projeto, "New" → "Database" → "Add PostgreSQL". O Railway cria
   a variável `DATABASE_URL` automaticamente nesse serviço — no serviço do app (o Next.js), adicione
   a variável `DATABASE_URL` referenciando a do Postgres (`${{Postgres.DATABASE_URL}}` no seletor de
   referência do próprio painel).
3. **Variáveis de ambiente do serviço do app** (aba "Variables"): `AUTH_SECRET` (gere um valor novo,
   nunca reaproveite o de desenvolvimento: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`),
   `APP_URL` (o domínio que o Railway gerar, ex. `https://turminha-da-tata-production.up.railway.app`,
   ou seu domínio customizado depois de configurado), e as de storage (`STORAGE_S3_BUCKET` e as
   demais — ver seção "Uploads de imagem" abaixo). `RESEND_API_KEY`/`EMAIL_FROM` e as `VAPID_*` são
   opcionais, mas sem elas recuperação de senha por e-mail e notificações push ficam desativadas
   (o app funciona normalmente sem isso, só sem esses dois recursos).
4. **Primeiro deploy**: o Railway builda e sobe automaticamente após o push. Acompanhe os logs —
   a primeira execução do `startCommand` já aplica as migrations no banco novo.
5. **Seed inicial** (uma única vez): pela aba "Settings" → "Deploy" do serviço, ou via Railway CLI
   (`railway run npm run db:seed` depois de `railway link` ao projeto), rode o seed para criar o
   usuário administrador. **Troque a senha padrão imediatamente** no primeiro login — ver pendência
   de segurança sobre essa credencial fixa em `prisma/seed.ts`.
6. **Domínio customizado** (opcional): aba "Settings" → "Networking" → "Custom Domain" no serviço do
   app; depois de configurar o DNS, atualize `APP_URL` para o domínio definitivo (usado nos links de
   e-mail de recuperação de senha).

O Railway recria o container a cada deploy — sem volume ou storage externo, qualquer arquivo gravado
em disco (fotos em `public/uploads/`, se `STORAGE_S3_BUCKET` não estiver configurado) some no deploy
seguinte. Configure o S3/R2 (seção "Uploads de imagem" abaixo) antes do primeiro uso real em produção.

## Variáveis de ambiente obrigatórias

| Variável       | Descrição                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL` | String de conexão PostgreSQL (`postgresql://usuario:senha@host:porta/banco`) |
| `AUTH_SECRET`  | Segredo usado pelo Auth.js para assinar sessões. Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

Nunca reutilize o `AUTH_SECRET` de desenvolvimento em produção. Gere um novo e mantenha-o fora do controle de versão (já coberto pelo `.gitignore`).

Opcionais, usados pelos scripts de backup:

| Variável        | Descrição                                                |
| --------------- | --------------------------------------------------------- |
| `BACKUP_DIR`    | Diretório de destino dos backups (padrão: `./backups`)    |
| `PG_DUMP_BIN`   | Caminho do executável `pg_dump`, se não estiver no PATH   |
| `PG_RESTORE_BIN`| Caminho do executável `pg_restore`, se não estiver no PATH|

## Passos de deploy

1. `npm install`
2. `npx prisma migrate deploy` — aplica as migrations pendentes sem gerar novas (diferente de `migrate dev`, seguro para produção)
3. `npm run build`
4. `npm run start` (ou o comando equivalente da plataforma de hospedagem)

Rode o seed (`npm run db:seed`) apenas uma vez, na primeira inicialização do banco, para criar o usuário administrador inicial. Troque a senha padrão imediatamente após o primeiro login.

## Banco de dados

O projeto foi desenvolvido com PostgreSQL. Qualquer instância PostgreSQL 14+ funciona (gerenciada ou própria) — só é necessário apontar `DATABASE_URL` para ela e rodar as migrations.

### Backup

```bash
npm run db:backup
```

Gera um dump em `./backups/turminha-da-tata-<timestamp>.dump` usando `pg_dump`. Recomenda-se agendar essa rotina (cron, tarefa agendada, ou o backup nativo do provedor de banco) com uma frequência mínima diária, e manter cópias fora do servidor principal.

### Restauração

```bash
npm run db:restore -- ./backups/arquivo.dump
```

**Atenção:** a restauração usa `--clean`, ou seja, apaga os dados existentes no banco de destino antes de restaurar. Use com cuidado, de preferência em um banco vazio ou de teste.

## Uploads de imagem

As fotos enviadas pelo app são gravadas via `src/lib/storage.ts`, que suporta dois modos:

- **Sem configuração** (`STORAGE_S3_BUCKET` vazio): grava em disco local, em `public/uploads/`. Funciona para
  desenvolvimento e para hospedagem de instância única com disco persistente, mas **não é adequado** para
  múltiplas instâncias ou containers efêmeros (Vercel, por exemplo, tem sistema de arquivos somente leitura em
  produção).
- **Com `STORAGE_S3_BUCKET` configurado**: envia para um bucket S3-compatível (AWS S3, Cloudflare R2 ou
  qualquer provedor compatível). Variáveis:

  | Variável | Descrição |
  | --- | --- |
  | `STORAGE_S3_BUCKET` | Nome do bucket. Definir ativa o modo objeto — sem isso o app usa disco local. |
  | `STORAGE_S3_REGION` | Região (ex.: `us-east-1` na AWS; `auto` funciona na maioria dos provedores compatíveis, incluindo R2). |
  | `STORAGE_S3_ENDPOINT` | Endpoint customizado (ex.: `https://<account>.r2.cloudflarestorage.com` no R2). Deixe vazio para AWS S3. |
  | `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | Credenciais de acesso ao bucket. |
  | `STORAGE_S3_PUBLIC_URL` | URL pública base do bucket (domínio customizado, CDN, ou o link `r2.dev`/website estático). Usada para montar a URL de cada foto e liberada automaticamente em `next.config.ts` para o `next/image`. |

  O bucket precisa permitir leitura pública dos objetos enviados (ou estar atrás de um CDN/domínio que sirva
  publicamente) — hoje as fotos não usam URL assinada, só controle de acesso pela própria aplicação (autorização
  de imagem da criança, ver seção de Segurança).

## PWA

O app é instalável (manifest em `src/app/manifest.ts`, ícones em `public/icons/`) e mantém um service worker (`public/sw.js`) que:

- Cacheia assets estáticos (`_next/static`, ícones, imagens) para carregamento mais rápido em conexões instáveis
- Mostra uma página de "sem conexão" (`/offline`) quando a navegação falha por falta de rede

Isso **não** significa que o app funciona totalmente offline — como o sistema depende de dados ao vivo (presença, financeiro, mensagens), registros não podem ser feitos sem conexão. O objetivo é resiliência e instalabilidade, não sincronização offline completa.

## Segurança — o que já está coberto

- Autenticação por sessão (Auth.js v5, JWT), senhas com hash bcrypt
- Controle de acesso por papel (`ADMIN`, `CAREGIVER`, `GUARDIAN`) via proxy de rotas **e** dentro de cada Server Action (`src/lib/authz.ts`) — o proxy nunca é a única barreira
- Permissões granulares por criança/responsável (`GuardianChild`)
- Entrada/saída de crianças exige selecionar um responsável ou pessoa autorizada já cadastrada — não aceita nome digitado livremente
- Rate limiting no login: 5 tentativas falhas por e-mail a cada 15 minutos (em memória — ver limitação abaixo)
- Contas podem ser desativadas (bloqueia **login novo** imediatamente — ver ressalva sobre sessão já aberta abaixo)
- Fotos só ficam disponíveis para crianças com autorização de imagem explícita
- Auditoria: toda ação operacional relevante é registrada com autor e horário

## Segurança — pontos a revisar antes de produção

- **Troque a senha do admin padrão imediatamente**: `prisma/seed.ts` sempre cria `admin@turminhadatata.com.br` com a mesma senha fixa (`TrocarSenha123!`), visível a qualquer pessoa com acesso ao repositório. Rode o seed, faça o primeiro login e troque a senha antes de qualquer uso real.
- **Desativar um usuário não revoga sessões já abertas**: a sessão é JWT stateless — desativar uma conta impede um **login novo**, mas não invalida um token já emitido, que continua válido até expirar sozinho (padrão do Auth.js: até 30 dias, renovado a cada uso). Se precisar revogar acesso de alguém com urgência (ex.: demissão), troque também o `AUTH_SECRET` — isso invalida todas as sessões de uma vez (inclusive as de outras contas, então é um recurso de emergência, não rotina).
- **HTTPS obrigatório**: cookies de sessão do Auth.js dependem de conexão segura em produção (`NODE_ENV=production` já ativa `secure` nos cookies automaticamente — garanta que a hospedagem sirva HTTPS)
- **Rate limiting**: `src/lib/rate-limit.ts` usa Upstash Redis (REST) quando `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estão configurados (ver `.env.example`) — necessário para qualquer hospedagem com mais de uma instância. Sem essas variáveis, cai para um Map em memória do processo (não sobrevive a restart, não é compartilhado entre instâncias) — só adequado para dev local ou instância única.
- **Backups automatizados**: os scripts existem, mas precisam ser agendados na infraestrutura escolhida
- **Rotação de segredos**: defina um processo para trocar `AUTH_SECRET` e credenciais do banco periodicamente
