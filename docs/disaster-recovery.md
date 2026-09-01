# Recuperação de desastre

O backup só é considerado válido depois de uma restauração testada.

1. Execute `npm run db:backup` com destino criptografado e fora do host principal.
2. Crie um PostgreSQL descartável, sem dados reais, e aponte `DATABASE_URL` exclusivamente para ele.
3. Confirme host, banco e usuário de destino antes de executar `npm run db:restore -- <dump>`; o restore usa `--clean`.
4. Rode `npx prisma migrate status` e sanity checks de contagem/integridade sem exportar dados pessoais.
5. Registre data, responsável, checksum do dump, duração, resultado e descarte seguro do banco temporário.

Nunca ensaie restore no banco de produção. Definir RPO/RTO, agenda, retenção, criptografia, teste periódico e alertas continua sendo decisão operacional.
