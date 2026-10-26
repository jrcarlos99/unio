# Estado Atual do Projeto — Scorecard de Matchmaking

Última atualização: 2026-10-26

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

- `docs/decisoes.md` — decisões de design (D001–D027)
- `docs/dominio.md` — especificação de domínio
- `docs/contrato/contrato-v2.md` — contrato ativo da API
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

### Tickets pós-MVP (outubro)
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

### Bloco E — Testes
- [x] Tarefa 14 — Testes unitários (comunicação, reuniões, avaliação, LGPD, métricas) — 2026-10-26
- [x] Tarefa 15 — Testes de integração (fluxo RF05/RF10, LGPD, segurança) — 2026-10-26
- [x] Tarefa 16 — Hardening (method security, 401, filtro JWT, erro padrão) — 2026-10-26
- [ ] Beta testers (parte de RNF07) — pendente

### Infraestrutura
- [x] Migração H2 → PostgreSQL em dev (2026-09-12)
- [x] Actuator + health check funcionando
- [x] /error liberado em dev
- [x] Deploy Azure (backend + PostgreSQL)
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

## Requisitos atendidos (RF/RNF)

### RF
- [x] RF01 — Cadastro de startups (nome adicionado no T02)
- [x] RF02 — Cadastro de investidores (T01 adicionou disponibilidade)
- [x] RF03 — Matchmaking
- [x] RF06 — Pitch/Canvas (T11 adicionou upload)
- [x] RF07 — Autenticação e roles
- [x] RF09 — Métricas de uso
- [ ] RF04 — Visualização de perfis compatíveis
- [x] RF05 — Comunicação (mensagens + reuniões) — T09a/T09b
- [x] RF08 — Moderação de cadastros
- [x] RF10 — Feedback pós-interação — T12
- [x] RF11 — Consentimento LGPD

### RNF
- [x] RNF01 — Disponibilidade (Azure)
- [x] RNF04 — Interface intuitiva
- [x] RNF05 — Escalabilidade
- [x] RNF06 — Padrões corporativos
- [x] RNF09 — Código modular
- [x] RNF10 — Log de auditoria (T07)
- [ ] RNF02 — Criptografia em repouso
- [x] RNF03 — LGPD (consentimento T08 + exportação/exclusão T13)
- [ ] RNF07 — Testes + beta testers (testes automatizados feitos; falta beta)
- [ ] RNF08 — Responsividade mobile

## Padrões do projeto (para próximos tickets)

- Package by feature
- Migrations via Flyway (nunca ddl-auto)
- Bean Validation nos DTOs de create
- Update via Map com validação manual (ver D027)
- Erros: ResponseStatusException com HttpStatus
- Autenticação: JWT com roles STARTUP/INVESTOR/ADMIN
- Testes unitários com Mockito + integração com @SpringBootTest/MockMvc (PostgreSQL local)
- Auditoria via AOP com anotação @Auditable
- Erros no formato do GlobalExceptionHandler (message + errors[].defaultMessage)
- @PreAuthorize é aplicado (@EnableMethodSecurity) — ver D030

## Branch atual

- `main`

## Próximo passo

- Front: integrar mensagens, reuniões, avaliação e LGPD (`docs/contrato/contrato-comunicacao.md`)
- Aplicar os alertas no Azure e rodar o teste de carga; preencher `docs/testes/teste-de-carga.md`
- Definir `JWT_SECRET` no App Service
- RNF07: rodada com beta testers

## Fora do MVP (trabalho futuro)

Ver D011, D025 e D027 em `docs/decisoes.md`.