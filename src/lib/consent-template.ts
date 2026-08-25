/**
 * Texto padrão da primeira versão do termo de consentimento LGPD — usado para popular a
 * ConsentVersion inicial (1.0) na primeira vez que for necessária. Distinto do contrato de
 * prestação de serviços (src/lib/contract-template.ts): este termo trata especificamente do
 * tratamento de dados pessoais, não da relação contratual de cuidados infantis. Não inventa base
 * legal específica além da estrutura da LGPD (Lei 13.709/2018); ver docs/lgpd.md para o
 * detalhamento de categorias de dados, base legal por finalidade e o encarregado de dados.
 */
export const DEFAULT_CONSENT_CONTENT = `TURMINHA DA TATA
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS (LGPD)

1. QUEM SOMOS
A Turminha da Tata trata os dados pessoais descritos neste termo na qualidade de controladora, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).

2. QUAIS DADOS SÃO TRATADOS
Dados de identificação e contato do responsável e da criança; dados de saúde da criança (alergias, restrições alimentares, medicamentos, temperatura e observações registradas); fotografias, quando autorizadas separadamente; e os registros da rotina diária (presença, alimentação, sono, higiene, atividades, humor).

3. PARA QUE OS DADOS SÃO USADOS
Prestação do serviço de cuidados infantis contratado, comunicação com o responsável através do Portal dos Pais, cumprimento de obrigações legais e regulatórias aplicáveis, e segurança da criança durante a permanência na instituição.

4. COM QUEM OS DADOS PODEM SER COMPARTILHADOS
Os dados não são vendidos ou compartilhados com terceiros para fins comerciais. Podem ser compartilhados com prestadores de serviço estritamente necessários à operação (ex.: armazenamento de dados em nuvem) e com autoridades quando exigido por lei.

5. POR QUANTO TEMPO OS DADOS SÃO GUARDADOS
Enquanto durar o vínculo da criança com a instituição, e pelo período adicional necessário para cumprir obrigações legais após o encerramento — ver a política de retenção detalhada em docs/lgpd.md.

6. DIREITOS DO TITULAR
O responsável pode, a qualquer momento, solicitar confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, e demais direitos previstos no art. 18 da LGPD, através dos canais de contato informados pela administração.

7. ENCARREGADO DE DADOS (DPO)
O contato do encarregado de dados está disponível em docs/lgpd.md e nos canais oficiais da instituição.

8. CONSENTIMENTO
Ao aceitar este termo, o responsável declara ciência do tratamento de dados pessoais descrito acima, podendo revogar o consentimento a qualquer momento nos casos em que a revogação for juridicamente possível.

---

Este documento deverá ser revisado e aprovado pela administração da Turminha da Tata e, quando necessário, por profissional jurídico especializado em proteção de dados antes de sua utilização oficial.`;
