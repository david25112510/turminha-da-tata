# Cenas da Tatá e proteção anti-bot

`TataScene` centraliza 16 cenas determinísticas: `WELCOME`, `LOGIN`, `SECURITY`, `ENROLLMENT`,
`GUIDE_LEFT`, `GUIDE_RIGHT`, `THINKING`, `SUCCESS`, `CELEBRATION`, `EMPTY`, `ERROR`, `PARENTS`,
`CAREGIVER`, `SLEEPING` e `PHOTO`. Os WebP otimizados ficam em `public/images/tata/scenes`; todos
possuem canal alfa real para integração sem painéis ou fundos retangulares.

`LOADING_HEART` é a cena de processamento. `TataLoading` oferece níveis `micro`, `contextual` e
`immersive`, mensagens por contexto, espera de 250 ms para evitar flashes, permanência visual
mínima discreta, semântica `aria-live`/`aria-busy` e fallback estático com `prefers-reduced-motion`.

O Cloudflare Turnstile Managed é carregado somente nos formulários públicos de login, cadastro,
criação da conta de matrícula e recuperação de senha. Toda decisão é refeita no servidor pelo
Siteverify antes de rate limit, autenticação ou gravação. Produção exige
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`; ausência ou indisponibilidade externa
falha de modo seguro. Desenvolvimento usa as chaves oficiais de teste da Cloudflare.

No login com MFA, o primeiro desafio protege a validação inicial de senha; ao abrir a etapa TOTP o
widget é renovado e o novo token é validado por `authorize`, preservando a barreira MFA existente.
