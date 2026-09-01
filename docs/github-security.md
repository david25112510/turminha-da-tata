# Proteção do GitHub

Estado verificado e configurado em 31/08/2026: `master` exige pull request, branch atualizada e os
checks `build-and-test` e `security-smoke`; force push, exclusão e conversas não resolvidas são
bloqueados. Como há um único mantenedor, a regra exige zero aprovações externas.

Configuração proporcional para um mantenedor único:

1. GitHub → Settings → Branches → Add branch protection rule → `master`.
2. Ativar **Require a pull request before merging**, sem exigir aprovação de terceiro enquanto houver apenas um mantenedor.
3. Ativar **Require status checks to pass** e selecionar `build-and-test` e `security-smoke`.
4. Ativar **Require branches to be up to date before merging**.
5. Manter bloqueados force push e exclusão da branch.

Se o plano/API não aceitar a regra, o repositório deve continuar classificado como não pronto para produção; CI verde isoladamente não substitui a proteção.
