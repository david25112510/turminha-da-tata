# Checklist de segurança de produção

- [ ] HTTPS ativo; `APP_URL` usa o domínio definitivo.
- [ ] `DATABASE_URL` e `AUTH_SECRET` existem somente no secret store.
- [ ] Bootstrap usa `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` forte; remover a senha inicial do ambiente após criar a conta.
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` são chaves de produção.
- [ ] Upstash configurado em ambiente distribuído.
- [ ] Resend/remetente validados para recuperação de senha.
- [ ] S3/R2 configurado, persistente, sem ACL pública e com credencial de privilégio mínimo.
- [ ] Mercado Pago usa access token e webhook secret; webhook validado.
- [ ] TOTP plaintext tratado conforme plano de migração antes de escala ampla.
- [ ] Logs não contêm senhas, tokens, segredos, assinaturas ou dados médicos desnecessários.
- [ ] Backup externo e restore em banco descartável foram testados.
- [ ] `/api/health` e alertas do deploy estão ativos.
- [ ] Migrations foram revisadas e `prisma migrate deploy` é executado antes do start.
- [ ] `npm run storage:audit` foi executado no ambiente autorizado; fotos legadas foram migradas explicitamente.
- [ ] Branch protection exige `build-and-test` e `security-smoke` verdes.
