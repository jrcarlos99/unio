# ADR-011: Front só com o back da nuvem, sem mocks e sem dados de exemplo

- **Autora:** Carol
- **Data:** 2026-11-20
- **Status:** Aceita
- **Substitui:** o modo mock das ADR-004, ADR-005, ADR-007, ADR-008, ADR-009 e ADR-010 (o
  `VITE_MOCK_BACKEND`, os `.mock.ts`, o `mockBackend.ts` e os dados de exemplo). As regras
  de negócio dessas ADRs continuam valendo.
- **Back:** D056 (CORS por variável de ambiente) e D057 (políticas padrão do scorecard fora
  do perfil dev) em `unio/docs/decisoes.md`. Sem migration.
- **Auditoria:** [`docs/integracao/auditoria-front-back.md`](../integracao/auditoria-front-back.md)

## Contexto

O back passou a rodar no Azure App Service
(`https://unio-webapp-ghbmd2a6a4fmc4cb.brazilsouth-01.azurewebsites.net`). O front ainda:

- usava `http://localhost:8080` como padrão quando `VITE_API_URL` faltava;
- tinha dois modos (`VITE_MOCK_BACKEND`), com seis arquivos de dados de exemplo, quatro
  serviços `.mock.ts`, um adaptador de axios falso (`mockBackend.ts`) e lojas no
  `localStorage` que imitavam o back;
- mostrava números de exemplo com o selo "Dados de exemplo" quando o back não tinha o dado
  ou a chamada falhava (dashboard da startup, admin, tesouraria, captação).

Com o app publicado, qualquer número de exemplo vira informação falsa para o usuário.

## Decisão

### 1. Endereço do back

- `VITE_API_URL` é a única fonte da URL (lida em `services/api.ts`, sem barra no final).
- Sem a variável, o padrão é a URL do Azure (`API_URL_PADRAO`), não mais `localhost`. Um
  build publicado sem a variável continua falando com o back certo; para desenvolver com o
  back local, `VITE_API_URL=http://localhost:8080` no `.env` (modelo em `.env.example`).
- Não há outra URL de API no código: sem `fetch`, sem proxy no `vite.config.ts`, sem
  `localhost`, `8080` ou `8081` fixos. As únicas URLs absolutas restantes são links de
  navegação (`wa.me`, Google Maps) e o Google Fonts no `index.html`, todas `https`.
- Mixed content: se `VITE_API_URL` for `http://` numa página `https`, o `api.ts` avisa no
  console (o navegador bloquearia as chamadas).
- `.env` e `.env.*` estão no `.gitignore` (só o `.env.example` é versionado).

### 2. Sessão (401 e 403)

- Token vencido (`exp` do JWT) não sai do navegador: o `AuthContext` começa deslogado e o
  interceptor cancela a chamada e volta ao login.
- 401 em rota autenticada: apaga o token e vai para `/login?sessao=expirada`, que mostra
  "Sua sessão expirou". 401 de `/api/auth/*` (senha errada) não redireciona e mostra a
  mensagem da tela de login.
- 403 sem texto do back: "Você não tem permissão para esta ação." Com texto, vale o do back.
- O "Sair" do admin era um link para `/login` que não apagava o token; agora chama `logout`.

### 3. O que foi removido

- Chaves de modo: `MOCK_BACKEND`, `VITE_MOCK_BACKEND`, `DESCOBERTA_REAL`,
  `INVESTIDORES_REAIS`, `ADMIN_REAL`, `PRIVACIDADE_DISPONIVEL`, `REUNIOES_SO_COM_IDS_REAIS`,
  `REUNIOES_EXIGEM_MATCH`. (`VITE_USE_MOCKS` não era lida por nenhum código.)
- Dados de exemplo: `src/mocks/` inteira, `pages/admin/data/mockAdmin.ts`.
- Camadas de modo: `services/*.mock.ts`, `services/mockBackend.ts`,
  `services/popularidadePerfis.ts`, `services/avaliacoesStore.ts`,
  `services/reunioesStore.ts`, `services/contatoService.ts`, `services/unioLocal.ts`,
  `services/compatibilidade.ts` (score calculado no front).
- Componentes que só existiam para o exemplo: `SeloExemplo`, `CapitalCard`,
  `pages/admin/context/AuditContext.tsx` (log da sessão com "Admin Master"), `StatusBadge`
  e `Modal` do admin (status "Pendente/Aprovado" que não salvava).
- Campos de tipo que só os mocks preenchiam: `interesseReciproco`, `captacao`, tipos
  `*Completa`/`*Completo`, `CompatibilidadeLocal`.
- Cada `.api.ts` virou o único arquivo do serviço: `discoveryService.ts`,
  `investidoresService.ts`, `reunioesService.ts`. `avaliacoesService`,
  `dashboardStartupService` e `adminService` chamam só a API.

### 4. Itens sem endpoint no back: uma opção por item

| Item | Opção | Como ficou | Justificativa |
| --- | --- | --- | --- |
| Notificações (sino e bolinha) | a) derivar | Comparação da lista de `GET /api/meetings` com a última vista (já era assim no modo API) | São mudanças reais das reuniões; só o "lida" é local |
| Moderação de cadastros | a) + b) | Lista real de `GET /api/admin/users` (com conta excluída marcada); botões Aprovar/Rejeitar e coluna de status escondidos | Os botões não salvavam nada; a lista é real |
| Moderação de conteúdo | c) estado vazio | "Ainda não disponível: o back-end ainda não tem endpoint de moderação de conteúdo" | Não há o que listar sem endpoint |
| Contatos iniciados (card e etapa do funil) | b) esconder | Card removido; a etapa do funil virou "Match mútuo" (real, de `/api/interests/matches`) | Não há chat nem registro de contato no back; contagem por navegador enganava |
| "+N novos esta semana" | b) esconder | O card mostra só o total real de interessados | `interestsReceived` não traz data |
| "Teses alinhadas (85%+ score)" | b) esconder | Rodapé "Interesse mútuo com investidores" | O 85% era fixo |
| Benchmark do funil | b) esconder | Só a taxa de conversão real; sem taxa quando não há visualizações | Não há referência de mercado no back |
| Tese no topo do Descobrir | a) derivar | Respostas do onboarding guardadas no back (`GET /api/profile/onboarding`, chave `onboarding`); sem resposta, "tese ainda não configurada" | É dado real do próprio usuário |
| Tesouraria alocada / captação da rodada | b) esconder | Cards removidos | O back não tem carteira nem rodada |
| Item "Incluir logo oficial" da completude | b) esconder | Saiu do checklist; seus 10 pontos foram para o canvas (20) e o mercado detalhado (10) | Não há upload de logo; o item nunca podia ser concluído |
| Variação e sparkline do admin | b) esconder | Só o número | O back não guarda histórico (já era assim na ADR-010) |
| Dashboard quando uma chamada falha | c) indisponível | O bloco mostra "—" e "Indisponível no momento"; os outros continuam | Antes voltava ao número de exemplo |

O selo "Dados de exemplo" e o componente `SeloExemplo` deixaram de existir.

### 5. Ids e "não encontrado"

`utils/idsBack.ts` continua validando rotas: só inteiro positivo vira chamada. Um endereço
antigo como `/startups/biopay` não chama o back e mostra "Startup não encontrada"; um id
numérico que o back não conhece (404) mostra o mesmo. A lista de contrapartes das reuniões
ganhou `perfilHref` derivado do `userId` real (`/startups/{id}` ou `/investidores/{id}`).

### 6. Estado local (não é mock)

| Chave | Por quê | Inevitável? |
| --- | --- | --- |
| `unio_token` | Sessão (JWT) | Sim |
| `unio_onboarding_<email>` | Status do wizard. Sem ele o `OnboardingGate` pergunta ao back (`GET /api/profile/onboarding`) e grava a resposta | Sim: evita consultar o back a cada navegação; o back é a fonte quando falta |
| `unio_onboarding_<email>_<perfil>_respostas` | Rascunho do wizard passo a passo; ao concluir, a cópia vai para o back | Sim: o back só recebe o wizard completo |
| `unio_reunioes_vistas_<email>` e `unio_reunioes_notificacoes_<email>` | Última lista de reuniões vista e o "lida" das notificações | Sim, enquanto o back não tiver notificações |

Saíram do navegador: salvos, interesses, matches, contatos, eventos de contato, reuniões,
avaliações e visitas do modo mock.

### 7. Testes

- Os testes que dependiam de dados de exemplo (`dashboardStartup.mapping.test.ts`) foram
  reescritos com respostas no formato real do back (`tests/fixtures/respostasBack.ts`).
- Novos testes simulam só a camada HTTP (adapter do axios em `tests/helpers/httpSimulado.ts`):
  `tests/api.http.test.ts` (URL, token, 401, 403, 404, 409, 400, rede, token vencido) e
  `tests/adminService.http.test.ts`.
- `api.ts` e `adminService.ts` importam com extensão `.ts` para rodar no `node --test`.
- Dados de teste ficam só em `tests/`.

## Alternativas

- **Manter o modo mock só para desenvolvimento.** Descartado: o mock divergia do back
  (score calculado no front, match instantâneo, contatos falsos) e escondia erros de
  integração. Para desenvolver, o back roda localmente.
- **Manter `localhost` como padrão.** Descartado: um build publicado sem a variável quebra
  para todo mundo.
- **Números zerados no lugar dos de exemplo quando a chamada falha.** Descartado: zero é um
  dado; "indisponível" é a verdade.

## Consequências

- Uma falha do back aparece como erro ou "indisponível", nunca como número inventado.
- Quem publicar o front precisa definir `VITE_API_URL` na hospedagem e incluir o endereço
  em `UNIO_CORS_ALLOWED_ORIGINS` no App Service (D056).
- **Pendência crítica:** o App Service roda o `main`, que divergiu desta linha. As rotas
  `/api/discovery`, `/api/interests`, `/api/saved`, `/api/meetings/counterparts`,
  `/counter-proposal`, `/details`, `/api/profile/me/popularity`, `/api/profile-views` e
  `/api/reviews/summary/{id}` ainda não existem na nuvem, e as migrations colidem
  (`V23` diferente nas duas linhas). Ver a auditoria.
- Pendências de back para o squad: notificações, moderação de cadastros e de conteúdo,
  contato além do e-mail, logo, histórico de métricas, data do interesse recebido.
- Arquivos alterados: `services/api.ts`, `contexts/AuthContext.tsx`, `pages/Login.tsx`,
  `services/*Service.ts`, `services/dashboardStartup.mapping.ts`, `services/admin.mapping.ts`,
  `pages/startup/VisaoGeral.tsx`, `pages/investidor/HomeInvestidor.tsx`,
  `pages/startup/Investidores.tsx`, `pages/admin/**`, `components/dashboard/*`,
  `components/reunioes/SolicitarReuniaoModal.tsx`, `components/unios/*`, tipos e
  comentários; `.env.example`; READMEs.
