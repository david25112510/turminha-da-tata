# Mapa técnico de retenção

Este documento não define prazo nem base legal. A decisão final exige revisão jurídico-operacional e deve considerar o melhor interesse da criança. `onDelete: Cascade` é apenas comportamento técnico, não uma política de retenção.

| Entidade | Tratamento preliminar | Motivo e impacto da exclusão permanente |
| --- | --- | --- |
| User / Guardian | ANONYMIZE / LEGAL_REVIEW | Preservar autoria e vínculos necessários sem manter identificadores além da finalidade. |
| Child | LEGAL_REVIEW | Raiz de grande parte do histórico; exclusão em cascata pode destruir prova operacional. |
| Attendance / Routine | RETAIN / LEGAL_REVIEW | Histórico de cuidado, horários e prestação do serviço. |
| Health / Medication / Incident | RETAIN / LEGAL_REVIEW | Dados sensíveis e evidência de segurança; acesso e prazo devem ser mínimos e formalizados. |
| Photo e objeto físico | DELETE / LEGAL_REVIEW | Exige apagar registro e objeto somente após verificar obrigações e autorizações. |
| Invoice / Payment | RETAIN / LEGAL_REVIEW | Obrigações fiscais, contábeis e contestação. |
| Contract / Consent / Privacy acceptance | RETAIN / LEGAL_REVIEW | Preservar versão, conteúdo, hash, assinatura, ator e metadados do aceite. |
| AuditLog | RETAIN / LEGAL_REVIEW | Deve sobreviver ao ator; restringir conteúdo e nunca registrar segredos. |

Antes de automatizar exclusão: definir prazos, base legal, anonimização irreversível, suspensão por litígio, backup, propagação ao storage e trilha auditável.
