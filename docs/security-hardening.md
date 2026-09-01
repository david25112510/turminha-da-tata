# Segurança — Turminha da Tata

## Contexto de risco

A aplicação trata dados de crianças e responsáveis, incluindo rotina, presença, pessoas autorizadas para retirada, saúde, medicamentos, ocorrências, fotos, contratos e financeiro. Por isso, o nível de proteção esperado é superior ao de um SaaS administrativo genérico.

Soluções consolidadas do segmento de childcare, como Brightwheel, Procare e Lillio/HiMama, publicam controles como autenticação forte/2FA, segregação de acesso, criptografia, infraestrutura cloud, proteção específica de fotos e dados das famílias, testes contínuos, auditorias independentes e, em alguns casos, referências a OWASP ASVS, PCI DSS e SOC 2. Este projeto não declara possuir certificações equivalentes; elas são usadas somente como referência de maturidade.

No Brasil, o art. 14 da LGPD exige que o tratamento de dados de crianças e adolescentes observe seu melhor interesse. A ANPD também considera esse tratamento um tema de risco elevado e prioritário. Requisitos jurídicos específicos devem ser validados por profissional competente; esta documentação descreve controles técnicos.

## Baseline técnico obrigatório

### 1. Identidade, autenticação e sessão

- Senhas armazenadas somente com hash forte.
- Turnstile validado no servidor nos fluxos públicos sensíveis.
- Rate limiting compartilhado em produção.
- MFA para contas administrativas; avaliar expansão futura para equipe/responsáveis conforme risco e UX.
- Conta inativa/removida perde autorização na próxima leitura autenticada, sem aguardar a expiração natural do JWT.
- Alteração de role passa a valer na próxima leitura autenticada.
- Recuperação de senha usa token aleatório, de uso único, com expiração e resposta anti-enumeração.
- Cookies/sessão devem usar HTTPS e atributos seguros fornecidos/configurados pelo Auth.js.

### 2. Autorização e isolamento

Toda autorização crítica deve ocorrer no servidor. IDs vindos de URL, formulário ou cliente nunca são prova de permissão.

Regras mínimas:

- GUARDIAN acessa somente crianças vinculadas e apenas permissões concedidas.
- CAREGIVER não acessa financeiro/configurações administrativas.
- ADMIN possui acesso administrativo, mas ainda deve respeitar regras de integridade/auditoria.
- Pessoas autorizadas para retirada pertencem à criança correta e precisam estar ativas.
- Medicamento só pode ser administrado quando existir autorização válida/ativa conforme regra de negócio.
- APIs e Server Actions devem aplicar as mesmas regras das páginas.

### 3. Dados infantis, saúde e LGPD

- Minimização: coletar apenas o necessário para finalidade explícita.
- Finalidade e consentimentos versionados quando aplicáveis.
- Melhor interesse da criança como critério de projeto.
- Dados de saúde, medicamentos, incidentes e fotos tratados como conteúdo sensível de alto impacto.
- Auditoria de alterações críticas com ator, data/hora, motivo e antes/depois quando aplicável.
- Política formal de retenção, anonimização e exclusão deve existir antes de usar exclusão destrutiva em produção.

### 4. Fotos e arquivos

- Validar magic bytes; não confiar em `Content-Type` enviado pelo cliente.
- Limitar tamanho e formatos permitidos.
- Gerar nomes/chaves imprevisíveis no servidor.
- Novos uploads persistem como referência opaca `storage://...`.
- Bucket de produção privado.
- Acesso por URL temporária ou rota autenticada depois da autorização.
- Respostas privadas com `Cache-Control: private, no-store` quando aplicável.
- Exclusão no banco não pode ser confirmada como sucesso se a exclusão física obrigatória falhar.
- Inventariar/migrar URLs públicas legadas.

### 5. PWA/cache

Nunca armazenar em Cache Storage respostas das áreas:

- `/admin`
- `/cuidadora`
- `/pais`
- `/api/*`
- matrícula/cadastro/autenticação/recuperação

O service worker pode cachear somente assets públicos controlados do produto e a página offline. Uma atualização de cache deve remover caches antigos.

### 6. Financeiro e integrações

- Webhooks de pagamento devem validar autenticidade e consultar o provedor antes de creditar fatura.
- Idempotência para eventos/pagamentos repetidos.
- Nunca armazenar dados completos de cartão quando o provedor externo pode assumir essa responsabilidade.
- Segredos de Mercado Pago, e-mail, storage, Redis, Turnstile e Auth somente em environment/secrets do deploy.

### 7. Bootstrap, secrets e ambiente

- Nenhuma senha administrativa conhecida no repositório.
- `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` obrigatórios para criar o primeiro Admin em produção.
- Seed idempotente nunca redefine senha/MFA/role/status de usuário existente.
- Produção não deve usar `.data/uploads` em filesystem efêmero.
- Produção deve usar Redis compartilhado para rate limiting quando houver múltiplas instâncias.
- Não registrar tokens, senhas, TOTP secret, signed URLs completas ou dados médicos desnecessários.

## Matriz mínima de testes de segurança

| Área | Teste obrigatório | Resultado esperado |
| --- | --- | --- |
| Login | senha errada repetida | rate limit/bloqueio conforme política |
| Login | Turnstile inválido/ausente | login negado |
| Sessão | usuário logado é desativado | acesso negado na próxima leitura autenticada |
| Sessão | role é reduzida | privilégio antigo deixa de valer |
| Família | Guardian A usa `childId` de B | 403/erro de autorização |
| Fotos | Guardian A tenta foto de B | URL/arquivo negado |
| Financeiro | Guardian A tenta fatura de B | negado |
| Cuidadora | tenta função Admin | negado |
| Retirada | pessoa inexistente/inativa/de outra criança | negado |
| Medicamento | autorização inexistente/pausada/encerrada | administração negada |
| Upload | extensão/MIME falso | rejeitado pelos bytes reais |
| Upload | arquivo acima do limite | rejeitado |
| Storage | URL/referência manipulada | negado ou 404 sem vazamento |
| Storage | arquivo privado | `no-store`, sem cache público |
| PWA | navegar em `/pais`, `/admin`, `/cuidadora` | resposta nunca gravada no Cache Storage |
| Matrícula | dupla aprovação concorrente | uma única criança/vínculo |
| Password reset | e-mail inexistente | mesma resposta do e-mail existente |
| Password reset | token expirado/reutilizado | rejeitado |
| Webhook | assinatura inválida | rejeitado |
| Webhook | evento duplicado | sem crédito duplicado |
| Auditoria | correção de rotina | ator + motivo + antes/depois preservados |

## Testes antes de release

No mínimo:

```bash
npm ci
npx prisma migrate deploy
npm run lint
npx tsc --noEmit
npm run test
npm run build
npm run test:e2e
npm audit
```

A suíte E2E deve cobrir pelo menos autenticação, isolamento entre famílias, matrícula, documentos, rotina crítica, fotos e financeiro. O CI atual executa lint, TypeScript, unitários e build; Playwright ainda deve ser executado fora do workflow atual até que a estabilidade no runner compartilhado seja validada.

## Revisões periódicas recomendadas

- Dependências e vulnerabilidades: em cada release e continuamente via tooling do repositório.
- Revisão de acessos e Admins: mensal/trimestral conforme operação.
- Restauração de backup: teste periódico, não apenas existência do backup.
- Pentest externo: antes de escala relevante e depois de mudanças críticas de autenticação/storage/pagamentos.
- Exercício de resposta a incidente e comunicação LGPD.
- Revisão de retenção/exclusão e bases legais com assessoria jurídica.

## Riscos residuais conhecidos nesta rodada

1. URLs públicas de fotos legadas precisam de inventário/migração real no ambiente de dados; o código novo já usa storage privado.
2. `totpSecret` continua recuperável em texto no banco. Avaliar criptografia em repouso na camada da aplicação conforme modelo de ameaça.
3. A política de exclusão permanente/retenção de dados infantis, contratos, financeiro e incidentes precisa de decisão jurídico-operacional antes de produção ampla.
4. Playwright E2E ainda não é obrigatório no workflow principal de CI.
5. Certificações como SOC 2/PCI não são alegadas por este projeto; referências de concorrentes são benchmark, não equivalência.
