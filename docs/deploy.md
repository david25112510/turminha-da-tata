# Preparação para produção

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

As fotos enviadas pelo app (crianças, atividades) são hoje salvas em disco local, em `public/uploads/`. Isso funciona para um único servidor, mas **não é adequado** para hospedagem com múltiplas instâncias ou containers efêmeros (Vercel, por exemplo, tem sistema de arquivos somente leitura em produção). Antes de ir para produção nesses ambientes, migre `src/lib/photo-actions.ts` para um serviço de armazenamento de objetos (S3, R2, Google Cloud Storage etc.).

## PWA

O app é instalável (manifest em `src/app/manifest.ts`, ícones em `public/icons/`) e mantém um service worker (`public/sw.js`) que:

- Cacheia assets estáticos (`_next/static`, ícones, imagens) para carregamento mais rápido em conexões instáveis
- Mostra uma página de "sem conexão" (`/offline`) quando a navegação falha por falta de rede

Isso **não** significa que o app funciona totalmente offline — como o sistema depende de dados ao vivo (presença, financeiro, mensagens), registros não podem ser feitos sem conexão. O objetivo é resiliência e instalabilidade, não sincronização offline completa.

## Segurança — o que já está coberto

- Autenticação por sessão (Auth.js v5, JWT), senhas com hash bcrypt
- Controle de acesso por papel (`ADMIN`, `CAREGIVER`, `GUARDIAN`) via proxy de rotas
- Permissões granulares por criança/responsável (`GuardianChild`)
- Contas podem ser desativadas (bloqueia login imediatamente)
- Fotos só ficam disponíveis para crianças com autorização de imagem explícita
- Auditoria: toda ação operacional relevante é registrada com autor e horário

## Segurança — pontos a revisar antes de produção

- **HTTPS obrigatório**: cookies de sessão do Auth.js dependem de conexão segura em produção (`NODE_ENV=production` já ativa `secure` nos cookies automaticamente — garanta que a hospedagem sirva HTTPS)
- **Rate limiting**: não há limite de tentativas de login. Considere adicionar (ex: via middleware/proxy ou no provedor de hospedagem) antes de expor publicamente
- **Backups automatizados**: os scripts existem, mas precisam ser agendados na infraestrutura escolhida
- **Rotação de segredos**: defina um processo para trocar `AUTH_SECRET` e credenciais do banco periodicamente
