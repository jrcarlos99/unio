# Estado Atual do Projeto — Scorecard de Matchmaking

Última atualização: 2026-09-12

## Resumo

Backend de matching entre startups e investidores com scorecard explicável,
configurável e versionável. Projeto acadêmico com potencial de virar produto.

## Escopo travado do MVP

- 7 entidades documentadas em D010 + `FeedbackEvent` (ver nota em
  `docs/dominio.md` seção 0 — pendente decidir se vira D019 fixando 8
  entidades ou se mantém a contagem original)
- 3 serviços: ScoreCalculatorService, ExplanationService, RecommendationService
- 6 endpoints REST (contrato v2)
- Feedback persistido sem recalibração
- Versionamento simples (version + active) na policy
- `investorId`/`startupId` como UUID em todas as entidades que referenciam
  (D018)
- Módulo `scorecard` é a ÚNICA implementação de matchmaking do projeto —
  o protótipo anterior (`matching`, conceito swipe/Tinder) foi removido
  por completo (D020)
- PostgreSQL local em dev (migração H2 → PostgreSQL concluída em 2026-09-12)

## Documentos do projeto

- `docs/decisoes.md` — decisões de design (D001–D025)
- `docs/dominio.md` — especificação de domínio (Tarefa 1, ver pendências abaixo)
- `docs/contrato/contrato-v2.md` — contrato ativo da API
- `docs/implementacao/plano-tarefas.md` — 17 tarefas (Tarefa 0 a Tarefa 16)

## Progresso

- [x] Contrato v2 aprovado
- [x] Setup definido

### Bloco A — Fundação
- [x] Tarefa 0 — Setup do projeto (concluída em 2026-09-11)
- [x] Tarefa 1 — Especificação de domínio (`docs/dominio.md` criado em
  2026-09-12; enums, entidades e invariantes documentados — ver
  pendências abaixo antes de considerar 100% fechada)
- [x] Tarefa 2 — Modelar entidades persistentes (concluída em 2026-09-12
  via Copilot; 5 entidades + 6 enums gerados, sem lógica de negócio —
  **revisada campo a campo contra `docs/dominio.md` em 2026-09-12,
  sem divergências**)
- [x] Tarefa 3 — Criar camada de repositórios e contratos de acesso
  (concluída em 2026-09-12 via Copilot; 5 interfaces Spring Data JPA
  geradas exatamente conforme prompt — revisadas contra D002, D006,
  D008, sem divergências)
- [x] Tarefa 3.5 — Migrations e schema do banco (aplicada em 2026-09-12
  via Copilot; V2–V6 criadas, revisadas contra as 5 entidades e D002/
  D006/D008 — sem divergências. `mvn test` confirmado com **build
  success, 0 failures, 0 erros, 0 skipped** após remoção do módulo
  `matching` legado — ver D020)
- [x] Tarefa 3.6 — Migrations do backend original (V7–V9) + `validate` em dev
  — concluída em 2026-09-12
- [x] Tarefa 3.7 — Simplificação do register (só User); /error liberado
  — concluída em 2026-09-12

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
- [x] Tarefa 13 — Feedback persistido (coberto pela Tarefa 12)

### Bloco E — Testes
- [ ] Tarefa 14 — Testes unitários (próxima)
- [ ] Tarefa 15 — Testes de integração
- [ ] Tarefa 16 — Hardening

### Infraestrutura
- [x] Migração H2 → PostgreSQL em dev (2026-09-12)
- [x] Actuator + health check funcionando
- [x] /error liberado em dev

### Validado via curl
- [x] POST /api/auth/register → 200 com JWT
- [x] POST /api/auth/login → 200 com JWT
- [x] POST /api/profile/startup → 201 Created
- [x] POST /api/profile/investor → 201 Created
- [x] POST /api/admin/policies → 201 Created
- [x] POST /api/scorecard/calculate → 201, score 92.50, EXCELENTE
- [x] GET /api/scorecard/{startupId}/explanation → 200
- [x] GET /api/scorecard/recommendations → 200
- [x] POST /api/scorecard/feedback → 201 Created

## Arquivos gerados na Tarefa 2

- `scorecard/common/InvestorProfileType.java`
- `scorecard/common/ScoreDimension.java`
- `scorecard/common/CriticalityLevel.java`
- `scorecard/common/MatchScoreFactorType.java`
- `scorecard/common/FeedbackAction.java`
- `scorecard/common/MatchScoreClassification.java`
- `scorecard/policy/ScorePolicy.java`
- `scorecard/policy/ScoreCriterion.java`
- `scorecard/calculation/MatchScore.java`
- `scorecard/explanation/MatchScoreFactor.java`
- `scorecard/feedback/FeedbackEvent.java`

Pontos-chave aplicados (conforme relatado pelo Copilot):
- `MatchScore` com `@Table(uniqueConstraints = ...)` para
  `(investor_id, startup_id, score_policy_id)`
- `MatchScore.classification` usa `MatchScoreClassification`
- `MatchScoreFactor.dimension` usa `ScoreDimension`
- `FeedbackEvent` sem relação com `MatchScore`; apenas `investorId`,
  `startupId` e referência à `ScorePolicy`
- Nenhum campo de peso de dimensão foi persistido
- `ScorePolicy.version` e `ScorePolicy.active` como colunas simples

## Achado importante — módulo `matching` legado (2026-09-12)

Durante a validação da Tarefa 3.5, o `mvn test` falhou com
`BeanDefinitionOverrideException` por colisão de nome entre
`scorecard.calculation.MatchScoreRepository` (atual) e um
`matching.repository.MatchScoreRepository` pré-existente. Investigação
revelou um pacote inteiro `br.com.unio.matchmaking_backend.matching`
(controller, dto, repository, entity, service) — protótipo de uma
concepção anterior do matchmaking (estilo swipe/Tinder), criado em
conversa anterior, anterior à decisão de migrar para o modelo de
scorecard explicável (decisão tomada com o DeepSeek e não documentada
formalmente até este ponto).

**Ação tomada:** módulo `matching` removido por completo via `git rm -r`.
Também foi encontrado um pacote vazio (`br.com.unio.matchmaking.scorecard`,
sem `_backend`, sem nenhum arquivo `.java` dentro) — removido por ser
resíduo sem conteúdo.

**Resultado:** `mvn test` → build success, 0 failures, 0 erros, 0 skipped.

Ver D020 em `docs/decisoes.md`.

## Pendências abertas

- [x] Revisar o código gerado das 5 entidades/6 enums contra `docs/dominio.md`
  campo a campo — feito em 2026-09-12, sem divergências
- [x] Validar/travar os valores dos 6 enums — confirmados idênticos ao
  código, todos 🟢 DECIDIDO
- [ ] Confirmar regra exata de como `CriticalityLevel.CRITICAL` afeta
  `MatchScoreClassification` (necessário até a Tarefa 8, não bloqueia
  repositórios/migrations)
- [ ] Decidir se `FeedbackEvent` formaliza a contagem para "8 entidades"
  (D020 se sim)
- [ ] Inconsistência entre /calculate (92.50) e /explanation (REGIAO: 0).
  Hipótese: ExplanationService não persiste todos os fatores, só top 3
  + top 3. Ver D026 (a registrar).

## Próximo passo

Bloco E — Testes (Tarefa 14, 15, 16). Opcionalmente, iniciar frontend
(Antigravity) para visualização.

## Fora do MVP (trabalho futuro)

Ver D011 e D025 em `docs/decisoes.md`.