# Auditoria da integração front x back

- **Autora:** Carol
- **Data:** 2026-11-20 (inventário refeito em 2026-11-21 sobre o back unido com o `main`)
- **Branch:** `feat/unificacao-main` (front da Carol e back unido com o `origin/main`)
- **Back na nuvem:** `https://unio-webapp-ghbmd2a6a4fmc4cb.brazilsouth-01.azurewebsites.net`
- **Decisões:** ADR-011 e ADR-012 (front), D056 a D062 (back)

## Resumo

| Item | Resultado |
| --- | --- |
| Chamadas HTTP do front | 53 pontos de chamada em 13 arquivos (12 serviços e o `AuthContext`), todos pelo cliente `api` (axios) com `baseURL` = `VITE_API_URL` |
| Endpoints distintos que o front usa | 39 (método + rota) |
| Desses, existem no back unido (`feat/unificacao-main`, conferido no `/v3/api-docs` rodando) | 39 de 39 (OK) |
| Desses, existem hoje na nuvem | 23 de 39 até a publicação do merge (a nuvem roda o `main` antigo); 39 de 39 depois dela |
| Divergências de contrato encontradas | 9, todas corrigidas (seção "Divergências") |
| Chamadas sem endpoint no back | 0. Itens de tela sem endpoint ficaram escondidos ou com estado vazio honesto (ADR-011, seção 4) |
| Endpoints do back sem uso no front | 28 de 67 no back unido; 7 deles vieram do `main` (seção "Endpoints do back sem uso no front") |
| Fluxo completo contra o back **local** desta branch | 38 de 38 etapas OK |
| Fluxo completo contra a **nuvem** | 19 OK, 12 falhas em 2026-11-20: a nuvem roda o `main`, sem as rotas desta branch |
| Fluxo completo contra o **back unido** (banco descartável) | 36 de 36 etapas OK em 2026-11-21 (seção "Reinventário depois do merge") |
| Chamadas a outra URL que não a do back | Nenhuma |

**Atenção (atualizado em 2026-11-21):** o App Service publica o `origin/main`. A branch
`feat/unificacao-main` une as duas linhas: as migrations da Carol foram renumeradas para
V24 a V28 depois da `V23__create_match_interest.sql` do `main`, e a V29 junta os
interesses em `match_interests` (D058, D059). O Flyway foi provado sobre um banco no
estado do `main`. As rotas que faltam na nuvem passam a existir quando o pull request for
aceito e o workflow publicar (pendência P1).

## Como o inventário foi feito

- **Front:** busca por `api.get|post|put|delete|patch` em `src/` e leitura de cada serviço
  (URLs montadas por variável, como `rota(id, "accept")`, foram resolvidas à mão). Busca por
  `fetch(`, `axios.create`, `http://`, `https://`, `localhost`, `8080`, `8081` e `import.meta.env`.
- **Back:** `@*Mapping` de todos os controllers (60 rotas) e o `/v3/api-docs` local
  (50 caminhos) e da nuvem (43 caminhos). Em 2026-11-21, o `/v3/api-docs` do back unido
  rodando (67 operações) foi cruzado com a coluna Endpoint desta tabela por script.
- **Formato:** DTOs do back (`record`s e `Map` de `ProfileService`/`AdminService`) contra os
  tipos `*Back` dos mapeamentos do front (`discovery.mapping.ts`, `reunioes.mapping.ts`,
  `avaliacoes.mapping.ts`, `admin.mapping.ts`, `perfilFromOnboarding.ts`).
- **Erros:** todo 401 passa pelo interceptor de `services/api.ts` (apaga o token e volta ao
  login; no `/api/auth/*` mostra a mensagem da tela). 400, 403, 404 e 409 viram mensagem
  em `getApiErrorMessage` (texto do back primeiro; 403 sem texto: "Você não tem permissão
  para esta ação.") ou em `erroDaApi` (reuniões, com o erro por campo no 400). Na tabela,
  "global" é esse tratamento; os casos especiais estão escritos.

## Tabela: chamadas do front

Colunas: **Back** = existe no back unido (`feat/unificacao-main`); **Nuvem** = existe hoje no App Service (antes da publicação do merge);
**Formato** = request e response conferem com o DTO.

| Tela | Função do front | Método | Endpoint | Back | Nuvem | Formato | Erros 400/401/403/404/409 | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | `AuthContext.login` | POST | `/api/auth/login` | sim | sim | `{email,password}` → `{token,email,role}` | 401 "Credenciais inválidas" do back (D062), sem redirecionar; sem corpo = mensagem da tela | OK |
| Cadastro | `AuthContext.register` | POST | `/api/auth/register` | sim | sim | `{email,password,role,documento,acceptedTerms}` → `AuthResponse` | global (400 por campo, 409 e-mail/documento) | OK |
| Sessão (todas) | `AuthContext.fetchProfile` | GET | `/api/profile/me` | sim | sim | `Map` do perfil; ADMIN só resumo | 404 = conta sem perfil (vai ao onboarding); 401 = login | OK |
| Onboarding (fim) | `criarPerfilPeloOnboarding` | POST | `/api/profile/startup` | sim | sim | `StartupCreateRequest` (ADR-002) | 400 validação; 409 = já existe (sucesso) | OK |
| Onboarding (fim) | `criarPerfilPeloOnboarding` | POST | `/api/profile/investor` | sim | sim | `InvestorCreateRequest` (ADR-002) | 400 validação; 409 = já existe (sucesso) | OK |
| Onboarding, gate, tese, pitch, equipe, documentos, visibilidade, extras do investidor | `readAnswers`, `readStatus`, `teamService`, `pitchService`, `documentService`, `visibilityService`, `investorProfileService` | GET | `/api/profile/onboarding` | sim | sim | `{status,respostas,atualizadoEm}` | global; gate sem resposta = wizard | OK |
| Mesmas telas | `updateAnswers`, `writeStatus`, `teamService.salvar` | PUT | `/api/profile/onboarding` | sim | sim | `OnboardingUpdateRequest {status?, respostas?}` (mescla por chave, ADR-003) | global; 20 KB checado no front | OK |
| Meu perfil (startup) | `startupProfileService` | GET / PUT | `/api/profile/me` | sim | sim | chaves do `ProfileService.updateCurrentProfile` | global | OK |
| Meu perfil (investidor) | `investorProfileService` | GET / PUT | `/api/profile/me` | sim | sim | `{disponibilidade, disponibilidadeObservacao}` | global | OK |
| Descobrir | `listarStartupsRecomendadas` | GET | `/api/discovery/startups?q&segmento&estagio&limit&offset` | sim | **não** | `DiscoveryPageResponse`; até 3 páginas de 100 | global; 403 se não for INVESTOR | OK |
| Investidores, Visão geral | `listarInvestidoresRecomendados` | GET | `/api/discovery/investors?q&segmento&tipo&limit&offset` | sim | **não** | idem | global; 403 se não for STARTUP | OK |
| Perfil da startup | `obterStartup` | GET | `/api/discovery/startups/{userId}` | sim | **não** | `DiscoveryItemResponse` | 404 → "Startup não encontrada"; id não numérico não chama | OK |
| Perfil do investidor | `obterInvestidor` | GET | `/api/discovery/investors/{userId}` | sim | **não** | idem | 404 → "Investidor não encontrado" | OK |
| Cards e perfis | `enviarFeedback` | POST | `/api/scorecard/feedback` | sim | sim | `{startupId,investorId,scorePolicyId,action}` | silencioso; 409 duplicado = sucesso | OK |
| Tenho interesse | `registrarInteresse` (2 serviços) | PUT | `/api/interests/{targetUserId}` | sim | **não** | → `{status: ENVIADO\|MATCH, matchedAt}` | global (toast) | OK |
| Desfazer interesse / match | `desfazerInteresse`, `desfazerMatch` | DELETE | `/api/interests/{targetUserId}` | sim | **não** | → `{status, canceledMeetings}` | global (toast) | OK |
| Meus unios, contato, Visão geral | `listarUnios`, `obterContato`, `contarMatches` | GET | `/api/interests/matches` | sim | **não** | `ConnectionResponse[]` com `contact.email` | global; falha no dashboard = "indisponível" | OK |
| Salvar | `salvarStartup`, `salvarInvestidor` | PUT | `/api/saved/{targetUserId}` | sim | **não** | sem corpo → 204 | global (toast) | OK |
| Remover salvo | `removerSalvo` (2 serviços) | DELETE | `/api/saved/{targetUserId}` | sim | **não** | sem corpo → 204 | global (toast) | OK |
| Salvos | `listarSalvos` (2 serviços) | GET | `/api/saved` | sim | **não** | `ConnectionResponse[]` | global | OK |
| Reuniões (Com quem) | `listarContrapartes` | GET | `/api/meetings/counterparts` | sim | **não** | `MeetingCounterpartResponse[]` | `erroDaApi` | OK |
| Reuniões, sino, dashboard | `listarReunioes` | GET | `/api/meetings?from&to` | sim | sim | `MeetingResponse[]` | `erroDaApi`; dashboard = "indisponível" | OK |
| Detalhe / .ics | `obterReuniao` | GET | `/api/meetings/{id}` | sim | sim | `MeetingResponse` | 404 → "Reunião não encontrada." | OK |
| Solicitar reunião | `solicitarReuniao` | POST | `/api/meetings` | sim | **formato antigo** | `{participantId,subject,durationMinutes,suggestedTimes[],format,message,location*}` | 400 por campo; 403 sem match (D051); 409 conflito | OK |
| Aceitar | `responderSolicitacao` | POST | `/api/meetings/{id}/accept` | sim | sim | `{startsAt}` (um dos sugeridos) | 409 conflito/horário | OK |
| Recusar | `responderSolicitacao` | POST | `/api/meetings/{id}/decline` | sim | sim | sem corpo | `erroDaApi` | OK |
| Propor outros / remarcar | `responderSolicitacao`, `remarcarReuniao` | POST | `/api/meetings/{id}/counter-proposal` | sim | **não** | `{suggestedTimes[]}` | 400 por campo; 409 | OK |
| Cancelar | `cancelarReuniao`, `cancelarReunioesDoUnio` | POST | `/api/meetings/{id}/cancel` | sim | sim | `{reason?}` | `erroDaApi` | OK |
| Compareci | `marcarComoRealizada` | POST | `/api/meetings/{id}/complete` | sim | sim | sem corpo → `REALIZADA` | 409 antes do horário (mensagem do back) | OK |
| Link ou local | `definirLinkOuLocal` | PATCH | `/api/meetings/{id}/details` | sim | **não** | `{meetingUrl?, location?}` | 400 por campo | OK |
| Avaliar | `avaliarReuniao` | POST | `/api/meetings/{id}/reviews` | sim | sim | `{rating, comment?}` → `ReviewResponse` (sem comentário) | 409/400 "já avaliou" tratado; global | OK |
| Pendentes de avaliação | `jaAvaliou`, `listarPendentesDeAvaliacao` | GET | `/api/meetings/{id}/reviews` | sim | sim | `ReviewResponse[]` | falha = fora da lista (sem aviso falso) | OK |
| Popularidade (Visão geral, aba) | `obterPopularidade` | GET | `/api/profile/me/popularity` | sim | **não** | `PopularityResponse` | card com erro; dashboard "indisponível" | OK |
| Selo de popularidade | `obterPopularidadePublica` | GET | `/api/reviews/summary/{userId}` | sim | **não** | `ReviewSummaryResponse` | falha = sem selo | OK |
| Abrir perfil | `registrarVisitaPerfil` | POST | `/api/profile-views` | sim | **não** | `{targetUserId}` → 204 | silencioso | OK |
| Privacidade | `exportarMeusDados` | GET | `/api/privacy/export` | sim | sim | JSON do titular | global | OK |
| Privacidade | `excluirMinhaConta` | POST | `/api/privacy/delete-account` | sim | sim | `{password, confirmed:true}` → 204 | 403 "Senha incorreta" na tela | OK |
| Admin: Visão geral | `obterVisaoGeralAdmin` | GET | `/api/admin/metrics` | sim | sim | `AdminMetricsResponse` (`interestsSent`, `mutualMatches` só na branch) | erro na tela; 403 se não for ADMIN | OK |
| Admin: Auditoria | `listarAuditoria` | GET | `/api/admin/audit` | sim | sim | `AuditLogResponse[]` | erro na tela | OK |
| Admin: Cadastros | `listarUsuarios` | GET | `/api/admin/users` | sim | sim | `{id:number,email,role,createdAt,deletedAt}` | erro na tela | OK (era DIVERGENTE) |

Pontos de chamada por método: 22 GET, 15 POST, 9 PUT, 6 DELETE e 1 PATCH (53 no total;
algumas linhas juntam a mesma rota usada por mais de um serviço).

## Divergências encontradas e corrigidas

| # | Onde | Divergência | Correção |
| --- | --- | --- | --- |
| 1 | `services/api.ts` | Sem `VITE_API_URL`, o build apontava para `http://localhost:8080` | Padrão = URL do Azure; barra final removida |
| 2 | `services/api.ts` | Token vencido ainda era enviado; 401 voltava ao login sem explicar | Checa `exp` antes de enviar; `/login?sessao=expirada` com aviso |
| 3 | `services/api.ts` | 403 sem texto do back caía na mensagem genérica da tela; a de rede dizia "verifique se o back-end está rodando" | 403: "Você não tem permissão para esta ação."; rede: mensagem para o usuário |
| 4 | Login | Com a mensagem padrão de 401, a senha errada (o back local responde 401 sem corpo) diria "sessão expirada" | `/api/auth/*` usa a mensagem da tela (achado no teste de fumaça) |
| 5 | Admin: Cadastros | `id` tratado como texto, `deletedAt` ignorado, chamada direto na página; status "Pendente" e Aprovar/Rejeitar só na memória | `usuarioDoBack` (id → texto, conta excluída marcada) em `adminService`; status e botões falsos removidos |
| 6 | Admin: sidebar | "Sair" era link para `/login` e não apagava o token; perfil "Admin Master" fixo | `logout()` e e-mail da conta logada |
| 7 | Visão geral (startup) | Chamada que falhava virava número de exemplo; "+3 novos", "85%+ score", benchmark e contatos iniciados eram fixos | `montarResumo` só com o back; `null` = "indisponível" (ADR-011) |
| 8 | Visão geral (startup) | Card "Investidores interessados" levava a `/investidores?filtro=interessados`, que a página ignora | Link removido |
| 9 | Reuniões | `perfilHref` da contraparte nunca vinha preenchido pela API | Derivado do `userId` real (`/startups/{id}` ou `/investidores/{id}`) |

No back:

| # | Onde | Divergência | Correção |
| --- | --- | --- | --- |
| B1 | `CorsConfig` | Origens fixas no código: front em outro endereço fica bloqueado | `unio.cors.allowed-origins` / `UNIO_CORS_ALLOWED_ORIGINS` (D056), com testes |
| B2 | `ScorecardSeedRunner` | Políticas padrão só no perfil dev: banco novo em produção sem política → descoberta 500 (`POLICY_NOT_FOUND`) | Seed idempotente em qualquer perfil, com chave para desligar (D057), com teste |
| B3 | Login (merge com o `main`) | Senha errada: 401 sem corpo nesta linha, "Não autenticado" no `main` | 401 "Credenciais inválidas" no JSON padrão (D062), com teste |
| B4 | Interesse e match (merge com o `main`) | Duas tabelas para o mesmo fato (`match_interests` do `main`, `user_interests` da Carol) | Uma fonte, `match_interests`; as rotas das duas linhas usam a mesma regra (D058) |

Dados de demonstração no back: não há `DataLoader`, endpoint de demo nem migration com
perfis de teste. O único `INSERT` em migration (`V24`) copia horários de reuniões
existentes. O `AdminSeedRunner` ficou como estava (D054). Nada foi desativado nem apagado.

## Fluxo de autenticação

| Verificação | Como | Resultado |
| --- | --- | --- |
| Login | `POST /api/auth/login` → token no `localStorage` (`unio_token`) → `GET /api/profile/me` | OK (local e nuvem) |
| Guarda do token | `Authorization: Bearer` em toda chamada, menos `/api/auth/*` | OK (`tests/api.http.test.ts`) |
| Expiração | JWT de 60 min (`app.jwt.expiration-minutes`); `exp` checado no início e antes de cada chamada; 401 do back também volta ao login | OK |
| Logout | `AuthContext.logout` apaga o token e vai a `/login`; admin agora usa o mesmo | OK |
| Rotas por perfil | `ProtectedRoute allowedRoles`: `admin` em `/admin/*`; `investidor` e `startup` nas suas rotas; o back confirma com `@PreAuthorize` (403) | OK (6d do teste de fumaça: startup na rota de investidor = 403) |
| Conta sem perfil | `GET /api/profile/me` 404 → perfil lido do token → `CadastroGate` manda ao onboarding | OK (4b do teste de fumaça) |
| Token adulterado | back responde 401 | OK (local e nuvem) |

## Teste de fumaça

Script em Node (sem dependências), com duas contas novas `e2e-<data>-startup@example.com` e
`e2e-<data>-investidor@example.com`, senhas aleatórias que nunca são impressas, e exclusão
das duas contas no final pela rota de privacidade.

| Etapa | Local (esta branch) | Nuvem (main) |
| --- | --- | --- |
| 1a. `GET /actuator/health` | OK 200 | OK 200 |
| 1b. `GET /v3/api-docs` | OK 200 (50 caminhos) | OK 200 (43 caminhos) |
| 2a. Preflight de origem permitida | OK 200, `Allow-Origin` presente | OK 200, `Allow-Origin` presente |
| 2b. Preflight de origem desconhecida | OK 403, sem `Allow-Origin` | OK 403, sem `Allow-Origin` |
| 3. Login inválido | OK 401 | OK 401 ("Não autenticado") |
| 3b. Token adulterado | OK 401 | OK 401 |
| 4. Cadastro startup e investidor | OK 201 | OK 201 |
| 4b. `/api/profile/me` sem perfil | OK 404 | OK 404 |
| 5. Perfis e status do onboarding | OK | OK |
| 6a–c. Descoberta (lista e detalhe) | OK 200 (startup e2e na lista) | FALHA 404 (rota não existe) |
| 6d. Startup na rota de investidor | OK 403 | FALHA 404 |
| 6e. Visita ao perfil | OK 204 | FALHA 404 |
| 6f. Salvar e listar salvos | OK 204/200 | FALHA 404 |
| 7a. Interesse do investidor | OK `ENVIADO` | FALHA 404 |
| 7b. Interesse da startup | OK `MATCH` | FALHA 404 |
| 7c. Matches com e-mail | OK | FALHA 404 |
| 8a. Contrapartes da reunião | OK (startup na lista) | FALHA 400 |
| 8b. Solicitar reunião | OK 201 `PENDENTE` | FALHA 400 "O título é obrigatório" (contrato antigo) |
| 8c. Aceitar | OK `CONFIRMADA` | não executada |
| 8d. Compareci antes do horário | OK 409 (regra do back) | não executada |
| 9b. Compareci depois do horário | OK `REALIZADA` | não executada |
| 9c. Avaliação | OK 201 | não executada |
| 9d. Avaliação repetida | OK 409 | não executada |
| 9e. Comentário não volta | OK | não executada |
| 9f–g. Popularidade e resumo público | OK 200 | não executada |
| 10. Export LGPD | OK 200 | OK 200 |
| 11. Exclusão das duas contas | OK 204 | OK 204 |
| 11b. Login após exclusão | OK 401 | OK 401 |
| **Total** | **38 OK, 0 falha** | **19 OK, 12 falhas** |

As 12 falhas da nuvem são todas de rotas que existem só nesta branch. Nenhuma conta e2e
ficou ativa (11 e 11b nos dois ambientes).

## Reinventário depois do merge (2026-11-21)

O back unido (`feat/unificacao-main`) subiu contra um PostgreSQL descartável (Flyway
aplicou V1 a V29), sem erro, sem mapeamento ambíguo e sem bean duplicado, com o
administrador criado pelo seed (`UNIO_ADMIN_EMAIL`/`UNIO_ADMIN_PASSWORD`). O fluxo foi
feito pela API com duas contas e2e, apagadas no final, e o banco foi descartado.

| Etapa | Resultado |
| --- | --- |
| Cadastro startup e investidor; login inválido | OK (201, 201; 401 "Credenciais inválidas") |
| Perfis e `/api/profile/me` | OK |
| Descoberta dos dois lados e detalhe | OK (score 92,5) |
| Perfil público do `main` antes do match | OK (`email` nulo) |
| Recomendações do `main` (investidor e startup) | OK (sem id na query; e-mail do investidor oculto) |
| Interesse da startup por `/api/interests` e do investidor por `/api/matches/interest` | OK (`ENVIADO`, depois `MATCHED`) |
| Matches pelas duas rotas (`/api/interests/matches` com e-mail; `/api/matches`) | OK (o mesmo match) |
| Salvos | OK |
| Reunião: propor, aceitar, Compareci antes (409) e depois do horário | OK (`REALIZADA`) |
| Painel da startup do `main` | OK (`totalMatches` 1) |
| Avaliação dos dois lados | OK (201, sem comentário na resposta) |
| Visita, popularidade e resumo público | OK (1 visita, 1 reunião, 1 interesse recebido) |
| Admin do seed: login, métricas, usuários, auditoria | OK (2 interesses, 1 match mútuo) |
| Exportação; exclusão das duas contas; login depois | OK (204, 204; 401) |
| Match some das métricas depois da exclusão | OK (0) |
| **Total** | **36 de 36 OK** |

## Endpoints do back sem uso no front

| Endpoint | Motivo |
| --- | --- |
| `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Recuperação de senha sem tela ("em breve" no login, ADR-007) |
| `GET /api/consent/me`, `POST /api/consent/revoke` | Consentimento é gravado no cadastro (`acceptedTerms`); não há tela de revogar |
| `GET/POST /api/conversations`, `.../messages`, `.../read` | Produto decidiu não ter chat; contato é externo depois do match |
| `POST /api/profile/startup/pitch` | Upload de arquivo de pitch sem tela (o pitch fica no JSON do onboarding) |
| `GET /api/reviews/received` | A tela usa a popularidade agregada |
| `POST /api/scorecard/calculate`, `GET /api/scorecard/recommendations`, `GET /api/scorecard/{startupId}/explanation` | A descoberta (`/api/discovery`) já calcula e explica |
| `GET /api/scorecard/recommendations/investors` (do `main`) | Idem; a lista da startup é `/api/discovery/investors` (mesma regra de acesso, D061) |
| `POST /api/matches/interest`, `GET /api/matches`, `GET /api/matches/saved` (do `main`) | O front usa `/api/interests` e `/api/saved`; as duas interfaces gravam e leem em `match_interests` (D058) |
| `GET /api/profile/startup/{id}`, `GET /api/profile/investor/{id}` (do `main`) | O perfil no front vem de `/api/discovery/{startups,investors}/{userId}`, com score; mesmas regras de campos públicos (D060) |
| `GET /api/profile/startup/dashboard` (do `main`) | A Visão geral monta os números com `/api/profile/me/popularity`, `/api/interests/matches` e `/api/meetings`; o painel do `main` usa as mesmas fontes (D060) |
| `GET /api/admin/policies/current`, `POST /api/admin/policies`, `GET/POST /api/admin/policies/{id}/criteria`, `PUT/DELETE /api/admin/criteria/{id}` | Configuração do algoritmo sem tela no admin |
| `POST /api/admin/bootstrap-admin` | Feito por variável de ambiente (D054) |

## URLs chamadas pelo front

Busca final em `src/` por `fetch(`, `axios.`, `new WebSocket`, `EventSource`, `http://` e
`https://`:

- Chamadas HTTP: só o cliente `api` de `services/api.ts`, com `baseURL` = `API_URL`.
- `https://` restantes: placeholders de formulário, mensagens de validação, links de
  navegação (`wa.me`, Google Maps) e Google Fonts no `index.html`. Nenhum é chamada de API.
- `localhost` só aparece no comentário do `api.ts` e, no bundle, dentro do react-router e
  do axios (base para montar `URL`), não como destino.

## Pendências

| # | Pendência | Tamanho | Dono |
| --- | --- | --- | --- |
| P1 | Publicar no App Service: abrir o pull request de `feat/unificacao-main` para o `main`. A reconciliação das migrations está feita e provada (D059) | Pull request | Carol |
| P2 | ~~Mensagem do 401 de login~~: resolvida no merge, "Credenciais inválidas" (D062) | Feito | Carol |
| P3 | Notificações no back (hoje derivadas no front, estado local) | Médio | Squad |
| P4 | Moderação de cadastros (aprovar e rejeitar) e de conteúdo | Médio | Squad |
| P5 | Contato além do e-mail, upload de logo, histórico de métricas, data do interesse recebido | Médio | Squad |
| P6 | URL de produção do front: confirmar se está em `UNIO_CORS_ALLOWED_ORIGINS` | Configuração | Carol |
