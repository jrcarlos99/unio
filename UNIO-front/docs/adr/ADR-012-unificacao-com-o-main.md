# ADR-012: Front da linha da Carol no merge com o main

- **Autora:** Carol
- **Data:** 2026-11-21
- **Status:** Aceita
- **Back:** D058 a D062 em `unio/docs/decisoes.md`
- **Auditoria:** [`docs/integracao/auditoria-front-back.md`](../integracao/auditoria-front-back.md)

## Contexto

O App Service publica o `main`. A branch `feat/producao-sem-mocks` divergiu dele e
precisava ser unida para publicar. No front, o `main` trouxe três mudanças:

- `src/services/discoveryService.ts`: a lista do investidor trocou o mock por
  `GET /api/scorecard/recommendations?investorId=00000000-0000-0000-0000-000000000002`
  (id fixo), com os campos da startup preenchidos com valores padrão ("Outro",
  "Operação", cidade vazia). Salvos, interesses, contatos e tesouraria continuavam no
  `localStorage` e em `mocks/`.
- `src/services/investidoresService.ts`: a lista de investidores da startup chamava a
  mesma rota de recomendações de startups, com o mesmo investidor fixo, e mostrava as
  startups recebidas como se fossem investidores ("Startup 0000..."). Com a correção de
  IDOR do próprio `main`, essa rota só aceita INVESTOR e ADMIN, então a startup recebia 403.
- `vercel.json`: novo, com o rewrite de SPA (`/(.*)` para `/index.html`).

Na linha da Carol, os mesmos dois serviços já falam só com o back real
(`/api/discovery`, `/api/interests`, `/api/saved`, `/api/interests/matches`, ADR-008 e
ADR-011), sem `mocks/` (a pasta não existe mais).

## Decisão

1. **Conflitos nos dois serviços: fica a versão da Carol, inteira.** A do `main` dependia
   de `mocks/` (apagada na ADR-011), de um id de investidor fixo e de dados padrão no
   lugar dos reais, o que a ADR-011 proíbe. O que o `main` buscava (lista com score do back)
   a versão da Carol já faz por `/api/discovery`, que calcula o score sob demanda e traz o
   perfil público. Nenhuma tela do `main` chama esses serviços de outro jeito.
2. **`vercel.json` do `main` fica** (sem conflito). Ele não muda nada no build do Vite e
   serve a quem publica o front na Vercel.
3. **Login inválido.** O back unido responde 401 com `message: "Credenciais inválidas"`
   (D062). `getApiErrorMessage` já mostra o `message` do back e não trata o 401 de
   `/api/auth/*` como sessão expirada; o fallback da tela continua para um 401 sem corpo.
   Só o comentário de `services/api.ts` mudou.
4. **Rotas novas do `main` sem uso no front:** `/api/matches` (3 rotas),
   `/api/profile/startup/{id}`, `/api/profile/investor/{id}`,
   `/api/profile/startup/dashboard` e `/api/scorecard/recommendations/investors`. O front
   continua com as rotas equivalentes da descoberta, do interesse e da popularidade, que
   no back usam a mesma regra (D058, D060, D061). Não há tela nova a ligar.

## Alternativas

- (a) Juntar as duas versões dos serviços: traria de volta `mocks/`, o id fixo e os
  campos padrão, contra a ADR-011.
- (b) Trocar a lista do front para `/api/scorecard/recommendations`: perderia o cálculo
  sob demanda, os filtros e o perfil público que `/api/discovery` já traz.

## Consequências

- Sobrescritos pela versão da Carol (para conferência de quem escreveu a do `main`):
  `src/services/discoveryService.ts` e `src/services/investidoresService.ts` (commit
  `b1a3ed9`, "feat(front): ajusta serviços de discovery e investidores"). Nenhum outro
  arquivo do front tinha mudança no `main`.
- Build, lint (mesmos 20 avisos, 0 erros) e testes (103) continuam verdes.
- A auditoria front x back foi refeita contra o back unido: as 39 rotas que o front usa
  existem.
