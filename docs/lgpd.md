# LGPD — proteção de dados pessoais

Referência de conformidade com a Lei nº 13.709/2018 (LGPD). Complementa `architecture.md`
(implementação técnica) e `spec.md` (comportamento do produto) — este documento existe para
responder "que dados tratamos, por quê, e sob qual base legal", que nenhum dos outros dois cobre.

## Encarregado de dados (DPO)

**Placeholder — ainda não nomeado.** A LGPD (art. 41) exige que o controlador indique um
encarregado de dados, com contato divulgado publicamente. Antes de operar em produção com dados
reais, a administração da Turminha da Tata precisa nomear essa pessoa e substituir esta seção
pelo nome/contato real (e atualizar `docs/lgpd.md` e o rodapé do termo de consentimento,
`src/lib/consent-template.ts`, de acordo).

## Categorias de dados tratados e onde vivem no schema

| Categoria | Sensibilidade (LGPD) | Onde | Base legal típica |
|---|---|---|---|
| Identificação e contato do responsável (nome, CPF, telefone, e-mail, endereço) | Pessoal | `Guardian` | Execução de contrato (art. 7º, V) |
| Identificação da criança (nome, CPF, certidão de nascimento, data de nascimento) | Pessoal | `Child` | Execução de contrato / interesse legítimo |
| Dados de saúde (alergias, restrições, medicamentos, temperatura, sintomas) | **Sensível** (art. 5º, II) | `HealthProfile`, `HealthLog`, `MedicationAuthorization`/`MedicationAdministration` | Consentimento específico + proteção da vida (art. 11) |
| Fotografias da criança | Sensível quando permite identificação de criança/adolescente | `Photo`, `Child.imageAuthorized` | Consentimento específico (autorização de imagem — já separada do consentimento LGPD geral, ver abaixo) |
| Rotina diária (presença, alimentação, sono, higiene, atividades, humor) | Pessoal — inclui geolocalização implícita (a criança esteve em um lugar específico em um horário específico) | `Attendance`, `MealRecord`, `SleepRecord`, `HygieneRecord`, `WaterRecord`, `ActivityChild`, `MoodRecord` | Execução de contrato |
| Financeiro (mensalidade, pagamentos) | Pessoal | `MonthlyInvoice`, `Payment`, `InvoiceItem` | Execução de contrato / obrigação legal (fiscal) |
| Credenciais de acesso (senha, sessão) | Pessoal | `User` (hash bcrypt, nunca a senha em claro) | Execução de contrato |
| Assinatura manuscrita + IP/user-agent do aceite | Pessoal | `ContractAcceptance`, `ConsentAcceptance` | Consentimento + prova do próprio aceite |

## Os dois consentimentos são distintos, de propósito

Três autorizações independentes existem hoje, cada uma com sua própria finalidade — aceitar uma
não implica aceitar as outras:

1. **Autorização de imagem** (`Child.imageAuthorized`) — permite fotografar a criança e mostrar
   as fotos ao responsável. Concedida no cadastro da criança pelo admin, a pedido do responsável.
2. **Contrato de prestação de serviços** (`ContractVersion`/`ContractAcceptance`,
   `src/app/pais/contrato/`) — aceite da relação contratual em si (horários, mensalidade, rotina
   etc.), por par criança/responsável.
3. **Consentimento LGPD** (`ConsentVersion`/`ConsentAcceptance`, `src/app/pais/consentimento/`)
   — aceite específico para o **tratamento de dados pessoais**, por responsável (não duplicado por
   criança — é sobre os dados do próprio responsável enquanto titular). Gerado automaticamente no
   mesmo momento que o contrato (`ensureConsentAcceptance`, chamada logo após
   `ensureContractAcceptance` em `createGuardianAction`), bloqueia o Portal dos Pais da mesma forma
   (ver `src/app/pais/(portal)/layout.tsx`) — contrato primeiro, consentimento depois, se os dois
   estiverem pendentes.

## Retenção e encerramento

`Child.inactivatedAt` guarda quando uma criança deixou de ser `ACTIVE` — é a base de qualquer
cálculo de retenção futuro. Preenchido automaticamente por `updateChildAction`
(`/admin/criancas/[id]/editar`) sempre que o status muda para `INACTIVE`, e limpo de volta para
`null` se a criança for reativada. **O que ainda não existe é o processo automatizado de
anonimização/exclusão em si** — a política abaixo (prazos de guarda) segue pendente de aprovação
da administração/encarregado de dados; `inactivatedAt` só marca o ponto de partida para quando
esse processo for implementado.

Política de retenção proposta (**pendente de aprovação da administração/encarregado de dados** —
não é uma obrigação legal com prazo fixo definido por lei para este tipo de dado, e sim uma decisão
da escola dentro do que a LGPD permite):

- Dados operacionais da rotina (presença, alimentação, sono, etc.): mantidos enquanto a criança
  está ativa; após `inactivatedAt`, propõe-se um prazo de guarda (ex.: 5 anos, alinhado a prazos
  fiscais/prescricionais comuns no Brasil — **a confirmar com profissional jurídico**) antes de
  anonimização ou exclusão.
- Dados financeiros: seguem a obrigação legal de guarda de documentos fiscais (tipicamente 5 anos
  no Brasil — **a confirmar**), independente do encerramento do vínculo.
- Dados de saúde: mesmo prazo dos dados operacionais, dado o caráter sensível — priorizar
  anonimização assim que o prazo mínimo de guarda permitir.
- Fotografias: removidas (não apenas desvinculadas) na anonimização, dado o maior risco de
  identificação.

Nenhum processo automatizado de anonimização/exclusão existe ainda — é trabalho futuro, a ser
implementado só depois que a política acima for formalmente aprovada.

## Direitos do titular (art. 18 LGPD)

O responsável pode solicitar confirmação de tratamento, acesso, correção, anonimização/exclusão
(dentro do que a retenção legal permitir) e portabilidade dos seus dados e dos da criança sob sua
responsabilidade. Hoje esses pedidos são atendidos manualmente pela administração (via Prisma
Studio ou consulta direta ao banco) — não existe um formulário de autoatendimento no Portal dos
Pais para isso; é um item razoável para uma fase futura, sem urgência enquanto o volume de pedidos
for baixo.

## Compartilhamento com terceiros

- **Armazenamento de fotos/assinaturas**: quando `STORAGE_S3_BUCKET` está configurado
  (`src/lib/storage.ts`), os arquivos vão para um bucket S3-compatível (AWS S3, Cloudflare R2, ou
  equivalente) — o provedor escolhido processa esses dados como operador, dentro do que a LGPD
  exige (contrato/termos com cláusulas de proteção de dados).
- **E-mail transacional**: quando configurado, a Resend (`src/lib/email.ts`) processa o e-mail e o
  nome do destinatário para enviar recuperação de senha.
- **Notificações push**: o navegador/provedor de push (Web Push padrão) processa o endpoint da
  assinatura (`PushSubscription`), sem conteúdo sensível no payload (títulos genéricos — ver
  comentário em `src/app/cuidadora/criancas/[id]/actions.ts` sobre não vazar nome de medicamento em
  notificação do sistema).

Nenhum dado é vendido ou compartilhado para fins de marketing/publicidade de terceiros.
