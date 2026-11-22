# Estado Atual do Projeto — Scorecard de Matchmaking

Última atualização: 2026-11-22

## Resumo

Backend de matching entre startups e investidores com scorecard explicável,
configurável e versionável. Projeto acadêmico com potencial de virar produto.

## Escopo travado do MVP

- 7 entidades documentadas em D010 + `FeedbackEvent`
- 3 serviços: ScoreCalculatorService, ExplanationService, RecommendationService
- 6 endpoints REST (contrato v2)
- Feedback persistido sem recalibração
- Versionamento simples (version + active) na policy
- `investorId`/`startupId` como UUID (D018)
- Módulo `scorecard` é a ÚNICA implementação de matchmaking (D020)
- PostgreSQL local em dev + Azure em produção

## Documentos do projeto

- `docs/decisoes.md`: decisões de design (D001 a D064)
- `docs/dominio.md` — especificação de domínio
- `docs/contrato/contrato-v2.md` — contrato ativo da API
- `docs/contrato/contrato-onboarding.md`: onboarding e criação de perfil a partir dele
- `docs/contrato/contrato-moderacao.md`: moderação de cadastros e de conteúdo, pitch publicado para o investidor, propriedades e auditoria (D063)
- `docs/contrato/contrato-descoberta.md`: descoberta com score, interesse, match, salvos, rotas do `main` com as mesmas regras (D058 a D062), administrador e configuração do App Service
- `docs/implementacao/plano-tarefas.md` — plano de tarefas
- `docs/planejamento/` — resumos e planejamento de tickets

## Progresso

### Bloco A — Fundação

- [x] Tarefa 0 — Setup do projeto (2026-09-11)
- [x] Tarefa 1 — Especificação de domínio (2026-09-12)
- [x] Tarefa 2 — Modelar entidades persistentes (2026-09-12)
- [x] Tarefa 3 — Camada de repositórios (2026-09-12)
- [x] Tarefa 3.5 — Migrations V2–V6 (2026-09-12)
- [x] Tarefa 3.6 — Migrations V7–V9 + validate (2026-09-12)
- [x] Tarefa 3.7 — Simplificação do register + /error liberado (2026-09-12)

### Bloco B — Policy e seed

- [x] Tarefa 4 — Versionamento de policy (2026-09-12)
- [x] Tarefa 5 — Gestão de critérios por policy (2026-09-12)
- [x] Tarefa 6 — Seed inicial (2026-09-12)

### Bloco C — Cálculo e explicabilidade

- [x] Tarefa 7A — ScoreCalculatorService (2026-09-12)
- [x] Tarefa 7B — ScorePersistenceService (2026-09-12)
- [x] Tarefa 10 — ExplanationService (2026-09-12)

### Bloco D — Recomendação e feedback

- [x] Tarefa 11 — RecommendationService (2026-09-12)
- [x] Tarefa 11.5 — Endpoints de criação de perfil (2026-09-12)
- [x] Tarefa 12 — Endpoints REST do scorecard (2026-09-12)
- [x] Tarefa 13 — Feedback persistido (2026-09-12)

### Tickets pós-MVP (outubro e novembro)

- [x] T01 — Disponibilidade do investidor/mentor (RF02) — 2026-10-14
- [x] T02 — Campo nome na Startup (RF01) — 2026-10-14
- [x] T03 — Disponibilidade na Startup (RF01/RF02) — 2026-10-14
- [x] T06 — Métricas de uso (RF09) — 2026-10-14
- [x] T07 — Log de Auditoria (RNF10) — 2026-10-26
- [x] T08 — Consentimento LGPD (RF11 + RNF03) — 2026-10-26
- [x] T11 — Upload de pitch (RF06) — 2026-10-20
- [x] T09a — Mensagens (RF05) — 2026-10-26
- [x] T09b — Agendamento de reuniões (RF05) — 2026-10-26
- [x] T12 — Avaliação pós-interação (RF10) — 2026-10-26
- [x] T13 — Exclusão e exportação de dados (RNF03) — 2026-10-26
- [x] T16 — Métricas de conversas/reuniões/avaliações (RF09) — 2026-10-26
- [x] T17 — Alertas no Azure (RNF01) — 2026-10-26 (template pronto; aplicar com `infra/azure/deploy-alerts.sh`)
- [x] T18 — Teste de carga e documento (RNF05) — 2026-10-26 (script pronto; preencher resultados)
- [x] T19 — Swagger e README (RNF09) — 2026-10-26
- [x] RF10 popularidade: `GET /api/reviews/summary/{userId}`, `GET /api/profile/me/popularity`, `POST /api/profile-views`, comentário fora das respostas (D040 a D044, hoje `V26__create_profile_views.sql`), 2026-11-16
- [x] Integração do matching, 2026-11-16 (autora: Carol):
  - descoberta com score sob demanda (`/api/discovery`, D045 a D047);
  - dono do par no scorecard (D048);
  - interesse, match mútuo e salvos (`/api/interests`, `/api/saved`, D049, D050);
  - reunião só com match (D051);
  - e-mail só depois do match (D052);
  - métricas novas (D053);
  - primeiro administrador por variável de ambiente (D054);
  - LGPD de interesses e salvos (D055);
  - CORS por variável de ambiente (D056) e políticas padrão do scorecard em qualquer perfil (D057);
  - `updated_at` nos perfis (hoje `V28`).
- [x] T20 — Correção de IDOR e recomendação de investidores (RF03/RF04) — 2026-11-17 (João Carlos, `main`)
- [x] T21 — Dashboard da Startup (RF09) — 2026-11-17 (João Carlos, `main`)
- [x] T22 — Detalhes de Perfil Público (RF04) — 2026-11-17 (João Carlos, `main`)
- [x] T23 — Persistência de Matches e Salvos (RF03) — 2026-11-17 (João Carlos, `main`)
- [x] JSON padrão nos 401/403 e `JWT_SECRET` obrigatório em produção — 2026-11 (João Carlos, `main`)
- [x] Unificação com o `main`, 2026-11-21 (autora: Carol):
  - interesse e match numa fonte só, `match_interests`; rotas `/api/matches` e `/api/interests` sobre a mesma regra (D058);
  - migrations da Carol renumeradas para V24 a V28 e `V29__unifica_interesses_em_match_interests.sql` (D059);
  - perfis públicos e painel da startup do `main` com as regras da descoberta (D060);
  - uma regra só de acesso às recomendações do scorecard (D061);
  - login inválido com "Credenciais inválidas" (D062).
- [x] Moderação e pitch publicado, 2026-11-22 (autora: Carol, branch `feat/moderacao-e-pitch`):
  - moderação de cadastros pelo ADMIN (aprovar, recusar, suspender, reativar), login 403 e conta fora da descoberta (RF08);
  - moderação de conteúdo do pitch e do Lean Canvas (aprovar, remover com motivo) e leitura pelo investidor em `GET /api/discovery/startups/{userId}/pitch` (RF06, RF08);
  - toda ação no log de auditoria existente (RNF10);
  - `V30__cria_moderacao_de_contas_e_pitch.sql`, duas propriedades com variável de ambiente e quatro ganchos mínimos no código existente (D063);
  - exportação de dados com a moderação e os envios do pitch do titular, e exclusão que apaga os dois (RNF03, D064).

### Bloco E — Testes

- [x] Tarefa 14 — Testes unitários (comunicação, reuniões, avaliação, LGPD, métricas) — 2026-10-26
- [x] Tarefa 15 — Testes de integração (fluxo RF05/RF10, LGPD, segurança) — 2026-10-26
- [x] Tarefa 16 — Hardening (method security, 401, filtro JWT, erro padrão) — 2026-10-26
- [x] Testes da unificação com o `main` (`UnificacaoMainIntegrationTest`) — 2026-11-21
- [x] Testes da moderação e do pitch publicado (`ModeracaoContasIntegrationTest`, `PitchPublicacaoIntegrationTest`, `ModeracaoConfiguracaoInvertidaIntegrationTest`, `ModeracaoUnitTest`, `PitchConteudoTest`, `ExportacaoModeracaoIntegrationTest`) — 2026-11-22
- [ ] Beta testers (parte de RNF07) — pendente

### Infraestrutura

- [x] Migração H2 → PostgreSQL em dev (2026-09-12)
- [x] Actuator + health check funcionando
- [x] /error liberado em dev
- [x] Deploy Azure (backend + PostgreSQL)
- [x] Workflow do GitHub Actions publicando o JAR no App Service (`.github/workflows/main_unio-webapp.yml`, `main`)
- [x] CORS configurado
- [x] Frontend React integrado
- [x] Banco de dados Azure liberado para equipe de IA (usuário somente leitura)
- [x] .gitignore configurado para ignorar uploads/

### Frontend

- [x] Integração com backend (Antigravity) — 2026-09-12
- [x] Login/registro funcionando
- [x] Perfil funcionando (startup + investidor)
- [x] Calculadora de Match funcionando (score 92.50 exibido)
- [x] Recomendações funcionando
- [x] CORS resolvido
- [x] Front sem dados de exemplo, todo pela API (ADR-011 e ADR-012 do front)

## Requisitos atendidos (RF/RNF)

### RF

- [x] RF01 — Cadastro de startups (nome adicionado no T02)
- [x] RF02 — Cadastro de investidores (T01 adicionou disponibilidade)
- [x] RF03 — Matchmaking (persistência de interesses e matches no T23; uma fonte só na D058)
- [x] RF04: Visualização de perfis compatíveis (`/api/discovery`, D045 e D046; perfis públicos T22 com as regras da descoberta, D060)
- [x] RF05 — Comunicação (mensagens + reuniões) — T09a/T09b; reuniões com até 3 horários, contraproposta, remarcação, formato e local (D032 a D039, hoje V25)
- [x] RF06 — Pitch/Canvas (T11 adicionou upload; pitch e Lean Canvas publicados para o investidor, com moderação, D063)
- [x] RF07 — Autenticação e roles
- [x] RF08 — Moderação de cadastros e de conteúdo (D063)
- [x] RF09 — Métricas de uso (painel da startup T21, D060)
- [x] RF10: Feedback pós-interação (T12); resumo público só com agregados e mínimo de 3 avaliações, popularidade própria, visitas ao perfil e comentário oculto (D040 a D044, hoje V26)
- [x] RF11 — Consentimento LGPD

### RNF

- [x] RNF01 — Disponibilidade (Azure)
- [x] RNF04 — Interface intuitiva
- [x] RNF05 — Escalabilidade
- [x] RNF06 — Padrões corporativos
- [x] RNF09 — Código modular
- [x] RNF10 — Log de auditoria (T07; ações de moderação, D063)
- [ ] RNF02 — Criptografia em repouso
- [x] RNF03 — LGPD (consentimento T08 + exportação/exclusão T13; moderação e pitch no export e na exclusão, D064)
- [ ] RNF07 — Testes + beta testers (testes automatizados feitos; falta beta)
- [ ] RNF08 — Responsividade mobile

## Padrões do projeto (para próximos tickets)

- Package by feature
- Migrations via Flyway (nunca ddl-auto); nunca alterar nem renumerar uma migration que já está no `main` (D059)
- Bean Validation nos DTOs de create (campos numéricos opcionais usam só `@Positive`, ver D029)
- Update via Map com validação manual (ver D027)
- Erros: ResponseStatusException com HttpStatus
- Autenticação: JWT com roles STARTUP/INVESTOR/ADMIN
- Testes unitários com Mockito + integração com @SpringBootTest/MockMvc (PostgreSQL do perfil ativo; dá para apontar para um banco descartável com `SPRING_DATASOURCE_URL`)
- Auditoria via AOP com anotação @Auditable, ou `AuditService.log` direto quando a linha precisa do id do alvo e de detalhes (D063)
- Erros no formato do GlobalExceptionHandler (message + errors[].defaultMessage); 401/403 do Spring Security no mesmo formato (`ApiErrorFactory`)
- @PreAuthorize é aplicado (@EnableMethodSecurity) — ver D030
- Um conceito, uma implementação: rotas novas delegam à regra que já existe (D058 a D061)

## Branch atual

- `feat/moderacao-e-pitch` (a partir do `main` com o #14): moderação de cadastros e de conteúdo, pitch publicado e auditoria (D063; ADR-013 do front). Só commits locais; falta o pull request.
- `feat/unificacao-main` (a partir de `feat/producao-sem-mocks` + merge do `origin/main`): unificação descrita em D058 a D062 e na ADR-012 do front. Pronta para pull request no `main`.
- `feat/producao-sem-mocks` (a partir de `feat/integracao-matching`): CORS por variável de ambiente (D056), políticas padrão do scorecard fora do perfil dev (D057) e front sem mocks (ADR-011 do front). Auditoria front x back em `UNIO-front/docs/integracao/auditoria-front-back.md`.
- `feat/integracao-matching` (a partir de `feat/avaliacao-popularidade`): descoberta, interesse, match, salvos, reunião só com match e administrador (D045 a D055; ADR-008 a ADR-010 do front)

## Próximo passo

- Abrir o pull request de `feat/moderacao-e-pitch` para o `main`; ao publicar, o Flyway da nuvem aplica a V30 (D063). Avisar a equipe do número antes do merge
- No App Service, só se quiser mudar os padrões: `UNIO_MODERATION_CADASTRO_REQUER_APROVACAO` (padrão false) e `UNIO_MODERATION_PITCH_REQUER_APROVACAO` (padrão true)
- Abrir o pull request de `feat/unificacao-main` para o `main`; ao publicar, o Flyway da nuvem aplica V24 a V29 (D059)
- No App Service: `JWT_SECRET` (obrigatório em produção), `UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD` (D054) e, se o front tiver outro endereço, `UNIO_CORS_ALLOWED_ORIGINS` (D056); reiniciar depois
- Remover `user_interests` (sem uso desde a V29) numa decisão própria, depois de conferir que está vazia na nuvem
- Popularidade no ranking do back, se o produto quiser (hoje só ordena no front, D042)
- Acesso da moderação (ADMIN) aos comentários das avaliações e prazo de retenção (D043)
- Texto de consentimento LGPD: avisar que comentários de avaliação são coletados e não exibidos (D043)
- Notificações de reunião (hoje o front deriva por polling, ADR-005 do front)
- Aplicar os alertas no Azure e rodar o teste de carga; preencher `docs/testes/teste-de-carga.md`
- RNF07: rodada com beta testers
- Escala da descoberta: recálculo assíncrono ao salvar o perfil e paginação no banco (D045)
- Texto LGPD: o e-mail é compartilhado com quem der match (D052); telefone e WhatsApp opcionais
- Revogar na hora o token de conta suspensa ou recusada (hoje vale até expirar, D063)

## Fora do MVP (trabalho futuro)

Ver D011, D025, D027 e as pendências da D028, D030, D035, D042, D043, D045, D046 e D052 em `docs/decisoes.md`, e a seção "Fora de escopo desta entrega" depois da D064.
