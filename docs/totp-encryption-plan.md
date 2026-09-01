# Plano de criptografia do TOTP

O campo `User.totpSecret` está atualmente em texto claro. Ele não pode ser hasheado porque o servidor precisa recuperar o segredo para validar códigos. Não será migrado automaticamente nesta rodada para evitar bloquear MFA já habilitado.

Plano seguro: usar AES-256-GCM com chave externa `TOTP_ENCRYPTION_KEY`, IV aleatório por registro, authentication tag, AAD vinculada ao `userId` e envelope versionado (`v1:<iv>:<tag>:<ciphertext>`). A leitura deve aceitar temporariamente legado plaintext; após autenticação administrativa e backup verificado, um comando explícito e idempotente migra lotes, confirma a decifragem e registra apenas IDs/resultados. Rotação exige descriptografar com a chave anterior e recriptografar com a nova, mantendo rollback controlado. A chave nunca fica no banco, logs ou backup da aplicação.
