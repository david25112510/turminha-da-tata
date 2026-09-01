# Matriz de regressão de segurança

| ID | Cenário | Perfil | Esperado | Automatizado |
| --- | --- | --- | --- | --- |
| SEC-001 | Guardian A acessa Child B por URL | GUARDIAN | DENY | YES |
| SEC-002 | Caregiver acessa Admin/financeiro | CAREGIVER | DENY | YES |
| SEC-003 | Conta desativada usa JWT existente | ALL | DENY | YES |
| SEC-004 | Guardian solicita storage de outra família | GUARDIAN | DENY | YES |
| SEC-005 | Medicamento fora de ACTIVE | CAREGIVER | DENY | UNIT |
| SEC-006 | Seed sem credencial de produção | OPERATOR | FAIL CLOSED | UNIT/MANUAL |
| SEC-007 | Reset token expirado/reutilizado/concorrente | PUBLIC | DENY | YES |
| SEC-008 | Turnstile ausente/inválido/falha | PUBLIC | DENY | UNIT |
| SEC-009 | Webhook inválido, pendente ou duplicado | PUBLIC | DENY/IDEMPOTENT | YES |
| SEC-010 | Contrato de outra família | GUARDIAN | DENY | YES |
| SEC-011 | Headers CSP/nosniff/framing/referrer/permissions | PUBLIC | PRESENT | YES |
| SEC-012 | PWA tenta cachear áreas privadas/API | ALL | NO CACHE | UNIT/MANUAL |
| SEC-013 | Aprovação repetida de matrícula | ADMIN | IDEMPOTENT | UNIT/E2E |
| SEC-014 | Pickup de outra criança/inativo/inexistente | CAREGIVER | DENY | UNIT |
| SEC-015 | Histórico aceito após nova versão documental | GUARDIAN | IMMUTABLE | UNIT/E2E |

O gate `npm run test:e2e:security` cobre autenticação, isolamento familiar, documentos, revogação, storage e headers. Cenários marcados MANUAL exigem evidência operacional antes de produção.
