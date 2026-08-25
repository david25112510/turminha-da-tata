# TURMINHA DA TATA

## Especificação Oficial do Sistema de Gestão e Acompanhamento Infantil

**Versão:** 1.0
**Data:** Agosto de 2026
**Status:** Documento base para desenvolvimento

---

# 1. Visão geral

A **Turminha da Tata** será uma plataforma digital completa para gerenciamento da escolinha e acompanhamento das crianças pelos pais ou responsáveis.

O sistema terá três experiências principais:

1. **Área Administrativa** — gestão completa da escolinha.
2. **Aplicativo/Portal das Cuidadoras** — registro da rotina das crianças pelo celular.
3. **Aplicativo/Portal dos Pais** — acompanhamento da criança, comunicação, notificações e financeiro.

A plataforma deverá ser responsiva e funcionar em:

* Computadores
* Notebooks
* Tablets
* Celulares Android
* iPhones

A experiência deverá ser especialmente otimizada para celulares das cuidadoras e dos responsáveis.

---

# 2. Conceito da escola

A Turminha da Tata possui uma característica importante:

> **Não existem várias turmas separadas.**

Todas as crianças fazem parte de uma única comunidade e todos os cuidadores podem cuidar de todas as crianças.

Portanto, o sistema **não deverá utilizar "turmas" como estrutura obrigatória**.

A organização será baseada em:

**Escola → Crianças → Responsáveis → Cuidadores → Rotina**

---

# 3. Perfis de usuário

## 3.1 Administrador

Possui acesso completo ao sistema.

Pode:

* Cadastrar crianças
* Cadastrar responsáveis
* Cadastrar cuidadores
* Configurar horários
* Configurar valores
* Gerenciar financeiro
* Gerenciar permissões
* Visualizar relatórios
* Gerenciar ocorrências
* Gerenciar documentos
* Configurar notificações
* Alterar regras financeiras
* Visualizar histórico de atividades

---

## 3.2 Cuidador

Utiliza principalmente o celular.

Pode:

* Visualizar crianças
* Registrar chegada
* Registrar saída
* Informar quem trouxe a criança
* Informar quem buscou
* Registrar alimentação
* Registrar sono
* Registrar higiene
* Registrar fraldas
* Registrar atividades
* Registrar humor
* Registrar observações
* Registrar temperatura
* Registrar medicamentos autorizados
* Registrar ocorrências
* Tirar e publicar fotos autorizadas
* Consultar informações necessárias da criança

O cuidador não poderá alterar informações administrativas ou financeiras.

---

## 3.3 Responsável

Pode acessar somente as crianças vinculadas à sua conta.

Pode:

* Acompanhar chegada
* Acompanhar saída
* Receber notificações
* Visualizar rotina
* Visualizar fotos autorizadas
* Visualizar atividades
* Visualizar alimentação
* Visualizar sono
* Visualizar higiene
* Visualizar ocorrências permitidas
* Visualizar documentos
* Visualizar financeiro
* Consultar mensalidades
* Consultar horas excedentes
* Atualizar determinados dados pessoais
* Cadastrar pessoas autorizadas para retirada, conforme regras da escola

---

# 4. Dashboard administrativo

A página inicial deverá apresentar um resumo da situação atual.

## Indicadores

* Total de crianças
* Crianças presentes
* Crianças ausentes
* Crianças que ainda estão na escola
* Cuidadores ativos
* Entradas do dia
* Saídas do dia
* Ocorrências
* Medicamentos
* Horas excedentes acumuladas
* Mensalidades pendentes
* Valor recebido no mês

## Resumo da rotina

* Alimentações registradas
* Sonecas
* Atividades
* Higiene
* Fraldas
* Observações

## Alertas

Exemplos:

* Criança ainda não chegou
* Criança ainda não saiu
* Medicamento próximo do horário
* Medicamento pendente de registro
* Ocorrência aguardando acompanhamento
* Mensalidade vencida
* Horas excedentes acumuladas

---

# 5. Cadastro da criança

Cada criança terá uma ficha individual.

## Dados pessoais

* Nome completo
* Nome preferido
* Foto
* Data de nascimento
* CPF
* Certidão de nascimento
* Sexo
* Data de entrada na escola
* Status
* Observações gerais

## Informações de permanência

* Horário de entrada contratado
* Horário de saída contratado
* Dias contratados
* Tolerância
* Valor mensal
* Valor da hora excedente
* Data de vencimento

---

# 6. Responsáveis

Uma criança poderá possuir vários responsáveis.

## Dados

* Nome
* CPF
* Data de nascimento
* Telefone
* WhatsApp
* E-mail
* Parentesco
* Endereço
* Responsável financeiro
* Responsável principal

## Permissões

Cada responsável poderá ter permissões específicas:

* Receber notificações
* Visualizar rotina
* Visualizar fotos
* Autorizar medicamentos
* Autorizar retirada
* Visualizar financeiro
* Receber comunicados

---

# 7. Pessoas autorizadas a retirar

Cadastro específico de pessoas autorizadas.

Dados:

* Nome
* CPF
* Telefone
* Parentesco/relação
* Foto
* Observação
* Responsável que autorizou
* Status

A retirada deverá ficar registrada.

---

# 8. Controle de chegada

O sistema deverá registrar:

* Data
* Hora
* Criança
* Quem levou
* Quem recebeu
* Cuidador responsável pelo registro

Exemplo:

**07:34 — Maria chegou**

**Levou:** João Silva — Pai
**Recebeu:** Ana — Cuidadora

---

# 9. Notificação de chegada

Após o registro de chegada, os responsáveis autorizados receberão automaticamente uma notificação.

Exemplo:

**Maria chegou à Turminha da Tata. 💕**

Horário: 07:34
Levado por: João Silva — Pai

---

# 10. Registro de saída

Na saída:

* Criança
* Data
* Horário
* Pessoa que retirou
* Cuidador que realizou o registro

Exemplo:

**18:12 — Maria saiu**

**Retirada por:** João Silva — Pai

---

# 11. Notificação de saída

O sistema poderá enviar:

**Maria saiu da Turminha da Tata. 🏠**

Horário: 18:12
Retirada por: João Silva — Pai

---

# 12. Jornada da criança

Cada criança terá uma linha do tempo diária.

Exemplo:

07:12 — Saiu de casa
07:34 — Chegou à escola
08:05 — Café da manhã
09:20 — Atividade
10:15 — Higiene
11:40 — Almoço
13:08 — Soneca
14:21 — Acordou
15:30 — Recreação
16:10 — Lanche
18:12 — Saiu da escola

A jornada será uma das principais telas do aplicativo dos pais.

---

# 13. Registro opcional de saída de casa

O responsável poderá informar:

**"Estou levando meu filho para a escola."**

O sistema registra o horário.

Exemplo:

07:12 — Saiu de casa.

Esse recurso será opcional e poderá ser desativado pela administração.

---

# 14. Alimentação

A cuidadora poderá registrar:

* Refeição
* Horário
* Quantidade consumida
* Observação

Opções:

* Comeu tudo
* Comeu bem
* Comeu pouco
* Não quis comer

Refeições configuráveis:

* Café da manhã
* Lanche
* Almoço
* Lanche da tarde
* Jantar
* Outras

## Hidratação

A cuidadora também poderá registrar quanto a criança bebeu de água ao longo do dia (pouco, médio,
muito), com observação — item independente da alimentação, aparece junto na linha do tempo da
rotina.

---

# 15. Sono

A cuidadora poderá iniciar e finalizar uma soneca.

## Início

O sistema registra automaticamente o horário.

## Finalização

O sistema registra o horário e calcula automaticamente a duração.

Exemplo:

**13:08 → 14:21**

Duração:

**1h13min**

---

# 16. Higiene

Registros possíveis:

* Banheiro
* Troca de fralda
* Higiene pessoal
* Lavagem das mãos
* Escovação
* Outros

---

# 17. Atividades

A cuidadora poderá registrar atividades.

Categorias:

* Pintura
* Desenho
* Música
* História
* Jogos
* Recreação
* Área externa
* Coordenação motora
* Atividade pedagógica
* Brincadeira livre
* Outras

Cada registro poderá conter:

* Data
* Horário
* Atividade
* Descrição
* Crianças participantes
* Observação
* Fotos

---

# 18. Humor e comportamento

Registro rápido:

* Muito feliz
* Feliz
* Bem
* Normal
* Cansado
* Triste
* Chorou
* Irritado
* Outro

Também poderá haver uma observação textual.

---

# 19. Informações de saúde

Ficha individual contendo:

* Alergias
* Restrições alimentares
* Medicamentos autorizados
* Informações importantes
* Plano de saúde
* Médico
* Telefone de emergência
* Observações

Informações sensíveis deverão possuir controle de acesso.

---

# 20. Temperatura e observações de saúde

A cuidadora poderá registrar:

* Temperatura
* Data
* Horário
* Sintomas observados
* Observação
* Cuidador responsável

Quando configurado pela escola, determinadas alterações poderão gerar alerta para a administração e/ou responsáveis.

---

# 21. Medicamentos

O sistema deverá controlar medicamentos previamente autorizados.

Informações:

* Medicamento
* Dosagem
* Horário
* Instrução
* Responsável pela autorização
* Documento/autorização
* Período de validade

Ao administrar:

**CONFIRMAR ADMINISTRAÇÃO**

O sistema registra:

* Data
* Hora
* Cuidador
* Medicamento
* Criança
* Observação

---

# 22. Ocorrências

A cuidadora poderá registrar:

* Queda
* Acidente
* Choro
* Mal-estar
* Febre
* Alteração comportamental
* Ferimento
* Outro

Cada ocorrência terá:

* Data
* Hora
* Criança
* Tipo
* Descrição
* Providências
* Fotos, quando necessário
* Cuidador responsável
* Responsável comunicado
* Data/hora da comunicação

---

# 23. Fotos

A escola poderá registrar fotos das atividades.

Cada criança deverá possuir uma configuração:

**Autorização de imagem:**

* Autorizada
* Não autorizada

O sistema deverá impedir automaticamente que fotos sejam disponibilizadas aos responsáveis de crianças sem autorização.

---

# 24. Comunicação

A administração poderá publicar:

* Comunicados
* Avisos
* Lembretes
* Eventos
* Informações importantes

As mensagens poderão ser direcionadas:

* Todos
* Responsável específico
* Criança específica

---

# 25. Notificações

O sistema deverá possuir notificações automáticas.

Exemplos:

### Chegada

"Maria chegou à escola."

### Saída

"Maria saiu da escola."

### Alimentação

"Maria almoçou e comeu bem."

### Soneca

"Maria dormiu por 1h13."

### Foto

"Novos momentos de Maria foram publicados."

### Ocorrência

"Existe uma nova informação importante sobre Maria."

### Financeiro

"Sua mensalidade estará disponível em breve."

### Excedente

"Maria permaneceu 42 minutos além do horário contratado."

---

# 26. Financeiro

O financeiro será integrado ao controle de presença.

Cada criança terá:

* Mensalidade fixa
* Data de vencimento
* Horário contratado
* Tolerância
* Valor da hora excedente
* Regras de cobrança

---

# 27. Horário contratado

Exemplo:

**Entrada:** 07:30
**Saída:** 17:30
**Tolerância:** 15 minutos

A tolerância deverá ser configurável.

---

# 28. Cálculo de hora excedente

O sistema deverá trabalhar com minutos reais. **A tolerância é um desconto sobre o atraso, não um
limiar de tudo-ou-nada** — passar 1 minuto da tolerância cobra 1 minuto, não o atraso inteiro (ver
regra completa na seção 29).

Exemplo (sem tolerância, para isolar o cálculo do valor):

Valor da hora:

**R$ 15,00**

Valor por minuto:

**R$ 15,00 ÷ 60 = R$ 0,25**

Saída prevista:

**17:30**

Saída real:

**18:12**

Excedente bruto:

**42 minutos**

Cálculo (tolerância 0):

**42 × R$ 0,25 = R$ 10,50**

---

# 29. Tolerância

A tolerância **desconta** do atraso bruto — não é um limiar que libera cobrar o atraso inteiro
quando ultrapassado.

Exemplo:

Horário contratado:

17:30

Tolerância:

15 minutos

Valor da hora:

R$ 15,00 (R$ 0,25/minuto)

Saída 17:42 (12 minutos de atraso bruto, dentro da tolerância):

**Sem cobrança.**

Saída 17:50 (20 minutos de atraso bruto):

Minutos cobrados = 20 − 15 = **5 minutos**

Valor cobrado = 5 × R$ 0,25 = **R$ 1,25**

O sistema deverá deixar explícito qual método de cálculo está sendo utilizado.

---

# 30. Fechamento mensal

No fechamento da mensalidade:

**Mensalidade:** R$ 900,00
**Horas excedentes:** R$ 33,25
**Descontos:** R$ 0,00
**Outros:** R$ 0,00

**TOTAL: R$ 933,25**

O sistema deverá manter o detalhamento de todas as horas que originaram os R$ 33,25.

---

# 31. Transparência financeira para os pais

O responsável deverá conseguir abrir:

**Mensalidade de Setembro**

Mensalidade:

R$ 900,00

Horas excedentes:

R$ 33,25

Total:

**R$ 933,25**

Ao tocar em "Horas excedentes", deverá aparecer:

05/09 — 18 min — R$ 4,50
08/09 — 40 min — R$ 10,00
12/09 — 25 min — R$ 6,25
18/09 — 50 min — R$ 12,50

---

# 32. Status financeiro

Cada cobrança poderá estar:

* Pendente
* Pago
* Vencido
* Cancelado
* Parcialmente pago

---

# 33. Relatórios

A administração deverá ter relatórios:

## Crianças

* Cadastro
* Frequência
* Entradas
* Saídas
* Permanência

## Rotina

* Alimentação
* Sono
* Higiene
* Atividades
* Humor
* Observações

## Segurança

* Pessoas que retiraram crianças
* Entradas
* Saídas
* Ocorrências

## Financeiro

* Mensalidades
* Recebimentos
* Inadimplência
* Horas excedentes
* Faturamento

---

# 34. Histórico e auditoria

Todas as ações importantes deverão ser registradas.

Exemplo:

**20/08/2026 — 18:12**

Ana — Cuidadora

Registrou saída de Maria.

Retirada por:

João Silva — Pai.

Isso permitirá identificar quem fez cada alteração.

---

# 35. Segurança e privacidade

O sistema deverá considerar desde o início a proteção de dados pessoais e informações relacionadas a crianças.

Deverá possuir:

* Login individual
* Senhas protegidas
* Controle de permissões
* Sessões seguras
* Auditoria
* Controle de documentos
* Controle de autorização de imagem
* Controle de responsáveis
* Backup
* Proteção de informações sensíveis

---

# 36. Aplicativo das cuidadoras

A tela inicial deverá priorizar velocidade.

## Menu principal

* Crianças
* Presença
* Rotina
* Atividades
* Fotos
* Ocorrências
* Medicamentos
* Notificações
* Perfil

A cuidadora deverá conseguir realizar a maioria dos registros com poucos toques.

---

# 37. Aplicativo dos responsáveis

## Menu

* Início
* Jornada
* Fotos
* Atividades
* Comunicados
* Agenda
* Financeiro
* Perfil

A tela inicial deverá destacar a situação atual da criança.

---

# 38. Identidade visual

A identidade deverá transmitir:

**Carinho + Segurança + Alegria + Confiança + Desenvolvimento**

## Direção visual

* Moderna
* Infantil sem ser excessivamente infantil
* Alegre
* Acolhedora
* Limpa
* Profissional

## Paleta inicial

* Verde suave
* Amarelo
* Coral/Rosa
* Azul claro
* Off-white

A paleta definitiva será definida durante a criação da identidade visual.

---

# 39. Mascote

A marca poderá possuir uma mascote própria chamada:

**Tata**

A personagem deverá ser:

* Simpática
* Acolhedora
* Moderna
* Fácil de reconhecer
* Adaptável para impressão e digital

Ela poderá aparecer em:

* Aplicativo
* Site
* Comunicados
* Uniformes
* Materiais escolares
* Redes sociais
* Ícones
* Ilustrações

---

# 40. Tecnologia

A arquitetura recomendada:

## Frontend

* Next.js
* TypeScript
* Tailwind CSS

## Backend

* Next.js API
* Prisma ORM

## Banco de dados

* PostgreSQL

## Interface

* Responsiva
* Mobile First
* PWA

## Arquivos

Armazenamento seguro para:

* Fotos
* Documentos
* Assinaturas
* Autorizações
* Relatórios

---

# 41. Estrutura conceitual do banco

Principais entidades:

```text
USUÁRIOS
   │
   ├── ADMINISTRADORES
   ├── CUIDADORES
   └── RESPONSÁVEIS
           │
           ▼
        CRIANÇAS
           │
     ┌─────┼─────────────┬───────────┐
     ▼     ▼             ▼           ▼
  PRESENÇA ROTINA      FINANCEIRO  CONTRATO
     │     │             │           │
     │     ├── Alimentação          ├── Versão
     │     ├── Hidratação           ├── Aceite
     │     ├── Sono                 └── Assinatura
     │     ├── Higiene
     │     ├── Atividades
     │     ├── Humor
     │     ├── Fotos
     │     └── Ocorrências
     │
     ├── Entrada
     ├── Saída
     ├── Quem trouxe
     └── Quem buscou
```

---

# 42. Fluxo principal

## Pela manhã

Responsável:

**Sai de casa → registra opcionalmente "a caminho"**

↓

Chega à escola

↓

Cuidadora registra:

**Entrada + responsável que trouxe**

↓

Sistema:

**Atualiza presença**

↓

Sistema:

**Envia notificação aos pais**

---

## Durante o dia

Cuidadora registra:

**Alimentação → Sono → Higiene → Atividades → Humor → Observações**

↓

Pais acompanham pelo celular.

---

## Final do dia

Responsável chega.

↓

Cuidadora registra:

**Saída + pessoa que retirou**

↓

Sistema verifica:

**Horário contratado × horário real**

↓

Calcula excedente.

↓

Atualiza financeiro.

↓

Envia notificação.

---

# 43. Fluxo financeiro

```text
MENSALIDADE FIXA
        +
HORAS EXCEDENTES
        +
OUTROS VALORES
        -
DESCONTOS
        =
TOTAL DA MENSALIDADE
```

O cálculo deverá ficar registrado e auditável.

---

# 44. Princípio fundamental do sistema

A plataforma deverá seguir um conceito central:

> **Registrar uma informação uma única vez e reutilizá-la automaticamente em todas as áreas necessárias.**

Exemplo:

A cuidadora registra a saída às 18:12.

O sistema automaticamente:

1. Registra a saída.
2. Identifica quem retirou.
3. Atualiza o status da criança.
4. Calcula o tempo excedente.
5. Calcula o valor correspondente.
6. Atualiza o financeiro.
7. Atualiza a jornada.
8. Gera histórico.
9. Envia notificação ao responsável.
10. Disponibiliza a informação no relatório administrativo.

Isso reduzirá muito o trabalho manual.

---

# 45. Fases de desenvolvimento

## FASE 1 — Identidade visual

* Logo
* Mascote
* Paleta
* Tipografia
* Ícones
* Elementos gráficos
* Guia visual

## FASE 2 — Fundação

* Projeto
* Banco de dados
* Autenticação
* Usuários
* Permissões

## FASE 3 — Cadastros

* Crianças
* Responsáveis
* Pessoas autorizadas
* Cuidadores
* Configurações financeiras

## FASE 4 — Operação

* Entrada
* Saída
* Jornada
* Alimentação
* Sono
* Higiene
* Atividades
* Humor
* Fotos
* Medicamentos
* Ocorrências

## FASE 5 — Portal dos pais

* Dashboard
* Jornada
* Fotos
* Atividades
* Notificações
* Comunicados
* Agenda

## FASE 6 — Financeiro

* Mensalidades
* Horas excedentes
* Cálculos
* Vencimentos
* Pagamentos
* Recibos
* Relatórios

## FASE 7 — Gestão

* Dashboard administrativo
* Relatórios
* Auditoria
* Indicadores
* Configurações

## FASE 8 — Refinamento

* PWA
* Notificações
* Performance
* Segurança
* Backup
* Testes
* Preparação para produção

---

# 46. Visão futura

Contratos digitais e assinatura eletrônica já foram implementados — ver seção 48. A arquitetura
deverá permitir futuramente adicionar:

* PIX
* Pagamento online
* Chat entre escola e responsáveis
* Agenda pedagógica
* Avaliações de desenvolvimento
* Controle de vacinas
* Documentos digitais
* Relatórios de desenvolvimento
* Integração com WhatsApp, quando tecnicamente e legalmente adequado
* Aplicativo nativo
* Múltiplas unidades da escola

---

# 47. Objetivo final

A Turminha da Tata deverá oferecer uma experiência em que:

**A escola ganha controle.**

**As cuidadoras ganham praticidade.**

**Os pais ganham segurança e transparência.**

**A criança recebe um acompanhamento mais completo.**

O sistema deverá transformar a rotina da escolinha em uma experiência digital integrada, simples e acolhedora.

---

# 48. Contrato digital e assinatura (implementado)

Quando o administrador vincula um responsável a uma criança, o sistema gera automaticamente um
contrato pendente para aquele par. Antes de aceitar, o responsável **não** consegue usar o Portal
dos Pais normalmente — só visualizar o contrato, assinar, aceitar ou sair.

## Fluxo do responsável

1. Login → o sistema detecta contrato pendente e leva direto para a tela de aceite.
2. Lê o contrato (cláusulas de prestação de serviço, rotina, alimentação, saúde, fotos, pagamentos
   etc.) numa experiência de leitura confortável no celular — sem precisar baixar arquivo nenhum.
3. Marca "Li e compreendi o conteúdo deste contrato".
4. Assina com o dedo, caneta digital ou mouse, numa área de assinatura dedicada — pode limpar e
   assinar de novo quantas vezes quiser antes de confirmar.
5. Revê um resumo (criança, responsável, versão, confirmação da assinatura) antes de finalizar.
6. Confirma o aceite → "Contrato aceito com sucesso!" → segue para o Portal dos Pais, liberado.

O contrato assinado fica disponível depois, a qualquer momento, em Perfil → Documentos.

## O que fica registrado

Cada aceite guarda, permanentemente: a criança, o responsável, a versão do contrato, o texto exato
apresentado naquela versão, a imagem da assinatura, data e hora do aceite, e um código de
verificação de integridade (garante que a assinatura corresponde exatamente àquele contrato e
àquela versão — não é possível reaproveitá-la em outro documento). Nada disso é sobrescrito: se a
administração publicar uma nova versão do contrato no futuro, a versão anterior e todos os aceites
já feitos continuam preservados, e só quem ainda não aceitou a versão nova é levado de volta à tela
de aceite.

## Administração

A administração acompanha, numa área própria: todos os contratos por criança e responsável, o
status de cada um (aceito, pendente, cancelado), busca e filtro por período, e pode reenviar um
lembrete para quem ainda não aceitou. Publicar uma nova versão do contrato nunca apaga nem altera
o histórico das anteriores.

---

## Próxima etapa

A próxima etapa do projeto será:

**IDENTIDADE VISUAL OFICIAL DA TURMINHA DA TATA**

Será desenvolvido:

1. Conceito da marca
2. Logo
3. Mascote Tata
4. Paleta de cores
5. Tipografia
6. Ícones
7. Elementos gráficos
8. Aplicação da marca no sistema
9. Tela de login
10. Dashboard administrativo
11. Aplicativo das cuidadoras
12. Aplicativo dos responsáveis

A identidade visual será definida **antes da construção das interfaces**, para que todo o sistema tenha uma aparência única e consistente.
