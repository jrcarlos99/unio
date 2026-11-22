# Decisões de Design — Scorecard de Matchmaking

Documento de registro das decisões tomadas ao longo do projeto.
Cada decisão tem: contexto, alternativas, escolha e justificativa.

---

## D001 — ScoreDimension é enum no MVP, não tabela

**Contexto:** A primeira proposta modelava ScoreDimension como tabela com peso próprio.

**Alternativas:**

- (a) ScoreDimension como tabela com peso persistido
- (b) ScoreDimension como enum, peso derivado dos critérios

**Decisão:** (b)

**Justificativa:** O peso não pertence à dimensão — pertence à policy, via critérios.
Modelar como tabela com peso criaria duas fontes de verdade e impediria pesos
diferentes por InvestorProfileType sem duplicar dimensões.

**Impacto:** Peso da dimensão = soma dos pesos dos critérios ativos daquela dimensão
dentro da policy ativa. Campo `weight` no payload é sempre calculado, nunca persistido.

---

## D002 — FeedbackEvent não tem FK para MatchScore

**Contexto:** A primeira proposta relacionava FeedbackEvent a MatchScore.

**Alternativas:**

- (a) FeedbackEvent com FK para MatchScore
- (b) FeedbackEvent referenciando investorId + startupId + scorePolicyId

**Decisão:** (b)

**Justificativa:** Se o score for recalculado, o feedback histórico não pode se perder.
Feedback é sobre a decisão do investidor, não sobre uma linha específica de score.

**Impacto:** FeedbackEvent referencia: investorId, startupId, scorePolicyId.

---

## D003 — MatchScoreFactor tem campo `dimension`

**Contexto:** A primeira proposta não incluía `dimension` em MatchScoreFactor.

**Alternativas:**

- (a) MatchScoreFactor sem `dimension`
- (b) MatchScoreFactor com `dimension`

**Decisão:** (b)

**Justificativa:** Sem isso não é possível montar o breakdown por dimensão,
que é requisito explícito da regra de negócio (breakdown + top 3 + next step).

**Impacto:** MatchScoreFactor passa a ter o campo `dimension` (enum ScoreDimension).

---

## D004 — Peso da dimensão é derivado, não persistido

**Contexto:** Havia ambiguidade sobre como o peso da dimensão era calculado.

**Alternativas:**

- (a) Peso da dimensão = soma dos pesos dos critérios ativos
- (b) Peso da dimensão = campo explícito na policy
- (c) Peso da dimensão = fixo por enum

**Decisão:** (a)

**Justificativa:** Menos campos, menos bugs, coerente com "peso configurável por
critério". O peso da dimensão vira consequência, não causa.

**Impacto:** O peso da dimensão é sempre calculado no momento da leitura/uso,
nunca persistido em tabela.

---

## D005 — Padronização de factors e top factors entre endpoints

**Contexto:** Havia inconsistência entre os endpoints sobre onde os fatores
apareciam (dentro de dimensão, no nível raiz, ou ambos).

**Decisão:**

- `dimensions[].factors[]` sempre presentes em explanation e calculate
- `dimensions[].factors[]` opcional em recommendations (payload)
- `topPositiveFactors[]` e `topAttentionFactors[]` sempre no nível raiz

**Justificativa:** Evitar inconsistência de contrato entre endpoints.

**Impacto:** Recommendations pode ter payload reduzido, mas sempre com top factors
no nível raiz. Explanation e Calculate têm estrutura completa.

---

## D006 — POST /calculate sempre recalcula e atualiza

**Contexto:** Não estava definido o que acontecia se já existisse MatchScore
para o par (startup, investor, policy).

**Decisão:**

- Sempre recalcula e atualiza o MatchScore existente para (startup, investor, policy)
- 201 Created se criou; 200 OK se atualizou
- Campo `recalculated: boolean` no response
- Sem versionamento de MatchScore no MVP

**Justificativa:** Simplifica o MVP. Versionamento é Fase 2.

**Impacto:** O MatchScore é sempre o mais recente para o par/policy. Não há
histórico de scores no MVP.

---

## D007 — Desativação de policy em POST /policies

**Contexto:** Não estava explícito o que acontecia com a policy anterior quando
uma nova era criada com `active=true`.

**Decisão:**

- `active=true`: desativa a anterior (active=false) e ativa a nova
- `active=false`: cria inativa, sem mexer na ativa
- MatchScores antigos permanecem referenciando a policy antiga

**Justificativa:** Coerente com "uma policy ativa por perfil" e com preservação
de histórico de score.

**Impacto:** Sempre existe no máximo uma policy ativa por InvestorProfileType.

---

## D008 — Deduplicação de feedback

**Contexto:** Não havia regra clara sobre o que constituía feedback duplicado.

**Decisão:**

- Duplicata = mesmo investorId + startupId + scorePolicyId + action
  nos últimos 5 minutos
- Fora da janela, sempre registra (pode ser mudança de decisão)
- Código de erro: FEEDBACK_DUPLICATE (409)

**Justificativa:** Evita duplo-clique acidental sem bloquear mudança real de decisão.

**Impacto:** Janela de 5 minutos é configurável mas fixa no MVP.

---

## D009 — Códigos de erro estruturados

**Contexto:** Erros de negócio estavam sendo citados como texto livre, sem
padronização para consumo programático pelo cliente.

**Decisão:** Tabela global de códigos:

- CRITICAL_CRITERION_VIOLATED (422)
- POLICY_INACTIVE (422)
- STARTUP_BLACKLISTED (403)
- REQUIRED_DATA_MISSING (422)
- SCORE_NOT_CALCULATED (404)
- FEEDBACK_DUPLICATE (409)
- POLICY_ALREADY_ACTIVE (409)
- INVALID_INPUT (400)
- POLICY_NOT_FOUND (404)
- STARTUP_NOT_FOUND (404)
- INVESTOR_NOT_FOUND (404)

**Justificativa:** Cliente precisa consumir erros programaticamente, não por string.

**Impacto:** Todos os endpoints do MVP retornam erros seguindo esse formato.

---

## D010 — Escopo do MVP travado

**Contexto:** O escopo inicial estava ambicioso demais para um projeto acadêmico
com prazo definido.

**Decisão:**

- 7 entidades: InvestorProfileType, ScoreDimension (enum), CriticalityLevel (enum),
  ScorePolicy, ScoreCriterion, MatchScore, MatchScoreFactor
- 3 serviços: ScoreCalculatorService, ExplanationService, RecommendationService
- 6 endpoints REST
- Feedback persistido sem recalibração
- Versionamento simples (version + active) na policy

**Justificativa:** Projeto acadêmico com potencial de produto. MVP enxuto, mas
cobrindo a regra de negócio. Extensões ficam documentadas como trabalho futuro.

**Impacto:** Itens fora do MVP estão em D011.

---

## D011 — Trabalho futuro (fora do MVP)

**Contexto:** Várias capacidades foram identificadas como desejáveis, mas não
cabem no MVP acadêmico.

**Decisão:** Documentar como trabalho futuro:

- Versionamento com rollback de policy
- Overrides por setor/estágio
- Blacklist/whitelist compostos
- Recalibração em batch por feedback
- MatchScoreCriterionEvaluation (auditoria por critério)
- Dashboard analítico
- Auditoria de política
- Score temporal e histórico

**Justificativa:** Mantém o MVP executável em prazo acadêmico sem perder a visão
de produto. Vira seção de "limitações e trabalhos futuros" no TCC/artigo.

**Impacto:** Nenhum código do MVP depende desses itens.

---

## D012 — Banco: H2 em dev + Testcontainers PostgreSQL em testes + PostgreSQL em prod

**Contexto:** Havia dúvida entre paridade total (PostgreSQL em tudo) e
leveza no desenvolvimento (H2).

**Alternativas:**

- (a) PostgreSQL em dev, testes e prod
- (b) H2 em dev + Testcontainers PostgreSQL em testes + PostgreSQL em prod

**Decisão:** (b)

**Justificativa:** MVP acadêmico precisa de baixo atrito no dia a dia,
mas os testes de integração devem ser fiéis ao banco real de produção.

**Impacto:** Dev local não depende de Docker; testes de integração usam
PostgreSQL real via Testcontainers; prod usa PostgreSQL.

---

## D013 — Stack: Java + Spring Boot

**Contexto:** Havia dúvida entre Java e Kotlin como linguagem do módulo,
dado que o backend atual (auth-and-profile-access-layer) já existe.

**Decisão:** Java + Spring Boot, integrado ao backend existente.

**Justificativa:** Alinhamento total com o que já existe; reduz risco
e custo de setup. Kotlin traria concisão, mas mistura de linguagens
aumentaria custo de manutenção em projeto acadêmico.

**Impacto:** Módulo scorecard é um novo pacote dentro do projeto Java existente,
não um projeto separado.

---

## D014 — Build tool: Maven

**Contexto:** Havia dúvida entre Maven e Gradle para o build do módulo.

**Decisão:** Maven.

**Justificativa:** Padrão mais comum em projetos Spring corporativos/acadêmicos;
previsível em CI; consistente com o que já existe no backend atual.

**Impacto:** `pom.xml` na raiz; dependências do módulo adicionadas ao build existente.

---

## D015 — Estrutura de pacotes: híbrido feature-first + core compartilhado

**Contexto:** Havia dúvida entre feature-first puro e híbrido com core compartilhado.

**Decisão:** feature-first (scorecard.policy, scorecard.calculation,
scorecard.explanation, scorecard.recommendation, scorecard.feedback)

- core mínimo compartilhado (scorecard.common, scorecard.api).

**Justificativa:** Preserva "package by feature" e evita duplicação
em tipos transversais (enums, erros, utilitários).

**Impacto:** Tipos transversais ficam em `scorecard.common`; contratos de API
em `scorecard.api`; casos de uso ficam em pacotes por feature.

---

## D016 — Migrations: Flyway

**Contexto:** Havia dúvida entre Flyway, Liquibase e migrations manuais.

**Decisão:** Flyway.

**Justificativa:** Simples, robusto, ótimo para versionamento SQL incremental;
encaixe natural em CI com banco limpo. Liquibase seria overkill para o MVP.

**Impacto:** Migrations em `src/main/resources/db/migration/`;
nomenclatura `V1__descricao.sql`, `V2__descricao.sql`, etc.

## D017 — Actuator: dependência obrigatória

**Contexto:** `/actuator/health` retornava 403 mesmo com `permitAll()`
configurado. Causa raiz: `spring-boot-starter-actuator` não estava no
`pom.xml`. Sem ele, a rota não existe e o Spring Security responde 403
via `/error` protegido.

**Decisão:**

- Adicionar `spring-boot-starter-actuator` ao `pom.xml`.
- Expor `health,info` em `application.properties`.
- Liberar `/actuator/**` na SecurityConfig.

**Impacto:** `/actuator/health` responde 200. Futuras rotas inexistentes
podem retornar 403 se `/error` estiver protegido; considerar liberar
`/error` em dev.

## D018 — investorId e startupId são UUID

**Contexto:** Ao modelar MatchScore, MatchScoreFactor (via FK) e
FeedbackEvent na Tarefa 2, o tipo de investorId/startupId não estava
definido — o backend existente (auth/profile) ainda não tinha isso fixado.

**Alternativas:**

- (a) Long (sequência incremental)
- (b) UUID

**Decisão:** (b)

**Justificativa:** Evita acoplamento a sequência incremental entre módulos
desenvolvidos de forma distribuída (auth/profile vs. scorecard); não expõe
contagem de registros via IDs sequenciais em API pública; suporte nativo
em PostgreSQL/H2/Testcontainers, coerente com D012.

**Impacto:** investorId e startupId são UUID em MatchScore, MatchScoreFactor
(indiretamente, via FK a MatchScore) e FeedbackEvent. Se o módulo de
auth/profile já existente usar Long, será necessário um mapeamento/adapter
na fronteira entre módulos.

## D019 — PK técnica das entidades do scorecard é Long/IDENTITY

**Contexto:** docs/dominio.md deixava o tipo do `id` de cada entidade em
aberto ("UUID / Long"). O Copilot resolveu isso na Tarefa 2 usando Long com
GenerationType.IDENTITY nas 5 entidades, de forma consistente.

**Decisão:** PK técnica (id) = Long/IDENTITY em todas as entidades do
scorecard. Diferente de D018, que trata apenas dos identificadores de
negócio (investorId/startupId, vindos de outro módulo) — esses continuam
UUID.

**Justificativa:** Aceito por consistência já aplicada no código; Long
autoincremental é suficiente para PK interna de tabela própria do módulo,
sem necessidade de coordenação distribuída (diferente do caso de
investorId/startupId, que cruzam módulos).

**Impacto:** Nenhuma migration ainda depende disso além do que já foi
implicitamente decidido pelo código; formalizado para constar no histórico.

## D020 — Remoção do módulo `matching` (protótipo Tinder/swipe)

**Contexto:** O pacote br.com.unio.matchmaking_backend.matching foi criado
em conversa anterior, com o conceito original de matchmaking por swipe
mútuo (estilo Tinder). A decisão de mudar para um modelo de scorecard
explicável (estilo Serasa Score) foi tomada posteriormente, em conversa
com o DeepSeek, e não havia sido registrada nos documentos de decisão
formais (D001–D019) nem comunicada nesta conversa até a colisão de bean
ter exposto o problema na Tarefa 3.5.

**Decisão:** Remover completamente o pacote `matching` (controller, dto,
repository, entity, service). `scorecard` é o substituto direto, não um
módulo complementar.

**Justificativa:** Manter os dois vivos gera colisões recorrentes de nome
(bean `MatchScoreRepository`, entidade `MatchScore` duplicada) e confunde
qualquer pessoa lendo o código sobre qual é o modelo de negócio vigente.

**Impacto:** Erro "BeanDefinitionOverrideException" resolvido. Nenhuma
funcionalidade do MVP scorecard depende de `matching`.

## D021 — Migrations Flyway para tabelas do backend original (auth/profile)

**Contexto:** O backend original (auth/profile) usava `ddl-auto=update`
para criar suas tabelas em dev. Isso não é aceitável em prod e cria
divergência entre ambientes. As migrations V7–V9 formalizam o schema
de `users`, `startup_profiles` e `investor_profiles` via Flyway.

**Decisão:** Adicionar V7, V8, V9 ao Flyway para essas três tabelas.
A partir de agora, o schema do backend original também é gerenciado
por migrations, não mais por `ddl-auto`.

**Justificativa:** Paridade dev/test/prod; permite `ddl-auto=validate`
em todos os profiles.

**Impacto:** `ddl-auto=update` deixa de ser necessário. `validate` passa
a ser o padrão em todos os profiles.

## D022 — register cria apenas User; perfil é endpoint separado

**Contexto:** `AuthService.register()` tentava criar User + Startup/Investor
na mesma chamada. Quando o payload não trazia os campos do perfil, o banco
estourava `NULL not allowed for column "SEGMENTO"` — erro mascarado como
403 porque `/error` estava protegido.

**Decisão:** `register` cria APENAS `User` (email, password, role).
`Startup`/`Investor` serão criados em endpoint separado, quando necessário.

**Justificativa:** Desacopla auth de profile. Reduz validação no register.
Segue o contrato v2 (endpoints separados). Sem over-engineering: cada
endpoint faz uma coisa.

**Impacto:**

- `AuthService.register()` simplificado.
- `RegisterRequest` só com email, password, role.
- Criação de perfil vira endpoint próprio (a implementar quando o MVP precisar).

## D022 — register cria apenas User; perfil é endpoint separado

**Contexto:** `AuthService.register()` tentava criar User + Startup/Investor
na mesma chamada. Quando o payload não trazia os campos do perfil, o banco
estourava `NULL not allowed for column "SEGMENTO"` — erro mascarado como
403 porque `/error` estava protegido.

**Decisão:** `register` cria APENAS `User` (email, password, role).
`Startup`/`Investor` serão criados em endpoint separado, quando necessário.

**Justificativa:** Desacopla auth de profile. Reduz validação no register.
Segue o contrato v2 (endpoints separados). Sem over-engineering.

**Impacto:**

- `AuthService.register()` simplificado.
- `RegisterRequest` só com email, password, role.
- Criação de perfil vira endpoint próprio (a implementar quando o MVP precisar).
- `/error` liberado em dev, expondo erros reais em vez de 403 mascarado.

## D023 — CriticalityLevel com 4 níveis (CRITICAL, HIGH, MEDIUM, LOW)

**Contexto:** A D009 citava `CriticalityLevel` em 3 níveis
(`CRITICAL`, `COMMON`, `OPTIONAL`). Na implementação da Tarefa 2, o enum
foi definido com 4 níveis (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) e essa
mudança não havia sido formalizada no histórico de decisões.

**Decisão:** Adotar oficialmente 4 níveis em `CriticalityLevel`:
`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.

**Justificativa:** Os 4 níveis oferecem maior granularidade para
priorização dos critérios e já refletem o estado atual do código e do
domínio do projeto.

**Impacto:**

- `CriticalityLevel.java` permanece com 4 valores.
- D009 continua válida para a padronização de **códigos de erro**, mas a
  referência aos níveis `COMMON/OPTIONAL` fica substituída por esta decisão.
- O refinamento das regras de cálculo/comportamento por nível fica para a
  Tarefa 8.

## D024 — MatchScoreClassification: 5 faixas em português

**Contexto:** O contrato v2 define 5 faixas de classificação
(EXCELENTE, FORTE, MODERADO, FRACO, SEM_MATCH). O enum implementado
na Tarefa 2 tinha 4 faixas em inglês (HIGH_COMPATIBILITY,
MODERATE_COMPATIBILITY, LOW_COMPATIBILITY, NOT_RECOMMENDED).

**Decisão:** Adotar os 5 valores do contrato v2:
EXCELENTE (85-100), FORTE (70-84), MODERADO (55-69),
FRACO (40-54), SEM_MATCH (0-39).

**Justificativa:** O contrato v2 é a fonte de verdade da API pública.
A regra de negócio original previa 5 faixas. O código ainda está em
dev, sem dados em prod — é o momento certo de alinhar.

**Impacto:**

- MatchScoreClassification.java passa a ter 5 valores.
- ScoreCalculatorService.classify() implementa 5 faixas.
- Nenhuma migration necessária (coluna VARCHAR sem constraint).
- Contrato v2 permanece inalterado (já estava correto).

## D025 — Pendências técnicas do MVP

**Contexto:** Durante as Tarefas 7A/7B, foram identificadas
limitações que não bloqueiam o MVP, mas precisam ser resolvidas
antes de virar produto.

**Pendências:**

1. `MODELO_NEGOCIO_FIT` retorna sempre 50 (neutro). O `Investor`
   não tem campo `modeloNegocio`. Trabalho futuro: adicionar esse
   campo ao perfil do investidor.

2. `ScorePersistenceService.mapToProfileType()` está chumbado em
   `ANGEL_INVESTOR`. O `Investor` não tem campo que mapeie para
   `InvestorProfileType`. Trabalho futuro: adicionar esse campo
   ou passar o tipo como parâmetro do endpoint.

3. `investorId`/`startupId` em `MatchScore` são `UUID`, mas as
   entidades `Startup`/`Investor` usam PK `Long`. A conversão é
   `new UUID(0L, id)`. Trabalho futuro: alinhar tipos entre módulos.

4. `MatchScoreFactor.factorLabel` recebe o `code` do critério, não
   o `label` humano. Trabalho futuro: passar o label.

**Impacto:** Nenhum desses itens bloqueia o cálculo ou a
persistência. O MVP funciona com as limitações documentadas.

## D026 — Persistência completa dos fatores explicáveis

**Contexto:** O `ScorePersistenceService` persistia apenas top 3
positivos + top 3 atenção. Como consequência, dimensões que não
entravam nesses top 3 (mas que tinham sido avaliadas no cálculo)
ficavam sem fator persistido. O `ExplanationService`, ao calcular
o score da dimensão como média dos fatores, retornava 0 para essas
dimensões. Isso gerou inconsistência: `/calculate` retornava 92.50,
mas `/explanation` mostrava soma de 77.50.

**Decisão:** Persistir TODOS os fatores avaliados (não só top 3).
O `ExplanationService` continua limitando a resposta a top 3
positivos + top 3 atenção (conforme contrato v2), mas calcula as
dimensões sobre os dados completos.

**Justificativa:** Coerência entre `/calculate` e `/explanation`.
O banco tem mais linhas, mas o MVP não tem restrição de volume.

**Impacto:**

- MatchScoreFactor pode ter até N fatores por MatchScore (N = número
  de critérios ativos).
- `/explanation` retorna dimensões corretas.
- Nenhuma migration necessária.

**Validado em 2026-09-12:**

- 5 fatores persistidos (era 4)
- REGIAO: 100.00 (era 0.00)
- Soma das dimensões = 92.50 = score final

## D027 — updateCurrentProfile usa Map<String, Object> sem Bean Validation

**Contexto:** O `ProfileService.updateCurrentProfile` recebe
`Map<String, Object>` em vez de DTOs tipados. Validações declarativas
(@Size, @NotNull, @Positive) não são aplicadas no update — só no
create (que usa `InvestorCreateRequest` / `StartupCreateRequest`).
Durante o T01, um valor de `disponibilidadeObservacao` acima de 255
caracteres causava 500 (violação de coluna) em vez de 400.

**Decisão:** Manter o padrão atual no MVP. Adicionar validação manual
nos campos críticos (ex.: `disponibilidadeObservacao` com limite de
255).

**Justificativa:** Refatorar o update para DTOs tipados
(`InvestorUpdateRequest`, `StartupUpdateRequest`) é o caminho
correto, mas está fora do escopo dos tickets atuais.

**Impacto:** Todo novo campo no update precisa de validação manual
até a refatoração. Registrar como trabalho futuro (D011).

**Trabalho futuro:** refatorar `updateCurrentProfile` para aceitar
DTOs tipados por role.

## D028 — Comunicação dentro da plataforma (T09a/T09b) sem exigir match

**Contexto:** RF05 pede mensagens e agendamento de reuniões. O back não tem
uma entidade de "match"/interesse mútuo — hoje o "unio" é controlado no front
(localStorage).

**Decisão:** Conversas e reuniões ligam um usuário `STARTUP` a um `INVESTOR`,
identificados pelo **id do usuário** (`Long`), sem exigir match prévio. O par
startup/investidor tem uma única conversa (`uk_conversations_pair`). ADMIN não
participa. Recurso de outra pessoa responde 404 (não 403) para não revelar ids.
Reuniões têm máquina de estados `PENDENTE → CONFIRMADA → REALIZADA` (ou
`RECUSADA`/`CANCELADA`) e checagem de conflito de agenda.

**Justificativa:** Entrega RF05 sem bloquear em uma modelagem de match que
ainda não existe no back. Quando o match for persistido, basta uma checagem em
`ParticipantService.requireCounterpart`.

**Trabalho futuro:** exigir match; notificações (e-mail/push) de nova mensagem e
convite; tempo real (WebSocket/SSE) em vez de polling.

**Atualização (2026-11-16, Carol):** a parte "sem exigir match" das reuniões foi
substituída pela D051. Conversas não mudaram.


## D029 — Exclusão de conta por anonimização (T13 / LGPD)

**Contexto:** A LGPD (art. 18) garante eliminação dos dados, mas mensagens,
reuniões e avaliações também pertencem ao outro participante, e o log de
auditoria tem base legal própria (segurança/obrigação legal).

**Decisão:** `POST /api/privacy/delete-account` (com senha) **anonimiza** o
usuário em vez de apagar a linha: e-mail vira `removido-{id}@unio.invalid`,
documento é apagado, senha trocada por hash aleatório e `deleted_at` é
preenchido. São apagados perfil, onboarding, pitch, tokens de senha, scores e
feedbacks do scorecard. Conteúdo das mensagens enviadas vira
`[mensagem removida a pedido do titular]`, comentários das avaliações escritas
são apagados (a nota fica para as médias) e reuniões ativas são canceladas. O
consentimento é marcado como revogado e mantido como prova. Registros de
auditoria antigos são mantidos; o evento de exclusão é auditado só com o id.

**Justificativa:** Remove os dados pessoais sem quebrar a integridade
referencial nem o histórico do outro participante.

**Impacto:** Login e tokens antigos deixam de funcionar (o e-mail original não
existe mais). Usuário removido aparece como "Usuário removido".

**Pendente:** definir com o responsável jurídico o prazo de retenção do
`audit_logs` e revisar `docs/lgpd.md`.


## D030 — Method security ativado e 401 para não autenticado (Bloco E)

**Contexto:** O projeto usava `@PreAuthorize` nos controllers, mas não tinha
`@EnableMethodSecurity` — as anotações eram ignoradas (só valiam as regras de
URL do `SecurityConfig`). Requisições sem token recebiam 403 e token
expirado/adulterado gerava 500 no filtro JWT.

**Decisão:** Ativar `@EnableMethodSecurity`; responder 401 (via
`HttpStatusEntryPoint`) quando não há autenticação válida; o filtro JWT trata
`JwtException` e usuário inexistente sem lançar exceção. Criado
`GlobalExceptionHandler` com formato único de erro (`message` +
`errors[].defaultMessage`, que o front já lê).

**Impacto:** `GET /api/scorecard/recommendations` passa a ser realmente restrito
a INVESTOR/ADMIN. O front já trata 401 redirecionando ao login. O teste
`OnboardingControllerTest.semTokenEhBarrado` foi ajustado de 403 para 401.


## D031 — Observabilidade e carga como código (T17/T18)

**Decisão:** Alertas do Azure Monitor versionados em `infra/azure/alerts.bicep`
(aplicados por `infra/azure/deploy-alerts.sh`) e teste de carga em k6
(`load-test/k6/unio-load-test.js`) com os critérios de aceite como
`thresholds`. Documentação em `docs/operacao/alertas-azure.md` e
`docs/testes/teste-de-carga.md`.

**Justificativa:** Reprodutível por qualquer pessoa da equipe e revisável em PR,
em vez de configuração manual no portal.


## D032: Reunião com até 3 horários sugeridos em tabela própria

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** A tela de Reuniões do front (ADR-004 e ADR-005 do front) deixa quem
solicita sugerir até 3 horários, e o convidado escolhe um ao aceitar. A T09b
(`V20__create_meetings.sql`) guardava um horário só (`starts_at`), então o front
precisava negociar os horários fora do back.

**Alternativas:**

- (a) Coluna `suggested_times` em texto ou JSON dentro de `meetings`
- (b) Tabela `meeting_suggested_times` (id, meeting_id, starts_at, position 1 a 3)
- (c) Uma reunião PENDENTE por horário sugerido, apagando as outras no aceite

**Decisão:** (b). `UNIQUE (meeting_id, position)` e `CHECK (position BETWEEN 1 AND 3)`.
Os horários ficam em ordem cronológica: a posição 1 é o mais cedo e é ele que fica
em `starts_at`/`ends_at` enquanto a reunião está PENDENTE. Validação no
`MeetingService`: de 1 a 3 horários, todos no futuro, sem repetidos (comparados até
o segundo). `POST /{id}/accept` recebe o corpo opcional `{ "startsAt" }`: com mais
de um horário ele é obrigatório e precisa ser um dos sugeridos (senão **400**); com
um horário só, o corpo pode faltar. Ao confirmar, `starts_at` e `ends_at` passam a
ser os do horário escolhido. As reuniões existentes ganham, na migration, uma linha
com o `starts_at` atual.

**Justificativa:** (a) não tem integridade nem ordem garantidas pelo banco e
complica as consultas de intervalo. (c) espalha uma mesma conversa em várias linhas
e quebra o histórico, as avaliações (T12) e as métricas (T16), que contam reuniões.
(b) mantém `starts_at` com o significado de sempre, então conflito, conclusão,
avaliação e exportação LGPD continuam funcionando sem mudança.

**Impacto:**

- Migration `V24__meetings_proposals.sql` (tabela nova e carga das reuniões antigas).
- `entity/MeetingSuggestedTime.java` (novo), `entity/Meeting.java` (lista
  `suggestedTimes` com `@OrderBy` e `replaceSuggestedTimes`, que reaproveita as
  linhas por posição para não violar a UNIQUE), `dto/MeetingAcceptRequest.java`
  (novo), `dto/MeetingCreateRequest.java`, `service/MeetingService.java`,
  `controller/MeetingController.java`.
- `MeetingResponse.suggestedTimes` traz a lista ordenada.
- Testes: `MeetingServiceTest` (1 e 3 horários, 4 horários dá 400, repetidos,
  aceite com horário válido e inválido, aceite sem corpo com 1 e com 3 horários) e
  `MeetingProposalsIntegrationTest`.


## D033: Proposta vigente, contraproposta e remarcação

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** Na T09b só o convidado (`invitee`) aceitava ou recusava, e não havia
como devolver a proposta com outros horários. O front tem "Propor outros horários"
numa solicitação recebida e "Remarcar" numa confirmada.

**Alternativas:**

- (a) Criar uma reunião nova a cada contraproposta, recusando a anterior
- (b) Guardar quem fez a proposta vigente (`proposer_user_id`) e trocar os horários
  na mesma reunião

**Decisão:** (b). Coluna `proposer_user_id` (FK para `users`, NOT NULL; as linhas
existentes recebem o `organizer_user_id`). Novo `POST /api/meetings/{id}/counter-proposal`
com `{ "suggestedTimes": [1 a 3], "message"?: string }`:

- PENDENTE: só quem **não** é o proposer vigente (o proposer recebe **403**);
- CONFIRMADA: qualquer participante (é a remarcação);
- outros status: **409**.

O efeito é o mesmo nos dois casos: os horários sugeridos são substituídos, o
proposer passa a ser quem chamou, o status volta para PENDENTE e `starts_at`/`ends_at`
refletem o primeiro horário novo (a duração é mantida). A `message`, quando vem,
substitui a anterior. `accept` e `decline` passam a validar contra o proposer: quem
responde é sempre o outro participante (**403** para o proposer). O organizador
continua sendo quem criou a reunião e só ele edita link e local (D036). Na
contraproposta vale a mesma regra de conflito da criação (D034): **409** só se todos
os horários novos conflitarem, sem contar a própria reunião.

**Justificativa:** (a) multiplica reuniões para uma única negociação, perde o
vínculo com avaliações e confunde as métricas. Com (b), a mesma reunião vai e volta
entre os dois até alguém aceitar, recusar ou cancelar, e a regra "responde quem não
propôs" vale igual para startup e investidor.

**Impacto:**

- Migration `V24__meetings_proposals.sql` (coluna `proposer_user_id`).
- `entity/Meeting.java` (`proposer`, `isProposer`, `isResponder`),
  `entity/MeetingStatus.java` (diagrama e `isActive()`),
  `dto/MeetingCounterProposalRequest.java` (novo), `service/MeetingService.java`
  (`counterPropose`, `requireResponder`), `controller/MeetingController.java`.
- `MeetingResponse.proposedByMe` diz se quem consulta fez a proposta vigente.
- A mensagem de erro do accept/decline mudou de "Apenas o convidado pode responder
  ao convite" para "Apenas quem recebeu a proposta pode responder" (o status 403 é o
  mesmo).
- Testes: contraproposta pelo convidado e pelo organizador, remarcação de uma
  CONFIRMADA voltando para PENDENTE, contraproposta em RECUSADA (409).


## D034: Conflito de agenda só com reuniões confirmadas

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** Na T09b, o `countOverlapping` contava reuniões PENDENTE e CONFIRMADA
e a criação respondia **409** em qualquer sobreposição. Com propostas de vários
horários, uma pendente não reserva nenhum deles: bloquear por ela impediria duas
propostas abertas no mesmo dia. O front só **avisa** do conflito ao montar a
proposta.

**Alternativas:**

- (a) Manter a regra da T09b
- (b) Nunca bloquear e só avisar
- (c) Só reuniões CONFIRMADAS ocupam a agenda; bloquear quando não sobra opção

**Decisão:** (c). Mudança de regra em relação à T09b:

- pendentes não bloqueiam nada;
- criação e contraproposta: **409** só se **todos** os horários sugeridos
  conflitarem com reuniões CONFIRMADAS de qualquer um dos participantes;
- aceite: **409** se o horário escolhido conflitar com uma CONFIRMADA (a própria
  reunião é ignorada).

O `countOverlapping` do `MeetingRepository` continua com a mesma assinatura; o
`MeetingService` passa só `CONFIRMADA` em `statuses`. `MeetingStatus.blocksSchedule()`
passou a ser só CONFIRMADA, e o teste de "pode cancelar" usa o novo
`MeetingStatus.isActive()` (PENDENTE ou CONFIRMADA).

**Justificativa:** (b) deixaria o back aceitar duas reuniões confirmadas no mesmo
horário. (c) mantém a garantia que importa (ninguém tem duas confirmadas
sobrepostas) e deixa a negociação livre, como a tela espera.

**Impacto (testes da T09b):**

- `MeetingServiceTest.scheduleComConflitoDeAgendaDevolve409` continua valendo (o
  único horário conflita com uma confirmada).
- Novos: `scheduleComAlgunsHorariosOcupadosCriaAReuniao`,
  `scheduleComTodosOsHorariosOcupadosDevolve409`, `conflitoContaSoReunioesConfirmadas`,
  `aceitarHorarioQueConflitaComConfirmadaDevolve409`.
- `CommunicationFlowIntegrationTest.reuniaoAceitaRealizadaEAvaliada`: a segunda
  proposta no mesmo horário agora é criada (**201**, antes era 409); o conflito
  aparece ao aceitá-la depois que a primeira foi confirmada (**409**).
- Arquivos: `repository/MeetingRepository.java` (javadoc),
  `entity/MeetingStatus.java`, `service/MeetingService.java`.


## D035: Assunto, mensagem, formato e local da reunião

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** A tela pede assunto (4 opções), mensagem de até 280 caracteres,
formato online ou presencial e, no presencial, local (nome, endereço e
referência). A T09b só tinha `title`, `agenda` e `meeting_url`.

**Alternativas:**

- (a) Colocar assunto, mensagem e local no texto de `agenda`
- (b) Colunas próprias em `meetings`

**Decisão:** (b). Colunas novas, todas opcionais exceto o formato:
`subject VARCHAR(40)`, `message VARCHAR(280)`,
`format VARCHAR(12) NOT NULL DEFAULT 'ONLINE'` com `CHECK (format IN ('ONLINE','PRESENCIAL'))`,
`location_name VARCHAR(150)`, `location_address VARCHAR(255)`,
`location_reference VARCHAR(255)`. Enum `MeetingFormat`. Validações: mensagem até
280; local só quando `format = PRESENCIAL` (senão **400**); `meetingUrl` continua só
`https://`. O `subject` é texto livre de até 40 caracteres (o back não fixa as 4
opções do front).

**Justificativa:** (a) obriga o front a montar e desmontar texto e impede validar
cada campo. Colunas próprias deixam o contrato claro e o Swagger documentado.

**Impacto:**

- Migration `V24__meetings_proposals.sql`.
- `entity/MeetingFormat.java` (novo), `entity/Meeting.java`,
  `dto/MeetingCreateRequest.java`, `dto/MeetingLocationDto.java` (novo),
  `dto/MeetingResponse.java` (`subject`, `message`, `format`,
  `location { name, address, reference }`, nulo quando não há local),
  `service/MeetingService.java`.
- A exportação LGPD (`DataPrivacyService.meetingsData`) ainda não inclui `subject`,
  `message` e local: fica como pendência (fora do escopo desta tarefa).


## D036: PATCH /api/meetings/{id}/details para link e local

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** Quem organiza a reunião pode informar ou trocar o link (online) ou o
local (presencial) depois de criada, inclusive depois de confirmada. A T09b não
tinha como alterar uma reunião.

**Alternativas:**

- (a) `PUT /api/meetings/{id}` com a reunião inteira
- (b) `PATCH /api/meetings/{id}/details` só com link e local

**Decisão:** (b). Corpo `{ "meetingUrl"?: string, "location"?: { name, address, reference } }`.
Só o **organizador** (quem criou; **403** para o outro), com a reunião PENDENTE ou
CONFIRMADA (**409** nos outros status). Campo ausente fica como está; `meetingUrl`
vazio apaga o link; `location` substitui o local inteiro e exige `name`. Mesmas
validações da criação: link só `https://` (**400**), local só em PRESENCIAL (**400**).
Corpo sem nenhum dos dois: **400**.

**Justificativa:** horários e status têm regras próprias (D032 a D034); um PUT
genérico abriria caminho para trocar horário sem passar pela proposta. O PATCH
restrito deixa claro o que o organizador pode mudar sozinho.

**Impacto:** `dto/MeetingDetailsRequest.java` (novo), `dto/MeetingLocationDto.java`,
`service/MeetingService.java` (`updateDetails`), `controller/MeetingController.java`.
Sem migration própria (usa as colunas da D035, `V24__meetings_proposals.sql`).
Testes: `detailsSoPeloOrganizador`, `detailsComLocalEmReuniaoOnlineDevolve400`,
`detailsAtualizaOLocalDaPresencial`, `detailsEmReuniaoCanceladaDevolve409` e o
fluxo do `MeetingProposalsIntegrationTest`.


## D037: GET /api/meetings/counterparts (com quem marcar reunião)

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** O campo "Com quem" do modal de reunião precisa de uma lista de
pessoas reais. O front só tinha os unios do mock; o back não tinha uma listagem de
usuários do outro papel para quem não é ADMIN.

**Alternativas:**

- (a) Reaproveitar `GET /api/scorecard/recommendations` (só INVESTOR/ADMIN, D030)
- (b) Endpoint próprio da comunicação

**Decisão:** (b). `GET /api/meetings/counterparts` (STARTUP e INVESTOR) devolve os
usuários **ativos** (sem `deleted_at`) do papel complementar que **já criaram
perfil**, com:

`{ userId, name, role, subtitle, segment?, stage?, tipoInvestidor?, ticketMin?, ticketMax?, matchScore? }`

- `name`: `ParticipantService.displayName` (nome da startup; para investidor, a
  parte do e-mail antes do `@`, como já acontece em conversas e reuniões).
- `subtitle`: "segmento • estágio" para startup; tipo de perfil (`perfilRisco`) para
  investidor, ou "Investidor" quando vazio.
- `matchScore`: `totalScore` mais recente do scorecard entre os dois, lido do
  `MatchScoreRepository` (só leitura, usando o UUID `new UUID(0, id)` da D018/D025).
  Nulo quando ainda não foi calculado.
- Ordenação: maior `matchScore` primeiro, sem score no fim, depois por nome.

**Não expõe:** e-mail, documento, senha, localização, capital procurado, pitch,
disponibilidade nem qualquer dado de contato. ADMIN recebe **403**.

**Justificativa:** (a) não serve para a startup e devolve o cálculo completo do
score. Um endpoint enxuto mostra só o necessário para escolher com quem marcar.

**Impacto:** `dto/MeetingCounterpartResponse.java` (novo),
`service/MeetingCounterpartService.java` (novo, 3 consultas: perfis, usuários e
scores), `controller/MeetingController.java`. Sem migration. A lista **não** é
filtrada por match (ver D039). Testes: `MeetingCounterpartServiceTest` (ordem,
score mais recente, usuário removido fora, retorno sem e-mail e sem documento,
ADMIN 403) e `MeetingProposalsIntegrationTest.counterpartsSemEmail`.


## D038: Compatibilidade com o contrato da T09b

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** As mudanças das D032 a D036 não podem quebrar quem já usa
`/api/meetings` com o contrato da T09b (testes de integração, exportação LGPD,
avaliações e métricas).

**Decisão:**

- `POST /api/meetings` só com `startsAt` continua valendo e vira uma proposta de 1
  horário. Se vierem `startsAt` e `suggestedTimes`, vale `suggestedTimes`.
- `title` passa a ser opcional quando vier `subject` (o `subject` vira o título);
  sem os dois, **400**.
- `POST /{id}/accept` sem corpo continua valendo quando há um horário só.
- `MeetingResponse` mantém todos os campos e a ordem da T09b; os novos vêm no fim.
- `GET /api/meetings` mantém o filtro `status` e ganha o intervalo opcional
  `?from=&to=` (ISO-8601, `[from, to)`); entram as reuniões com algum horário no
  intervalo (o confirmado ou, numa PENDENTE, um dos sugeridos). `from >= to` dá **400**.
- O record `MeetingCreateRequest` ganhou um construtor com os 6 campos antigos.

**Justificativa:** o front e os testes antigos continuam funcionando sem mudança,
e cada campo novo é opcional.

**Impacto:** `dto/MeetingCreateRequest.java`, `dto/MeetingResponse.java`,
`service/MeetingService.java` (`listMine` com intervalo, `resolveSuggestedTimes`,
`resolveTitle`), `controller/MeetingController.java`, migration
`V24__meetings_proposals.sql` (carga das reuniões existentes). As duas mudanças de
comportamento visíveis são a regra de conflito (D034) e a validação de accept/decline
pelo proposer (D033).


## D039: Match mútuo continua só no front

Autora: Carol
Data: 2026-11-08
Status: Aceita

**Contexto:** A D028 liberou a comunicação sem exigir match porque o back não tem a
entidade de interesse mútuo. O produto quer reuniões só entre quem deu match, e o
front controla os unios no mock (localStorage).

**Alternativas:**

- (a) Criar agora a entidade de match no back e exigir em `requireCounterpart`
- (b) Manter a D028 e registrar a pendência

**Decisão:** (b). Nesta tarefa o back não muda autenticação, scorecard, mensagens,
avaliações nem a regra de match. `GET /api/meetings/counterparts` e
`POST /api/meetings` aceitam qualquer usuário ativo do papel complementar com
perfil. No front, a regra "só com match" continua valendo no modo mock; no modo API
a lista mostra os usuários reais (ADR-005 do front).

**Justificativa:** o match persistido é uma decisão de produto e de modelo que
afeta descoberta, scorecard e comunicação. Ele não cabe numa tarefa de reuniões.

**Pendência para o squad:** persistir o interesse mútuo no back e exigir match em
`ParticipantService.requireCounterpart` (vale para mensagens e reuniões) e em
`MeetingCounterpartService`. Sem arquivos alterados nesta decisão.

**Atualização (2026-11-16, Carol):** substituída pela D049 (interesse e match no back)
e pela D051 (reunião só com match).


## D040: Resumo público de avaliações só com agregados e mínimo de 3

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** O RF10 pede avaliação pós-interação, mas não diz o que fica visível.
Até aqui, `GET /api/reviews/received` devolvia a média e a lista completa (com autor,
nota e comentário) só para o avaliado, e não havia como o outro lado ver a reputação
de ninguém. O front quer mostrar a popularidade em porcentagem no dashboard da
startup, no perfil visto pelo outro lado e nos cards de descoberta.

**Alternativas:**

- (a) Expor a lista de avaliações (nota e autor) para quem consulta o perfil
- (b) Expor só a média, mesmo com 1 avaliação
- (c) Expor só agregados, com um mínimo de avaliações para mostrar a média

**Decisão:** (c). `GET /api/reviews/summary/{userId}` devolve só
`{ userId, totalReviews, averageRating, percentage, visible }`. Com menos de 3
avaliações (`ReviewService.MIN_REVIEWS_VISIBLE`), `averageRating` e `percentage` são
nulos e `visible` é falso. `percentage = round(média / 5 * 100)`, igual ao
`calcularPercentual` do front. Pode consultar o próprio usuário ou um usuário ativo do
papel complementar; qualquer outro caso (mesmo papel, removido, inexistente) responde
404, sem revelar se o id existe.

**Justificativa:** com 1 ou 2 avaliações a média identifica quem avaliou (numa reunião
1 a 1, a outra parte sabe que a nota veio dela) e é estatisticamente frágil. O mínimo
de 3 protege o avaliador e evita que uma nota isolada marque o perfil. Lista de
autores e notas não tem finalidade para quem só quer decidir se marca uma reunião
(LGPD, minimização).

**Impacto:** `review/dto/ReviewSummaryResponse.java` (novo),
`review/service/ReviewService.java` (`summary`, `summaryOf`, `percentageOf`),
`review/repository/InteractionReviewRepository.java` (`countByReviewedId`),
`review/controller/ReviewController.java`,
`communication/service/ParticipantService.java` (`findUser`, `complementary`, só
reaproveitados, sem mudar a regra de `requireCounterpart`). Testes em
`ReviewServiceTest` e `PopularityIntegrationTest`.


## D041: Contagem de visitas ao perfil agregada, uma por visitante por dia

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** O dashboard da startup e a aba Popularidade do investidor mostram
"visitas ao perfil" (total de 28 dias, variação e série semanal). Não havia registro
de visitas no back. Guardar quem visitou quem é dado pessoal e pode revelar interesse
comercial de um investidor por uma startup.

**Alternativas:**

- (a) Contador simples por perfil, sem visitante (não impede inflar com cliques
  repetidos nem permite apagar na exclusão de conta)
- (b) Log de cada abertura, com visitante e horário
- (c) Uma linha por visitante, por perfil, por dia, sem horário; a API só devolve totais

**Decisão:** (c). Migration `V25__create_profile_views.sql` cria `profile_views`
(`id`, `target_user_id`, `viewer_user_id`, `viewed_on DATE`) com
`UNIQUE (target_user_id, viewer_user_id, viewed_on)` e
`CHECK (target_user_id <> viewer_user_id)`. `POST /api/profile-views` com
`{ targetUserId }` grava com `INSERT ... ON CONFLICT DO NOTHING` e responde 204.
Auto-visita e visitante do mesmo papel do alvo são ignorados (também 204); alvo
inexistente ou removido responde 404. O dia segue o fuso America/Recife. O visitante
nunca sai em nenhuma resposta.

**Justificativa:** LGPD, minimização e finalidade: a finalidade é mostrar ao dono do
perfil quanto ele é visto, e para isso basta o total. O visitante fica gravado só para
garantir "uma por dia" e para apagar na exclusão de conta (D044). Sem horário, o
registro não permite reconstruir a navegação de ninguém. O `ON CONFLICT` evita erro e
corrida entre cliques repetidos.

**Impacto:** pacote novo `popularity` (`entity/ProfileView`,
`repository/ProfileViewRepository`, `service/PopularityService.registerView`,
`controller/PopularityController`, `dto/ProfileViewRequest`), migration V25. Testes de
visita duplicada, auto-visita e mesmo papel em `PopularityIntegrationTest`.


## D042: Popularidade própria e fora do score de compatibilidade

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** O front mostra a popularidade (porcentagem das notas) e quer usá-la para
ordenar recomendações. O score de compatibilidade (D001 a D025) mede aderência de
tese, não reputação, e sua política é versionada.

**Alternativas:**

- (a) Somar a popularidade ao score de compatibilidade no back
- (b) Usar a popularidade como critério de ordenação no ranking do back
- (c) Manter o score como está e entregar a popularidade separada; o front decide a
  ordenação

**Decisão:** (c). `GET /api/profile/me/popularity` devolve o resumo da D040 mais
`meetingsCompleted` (reuniões REALIZADAS do usuário), `profileViews28d`,
`profileViewsPrev28d`, `weeklyViews` (4 janelas de 7 dias, `{ weekStart, views }`) e
`interestsReceived`, que fica **0** porque o interesse mútuo ainda não existe no back
(D039). Score, política de score, autenticação e regras de reunião não mudam. A única
consulta nova em reuniões é `MeetingRepository.countByParticipantAndStatus` (leitura).

**Justificativa:** misturar reputação no score quebraria a explicabilidade (D010) e
faria uma nota de reunião mudar a "compatibilidade" exibida. No front, a popularidade
entra só como desempate e bônus pequeno de ordenação (no máximo 5 pontos), nunca no
número exibido (ADR-006 do front).

**Pendência para o squad:** decidir se a popularidade entra no ranking do back
(`/api/recommendations`) e preencher `interestsReceived` quando o interesse mútuo
existir.

**Impacto:** `popularity/service/PopularityService.myPopularity`,
`popularity/dto/PopularityResponse`, `popularity/dto/WeeklyViewsDto`,
`communication/repository/MeetingRepository.java`. Teste
`popularidadePropriaTrazAgregadosSemExporVisitantes`.


## D043: Comentário da avaliação opcional, gravado e oculto para todos os usuários

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** `POST /api/meetings/{id}/reviews` aceita `comment` (até 1000
caracteres). `GET /api/meetings/{id}/reviews` e `GET /api/reviews/received`
devolviam esse texto ao autor e ao avaliado. O grupo decidiu que só a nota é visível
(ADR-006 do front): texto livre sobre uma pessoa, exibido a ela ou a terceiros, gera
exposição e conflito sem ajudar a decisão de marcar reunião.

**Alternativas:**

- (a) Remover o campo e a coluna
- (b) Mostrar o comentário só ao avaliado
- (c) Manter o campo opcional e gravado, fora de todas as respostas a STARTUP e
  INVESTOR

**Decisão:** (c). `ReviewResponse` (e, por ela, `ReceivedReviewsResponse`) não tem
mais `comment`; o `ReviewService.toResponse` não lê o texto. A coluna
`interaction_reviews.comment` e a validação `@Size(max = 1000)` continuam. O export
LGPD do próprio autor (`reviewsWritten`) continua com o texto que ele escreveu; em
`reviewsReceived` o texto sai. Na exclusão de conta, `clearCommentsWrittenBy` (T13)
continua apagando os comentários do titular. Não há tela nem endpoint de leitura de
comentários.

**Justificativa:** finalidade declarada: moderação (abuso, assédio, fraude) e melhoria
da plataforma. Para isso basta guardar; exibir não tem finalidade. O autor tem direito
de acesso ao que escreveu (LGPD, art. 18), por isso o export mantém o texto dele.

**Pendências para o squad:**

- Acesso do ADMIN (moderação) aos comentários: endpoint e tela, com registro em
  auditoria.
- Prazo de retenção dos comentários (sugestão: apagar o texto depois de N meses).
- Texto de consentimento LGPD: avisar que comentários de avaliação são coletados,
  não são exibidos e servem à moderação e à melhoria da plataforma.
- `GET /api/meetings/{id}/reviews` e o export ainda mostram ao avaliado quem deu qual
  nota naquela reunião (`reviewer` + `rating`). O front não usa isso; avaliar se deve
  sair também.

**Impacto:** `review/dto/ReviewResponse.java`, `review/dto/ReceivedReviewsResponse.java`
(documentação), `review/service/ReviewService.java`, `review/controller/ReviewController.java`
(Swagger), `privacy/service/DataPrivacyService.java` (`reviewsData` com
`includeComment`). Teste `comentarioEhGravadoMasNaoApareceEmNenhumaResposta` cobre
POST, as duas listas, o resumo e a popularidade.


## D044: Visitas e avaliações na exclusão e no export de conta (T13)

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** A exclusão de conta é por anonimização (D029): registros compartilhados
ficam sem conteúdo pessoal. A D041 cria um registro novo que liga duas pessoas
(visitante e visitado).

**Alternativas:**

- (a) Manter as visitas e só anonimizar o usuário
- (b) Apagar as visitas em que o titular é visitante ou visitado

**Decisão:** (b). `DataPrivacyService.deleteAccount` chama
`ProfileViewRepository.deleteAllInvolving(userId)`. No export, `profileViewsMade`
lista os perfis que o titular visitou e o dia (são dados dele) e
`profileViewsReceivedTotal` traz só o total recebido, sem os visitantes (dados de
terceiros). As avaliações seguem a T13: a nota fica (é da outra pessoa e compõe a
popularidade dela), o comentário escrito pelo titular é apagado.

**Justificativa:** sem a conta, a visita não tem finalidade (o perfil sumiu ou o
visitante saiu) e o total do outro lado só perde um número. Mostrar no export quem
visitou o titular exporia terceiros.

**Impacto:** `privacy/service/DataPrivacyService.java`,
`popularity/repository/ProfileViewRepository.java`
(`findByViewerUserIdOrderByViewedOnDesc`, `countByTargetUserId`, `deleteAllInvolving`),
`DataPrivacyServiceTest` (verifica a exclusão das visitas).


## D045: Score sob demanda na descoberta e limitação de escala

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** O score só existia quando alguém chamava `POST /api/scorecard/calculate`
com os dois ids. O front calculava a compatibilidade sozinho, com regras próprias, e
não havia lista de candidatos no back.

**Alternativas:**

- (a) Calcular todos os pares num job agendado
- (b) Calcular na criação ou alteração de cada perfil, contra todos os do outro papel
- (c) Calcular sob demanda na leitura da descoberta, reaproveitando o que já foi gravado

**Decisão:** (c). O `DiscoveryService` monta os candidatos do papel complementar
(usuários ativos com perfil criado) e, para cada par, usa o `match_scores` da
política ativa do investidor quando `calculated_at` é posterior ao `updated_at` dos
dois perfis. Senão, calcula e grava com `ScorePersistenceService.calculateAndPersist`
(regra de cálculo inalterada). Os perfis ganharam `updated_at`
(`V27__add_updated_at_to_profiles.sql`), preenchido por `@PrePersist`/`@PreUpdate`.
Na migração, todos os perfis recebem `now()`, então cada score antigo é recalculado
uma vez.

**Limitação de escala:** no máximo `unio.discovery.max-calculations-per-request`
(padrão 200) cálculos por requisição. Pares além disso usam o score antigo, se
houver, ou ficam fora da página e são contados em `notCalculated`; as leituras
seguintes completam. Os filtros sem score (busca, segmento, estágio, tipo) são
aplicados antes do cálculo para gastar menos. A lista ainda carrega todos os perfis
do outro papel em memória a cada requisição: serve para centenas de usuários, não
para dezenas de milhares. Para escalar: job assíncrono que recalcula ao salvar o
perfil, paginação no banco e índice por score.

**Justificativa:** entrega o score real do scorecard nas telas sem job nem fila, e
o custo fica limitado por requisição.

**Impacto:** `discovery/service/DiscoveryService.java`, `profile/entity/Startup.java`,
`profile/entity/Investor.java`, `V27__add_updated_at_to_profiles.sql`,
`application.properties`. Testes: `DiscoveryIntegrationTest`
(`scoreCriadoNaPrimeiraLeituraEReaproveitadoNaSegunda`,
`perfilAlteradoDepoisDoCalculoRecalculaOScore`).


## D046: Endpoints de descoberta e o que expõem

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** As telas Descobrir (investidor) e Investidores (startup) usavam perfis de
exemplo do front. O back precisava listar candidatos reais com o score e a explicação.

**Alternativas:**

- (a) Reaproveitar `GET /api/scorecard/recommendations` (só investidor, só lê scores gravados)
- (b) Um controller novo, `/api/discovery`, para os dois papéis

**Decisão:** (b). `GET /api/discovery/startups` (só INVESTOR) e
`GET /api/discovery/investors` (só STARTUP), com `q`, `segmento`, `estagio`, `tipo`
(só investidores; "Investidor Anjo" e "Mentor" incluem "Ambos"), `minScore`, `limit`
(padrão 20, máximo 100) e `offset`, ordenados por score decrescente.
`GET /api/discovery/startups/{userId}` e `GET /api/discovery/investors/{userId}` dão o
detalhe. Lista e detalhe têm o mesmo item: `userId`, `name`
(`ParticipantService.displayName`), `role`, `profile` (campos públicos), `scoreFinal`,
`classification`, `dimensions`, `topPositiveFactors`, `topAttentionFactors`,
`nextStep`, `scorecard { startupId, investorId, scorePolicyId }` (para o feedback),
`interestStatus` e `saved`.

Campos públicos (`PublicProfileMapper`): startup com `segmento`, `estagio`,
`localizacao`, `modeloNegocio`, `mercadoAlvo`, `capitalProcurado` e `pitchCanvas`;
investidor com `segmentosInteresse`, `estagiosInteresse`, `ticketMinimo`,
`ticketMaximo`, `perfilRisco`, `disponibilidade` e `regiaoInteresse`. Nunca e-mail,
documento, senha, JSON de onboarding nem o arquivo de pitch. Papel errado: 403. Conta
sem perfil próprio: 409. Candidato inexistente, removido ou sem perfil: 404.

**Pendências para o squad:** pitch (arquivo) e canvas estruturado continuam fora da
descoberta: dependem de regra de visibilidade e de moderação, e o canvas vive no JSON
de onboarding. O nome do investidor ainda é a parte do e-mail antes do "@" (D037),
porque o perfil de investidor não tem nome.

**Justificativa:** um item só, com tudo que as telas mostram, evita N chamadas por
card e mantém a regra do que é público num único lugar.

**Impacto:** `discovery/controller/DiscoveryController.java`,
`discovery/service/DiscoveryService.java`, `discovery/service/PublicProfileMapper.java`,
`discovery/dto/*`, `docs/contrato/contrato-descoberta.md`. Testes:
`DiscoveryIntegrationTest` (ordem, filtros, 403, 404, 409, sem campos sensíveis).


## D047: Ajustes no cálculo: política pelo perfilRisco, critério eliminatório na descoberta e região

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** O relatório de estado mostrou três problemas no score:
`ScorePersistenceService.mapToProfileType` devolvia sempre `ANGEL_INVESTOR`; um
critério CRITICAL violado lança `CRITICAL_CRITERION_VIOLATED`, o que derrubaria a
lista inteira; e `REGIAO_FIT` comparava texto exato ("Recife, PE" contra
"Recife / Porto Digital" ou "Nordeste") e quase sempre dava 0.

**Alternativas:**

- Política: (a) manter tudo como anjo; (b) mapear `perfilRisco` para o tipo
- Critério eliminatório: (a) mudar o `ScoreCalculatorService` para não lançar;
  (b) tratar na descoberta, por par
- Região: (a) cadastro de região estruturado; (b) normalizar a comparação de texto

**Decisão:**

1. **Política:** "Mentor" vira `MENTOR`; "Capital de risco" ou "Venture capital" vira
   `VENTURE_CAPITAL`; qualquer outro valor ("Investidor Anjo", "Ambos"), nulo ou em
   branco vira `ANGEL_INVESTOR` (sem acento e sem diferença de maiúsculas). Se o tipo
   não tiver política ativa, usa a de `ANGEL_INVESTOR` em vez de `POLICY_NOT_FOUND`.
   Como pode haver um score por política no mesmo par, `ExplanationController` passou
   a usar o mais recente (antes dava erro com dois).
2. **Critério eliminatório:** o `DiscoveryService` roda o `ScoreCalculatorService`
   antes de gravar. Com critério CRITICAL violado, o par entra como score 0 e
   `SEM_MATCH`, com o critério em `topAttentionFactors` e
   `nextStep.code = CRITICAL_CRITERION_VIOLATED`, sem gravar nada e sem exceção (a
   exceção dentro da transação a marcaria para rollback). A regra do
   `ScoreCalculatorService` não mudou.
3. **Região (`RegionMatcher`):** sem acentos e sem maiúsculas, há acerto quando os
   textos são iguais (regra antiga), quando a cidade ou a UF da startup aparece como
   palavra numa região do investidor, quando a região é o nome do estado
   ("Pernambuco" para PE), quando a região diz "Nordeste" e a UF é do Nordeste, ou
   quando a região diz "Brasil" ("Todo o Brasil"). "Aberto a startups remotas" não
   acerta sozinho: o perfil da startup não diz se ela é remota. Pesos, criticidade e o
   resto do cálculo não mudaram.

**Justificativa:** o tipo de investidor já existe no cadastro e as políticas já
estavam semeadas; o par ruim não pode esconder os bons; a região do cadastro é texto
livre, então a comparação precisa tolerar o formato.

**Impacto:** `scorecard/calculation/service/ScorePersistenceService.java`
(`resolvePolicy`, `mapToProfileType`), `scorecard/calculation/service/RegionMatcher.java`,
`scorecard/calculation/service/ScoreCalculatorService.java`,
`scorecard/calculation/MatchScoreRepository.java` (`findAllByInvestorIdAndStartupId`),
`scorecard/explanation/controller/ExplanationController.java`,
`discovery/service/DiscoveryService.java`, comentário em `ProfileService`. Testes:
`RegionAndPolicyTest`, `DiscoveryIntegrationTest`
(`listaOrdenadaPorScoreComCriticoComoSemMatchESemPerfilFora`).


## D048: Scorecard só aceita o próprio par

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** `RecommendationController`, `ExplanationController`,
`ScorecardCalculationController` e `FeedbackController` aceitavam qualquer
`investorId`/`startupId`: qualquer usuário logado lia scores de terceiros e gravava
feedback em nome de outro investidor.

**Alternativas:**

- (a) Tirar os ids da API e usar só o usuário logado
- (b) Manter os ids e exigir que o lado do papel de quem chama seja o próprio usuário

**Decisão:** (b), em `ScorecardAccess`. O investidor só usa pares em que é o
`investorId`; a startup, pares em que é o `startupId`; ADMIN, qualquer par. Outro par:
403. `GET /recommendations` exige `investorId` igual ao do investidor logado. O
feedback aceita `VIEWED`, `INTERESTED` e `NOT_INTERESTED` dos dois papéis, com o objeto
`scorecard` do item da descoberta; a checagem de duplicado (409 `FEEDBACK_DUPLICATE`)
não mudou. Nenhum teste existente dependia do comportamento antigo.

**Justificativa:** mantém o contrato v2 e fecha o acesso a dados de terceiros.

**Impacto:** `scorecard/common/ScorecardAccess.java` e os quatro controllers (também
com `@Operation`). Testes: `DiscoveryIntegrationTest` (`feedbackSoNoProprioPar`,
`scorecardNaoAceitaIdsDeOutroUsuario`).


## D049: Interesse persistido e match mútuo derivado

Autora: Carol
Data: 2026-11-16
Status: Aceita (armazenamento substituído pela D058: os interesses ficam em match_interests)

**Contexto:** O interesse e o match ("unio") existiam só no front (D039). O produto
quer reuniões só entre quem deu match e "Meus unios" com dados reais.

**Alternativas:**

- (a) Tabela de match com status (pendente, aceito)
- (b) Tabela de interesse por direção; o match é derivado (as duas linhas existem)

**Decisão:** (b). `user_interests (from_user_id, to_user_id, created_at)`, com
`UNIQUE (from_user_id, to_user_id)`, `CHECK` contra si mesmo e chaves estrangeiras
para `users` (`V26__create_user_interests_and_saved.sql`). Endpoints em
`InterestController`:

- `PUT /api/interests/{targetUserId}`: idempotente (`insert ... on conflict do
  nothing`). Responde `{ status: "ENVIADO" | "MATCH", matchedAt? }`; `matchedAt` é o
  horário do segundo interesse.
- `DELETE /api/interests/{targetUserId}`: retira o interesse; se havia match, ele
  deixa de existir e as reuniões futuras do par são canceladas (D051). Responde
  `{ status, canceledMeetings }`.
- `GET /api/interests/matches`: os matches do usuário logado (D052).

Só entre STARTUP e INVESTOR ativos com perfil criado: mesmo papel ou si mesmo, 400;
alvo inexistente, removido ou sem perfil, 404; quem chama sem perfil, 409. A
descoberta mostra `interestStatus`: `NONE`, `SENT`, `RECEIVED` ou `MATCH`.

**Justificativa:** sem estado a sincronizar: desfazer é apagar uma linha, e o match
some sozinho. A regra de papel fica no service porque o papel está em `users`.

**Impacto:** `interest/entity/UserInterest.java`,
`interest/repository/UserInterestRepository.java`, `interest/service/InterestService.java`,
`interest/controller/InterestController.java`, `interest/dto/*`, `V26`. Substitui a
D039. Testes: `InterestIntegrationTest`.


## D050: Salvos no back

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** A lista de salvos ficava no `localStorage` do navegador.

**Alternativas:**

- (a) Continuar no front
- (b) Tabela própria, privada de quem salvou

**Decisão:** (b). `user_saved (user_id, target_user_id, created_at)` com `UNIQUE` e
chaves estrangeiras (V26). `PUT` e `DELETE /api/saved/{targetUserId}` são idempotentes
(204); `GET /api/saved` devolve o mesmo resumo dos matches, sem contato. O outro lado
nunca sabe que foi salvo. Mesmas regras de papel e perfil da D049.

**Justificativa:** os salvos passam a valer em qualquer navegador; não revelam nada a
terceiros.

**Impacto:** `interest/entity/UserSaved.java`, `interest/repository/UserSavedRepository.java`,
`InterestService`, `InterestController`. Teste: `salvosSaoIdempotentes`.


## D051: Reunião só com match (substitui parcialmente a D028)

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** A D028 liberou reuniões sem match porque o match não existia no back.
Com a D049 ele existe.

**Alternativas:**

- (a) Exigir match sempre
- (b) Exigir match por propriedade, ligada por padrão

**Decisão:** (b). Com `unio.communication.require-match=true` (padrão),
`MeetingService.schedule` chama `ParticipantService.requireMatchToMeet` e responde 403
"Vocês precisam dar match (interesse mútuo) para marcar uma reunião";
`GET /api/meetings/counterparts` lista só quem deu match. Reuniões já existentes não
mudam: aceitar, contrapropor, cancelar e concluir seguem como antes. Ao desfazer um
match (`DELETE /api/interests/...`), `MeetingService.cancelFutureBetween` cancela as
reuniões CONFIRMADA com início no futuro e as PENDENTE com algum horário sugerido no
futuro, com o motivo "Match desfeito". Reuniões passadas ficam, para poderem ser
concluídas e avaliadas.

Substitui a D028 só na parte "sem exigir match" das reuniões. Conversas
(`/api/conversations`) não mudam: o produto decidiu que não há chat (contato externo
depois do match), e elas ficam fora do escopo.

Os testes de reunião antigos (`CommunicationFlowIntegrationTest`,
`MeetingProposalsIntegrationTest`) criam o match no setup (`createMatch` em
`IntegrationTestSupport`). Os testes de unidade montam o `ParticipantService` com o
construtor de dois argumentos, que deixa a regra desligada (`MeetingMatchPolicy.disabled()`).

**Justificativa:** a propriedade permite desligar a regra numa demonstração sem
mudar código.

**Impacto:** `communication/service/MeetingMatchPolicy.java`,
`communication/service/ParticipantService.java`, `communication/service/MeetingService.java`,
`communication/service/MeetingCounterpartService.java`,
`communication/repository/MeetingRepository.java` (`findActiveBetween`),
`application.properties`. Testes: `reuniaoSemMatchRetornaErroClaroEContrapartesSoComMatch`,
`desfazerMatchCancelaReunioesFuturas`.


## D052: E-mail do outro lado só depois do match

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** A plataforma não tem chat: depois do match, o contato é externo. O front
mostrava contatos de exemplo. O cadastro só tem e-mail (telefone e WhatsApp não
existem no back).

**Alternativas:**

- (a) Campos de contato novos no perfil
- (b) Usar o e-mail da conta, só depois do match

**Decisão:** (b). `GET /api/interests/matches` é o único endpoint que devolve o e-mail
de outra pessoa (`contact.email`), e só de quem tem match mútuo com o usuário logado.
Descoberta, salvos, contrapartes e reuniões continuam sem e-mail. Se o match for
desfeito, o e-mail deixa de aparecer.

**Justificativa:** finalidade declarada (LGPD, art. 6º, I): permitir o contato depois
do interesse mútuo. Antes do match não há finalidade.

**Pendências para o squad:** texto LGPD e do termo de uso avisando que o e-mail é
compartilhado com quem der match; telefone e WhatsApp opcionais no perfil, se o
produto quiser.

**Impacto:** `interest/dto/ContactDto.java`, `interest/dto/ConnectionResponse.java`,
`InterestService.matches`. Teste: `emailNaoApareceAntesDoMatch`.


## D053: Métricas novas de interesse e match

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** `AdminMetricsResponse.totalMatches` conta linhas de `match_scores`
(pares com score), não matches mútuos. `GET /api/profile/me/popularity` devolvia
`interestsReceived` 0 (D042).

**Alternativas:**

- (a) Mudar o significado de `totalMatches`
- (b) Campos novos, sem remover nem mudar os existentes

**Decisão:** (b). `AdminMetricsResponse` ganhou `interestsSent` (linhas de
`user_interests`) e `mutualMatches` (pares com as duas linhas, cada par contado uma
vez). `totalMatches` continua igual. `interestsReceived` da popularidade passou a ser a
contagem real de linhas com `to_user_id` do usuário logado, sem dizer de quem.

**Justificativa:** não quebra o painel nem os clientes atuais.

**Impacto:** `admin/dto/AdminMetricsResponse.java`, `admin/service/AdminMetricsService.java`,
`popularity/service/PopularityService.java`, `UserInterestRepository.countMutualMatches`.
Testes: `AdminMetricsServiceTest`, `metricasDoAdminContamMatchesMutuos`,
`interesseUnilateralNaoViraMatchEBilateralVira`.

Sobre o comentário da avaliação: continua gravado e oculto em todas as respostas,
como decidido na D043. Nada mudou nesta entrega.


## D054: Primeiro administrador por variável de ambiente e bootstrap no corpo

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** Não havia conta ADMIN no banco, e a API não deixava criar a primeira: o
cadastro recusa ADMIN e `POST /api/admin/bootstrap-admin` exige ADMIN e recebia e-mail
e senha na query string (que fica em log de acesso, histórico e proxy).

**Alternativas:**

- (a) Migration com um administrador fixo
- (b) Endpoint público de primeiro acesso
- (c) Seed na subida a partir de variáveis de ambiente

**Decisão:** (c). `AdminSeedRunner` lê `unio.admin.email` e `unio.admin.password`
(`UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD`) e cria o administrador só se ainda não
existir nenhum ADMIN, a senha tiver 8 caracteres ou mais e o e-mail não for de outra
conta. Sem as variáveis, não faz nada. A senha nunca vai para log, código ou arquivo
versionado. `bootstrap-admin` continua só para ADMIN e passou a receber
`{ email, password }` no corpo (`BootstrapAdminRequest`, com validação e `toString` sem
a senha); query string não funciona mais.

**Justificativa:** (a) poria uma credencial no repositório; (b) abriria a criação de
administrador para qualquer um.

**Como usar:** definir as duas variáveis no ambiente do back e reiniciar. Depois do
primeiro login, as variáveis podem ser removidas.

**Impacto:** `profile/config/AdminSeedRunner.java`, `profile/dto/BootstrapAdminRequest.java`,
`profile/controller/AdminController.java`, `auth/repository/UserRepository.java`
(`existsByRole`), `application.properties`. Testes: `AdminSeedRunnerTest`,
`AdminBootstrapIntegrationTest`.


## D055: Interesses e salvos na exclusão e no export de conta

Autora: Carol
Data: 2026-11-16
Status: Aceita

**Contexto:** A D049 e a D050 criaram registros que ligam duas pessoas.

**Alternativas:**

- (a) Manter as linhas e só anonimizar o usuário
- (b) Apagar as linhas em que o titular aparece

**Decisão:** (b). `DataPrivacyService.deleteAccount` apaga os interesses enviados e
recebidos e os salvos do titular e sobre ele. Os matches somem junto. No export,
`interestsSent` e `saved` listam os alvos e as datas (dados do titular), e
`interestsReceivedTotal` traz só o total, sem dizer quem (dados de terceiros), como na
D044.

**Justificativa:** sem a conta, interesse e salvo não têm finalidade.

**Impacto:** `privacy/service/DataPrivacyService.java`, `deleteAllInvolving` nos dois
repositórios. Teste: `DataPrivacyServiceTest`.


## D056: Origens do CORS por propriedade e variável de ambiente

Autora: Carol
Data: 2026-11-20
Status: Aceita

**Contexto:** `config/CorsConfig.java` tinha a lista de origens fixa no código (localhost
3000 e 5173, 127.0.0.1 e dois domínios da Vercel). Com o back no Azure App Service, um
front publicado em qualquer outro endereço tem as chamadas bloqueadas pelo navegador
(sem `Access-Control-Allow-Origin`) e o app parece "não conectar". Mudar a lista exigia
novo build e deploy.

**Alternativas:**

- (a) Continuar com a lista fixa e editar o código a cada novo endereço
- (b) Aceitar qualquer origem ("*")
- (c) Lista por propriedade, lida de variável de ambiente, com as origens atuais como padrão

**Decisão:** (c). `unio.cors.allowed-origins` (lista separada por vírgulas) vem de
`UNIO_CORS_ALLOWED_ORIGINS`; sem a variável, valem as seis origens de antes. Espaços e
barra final são removidos. A subida falha com mensagem clara se a lista estiver vazia,
tiver "*" ou curinga (as chamadas usam `allowCredentials`, que não combina com "*") ou
uma origem sem `http://`/`https://`.

**Justificativa:** (b) é proibido pela especificação de CORS com credenciais e abriria a
API para qualquer site. (c) troca a origem sem build, só com configuração.

**Como usar no Azure:** App Service → Configuration → Application settings → New
application setting: nome `UNIO_CORS_ALLOWED_ORIGINS`, valor com as origens exatas do
front separadas por vírgula (ex.: `https://unio-pi.vercel.app,https://meu-front.vercel.app`),
sem barra no final. Salvar e **reiniciar o App Service**: a lista é lida só na subida.
Quem define a variável substitui a lista padrão inteira, então inclua todas as origens
que devem continuar funcionando.

**Impacto:** `config/CorsConfig.java`, `application.properties`. Testes:
`CorsConfigTest` (lista, "*", vazio) e `CorsIntegrationTest` (preflight de origem
permitida passa com credenciais; de origem desconhecida volta 403 sem
`Access-Control-Allow-Origin`).


## D057: Políticas padrão do scorecard fora do perfil dev

Autora: Carol
Data: 2026-11-20
Status: Aceita

**Contexto:** Na revisão de dados de demonstração do back (pedido da auditoria de
integração, ADR-011 do front) não há dados falsos que subam em produção: não existe
DataLoader, endpoint de demo nem migration com perfis de teste; o `AdminSeedRunner` só
age com `UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD` (D054). O único `CommandLineRunner`
de dados é o `ScorecardSeedRunner`, que cria as três políticas padrão do scorecard
(pesos dos critérios). Isso é configuração do algoritmo, não dado de exemplo, mas ele
só rodava com `@Profile("dev")`. Num banco novo de produção não havia política ativa e a
descoberta respondia 500 (`POLICY_NOT_FOUND` em `ScorePersistenceService.resolvePolicy`).

**Alternativas:**

- (a) Migration com as políticas
- (b) Exigir que o admin crie as políticas pela API antes do primeiro uso
- (c) Rodar o mesmo seed em qualquer perfil, idempotente, com chave para desligar

**Decisão:** (c). Saiu o `@Profile("dev")`; entrou
`@ConditionalOnProperty(unio.scorecard.seed-default-policies, padrão true)`. O seed só
cria políticas se a tabela estiver vazia; nunca altera nem apaga políticas existentes.

**Justificativa:** (a) gravaria pesos numa migration versionada, difícil de ajustar depois
pelo admin; (b) deixa a descoberta quebrada até alguém lembrar do passo manual. (c) usa o
código que já era testado em dev e não mexe em bancos que já têm política.

**Impacto:** `scorecard/common/config/ScorecardSeedRunner.java`, `application.properties`.
Sem migration (nada a criar nem apagar no banco). Teste: `ScorecardSeedRunnerTest`.


## D058: Interesse e match numa fonte só: match_interests

Autora: Carol
Data: 2026-11-21
Status: Aceita (substitui a parte de armazenamento da D049)

**Contexto:** No merge com o `main`, as duas linhas tinham implementado o mesmo conceito.
O `main` (T23, João Carlos) criou o pacote `match`: tabela `match_interests` (V23, já
aplicada no banco da nuvem), uma linha por quem curtiu o par (`startup_id`, `investor_id`,
`liked_by_user_id`) com status `LIKED`, `MATCHED` ou `REJECTED`, e as rotas
`POST /api/matches/interest`, `GET /api/matches` e `GET /api/matches/saved`. A linha da
Carol criou o pacote `interest`: tabela `user_interests` (de/para), match derivado,
desfazer com cancelamento de reuniões (D051), contato só depois do match (D052), salvos
(D050), métricas (D053) e LGPD (D055). Duas tabelas para o mesmo fato seriam duas
fontes de verdade.

**Alternativas:**

- (a) Manter `user_interests` e fazer as rotas do `main` lerem dela
- (b) Manter `match_interests` (já existe na nuvem) e reimplementar a regra da Carol sobre ela
- (c) Manter as duas e sincronizar

**Decisão:** (b).

- `MatchInterestRepository` é o único repositório de interesse. Uma linha é "ativa" quando o
  status não é `REJECTED` e quem curtiu é um dos lados do par. O match mútuo continua
  derivado (as duas linhas ativas do par), como na D049; o status `MATCHED`/`LIKED` é
  mantido em dia (`syncPairStatus`) a cada interesse e a cada retirada, para as rotas do `main`.
- `InterestService` é a única implementação da regra: papéis, perfil próprio (409), alvo
  ativo com perfil (404), match, desfazer com cancelamento de reuniões futuras, e-mail só
  nos matches. Grava com `insert ... on conflict` (idempotente; uma linha `REJECTED` volta
  a valer).
- `MatchInterestService` (rotas do `main`) mantém as validações e mensagens do contrato
  dele (ids obrigatórios 400, "em seu próprio nome" 403, outro lado inexistente 404,
  ADMIN 403) e delega a gravação e as leituras ao `InterestService`. As respostas
  continuam sendo as linhas de `match_interests`. `GET /api/matches/saved` continua
  significando "interesses enviados ainda sem match" (status `LIKED`); os salvos de
  bookmark continuam em `user_saved` (`/api/saved`, D050), que não tem equivalente no `main`.
- Retirar o interesse (`DELETE /api/interests/{id}`) apaga a linha de quem retirou e
  devolve a linha do outro lado para `LIKED`. O `main` não tinha "desfazer".
- `MeetingMatchPolicy` (D051), `PopularityService` (D053), `AdminMetricsService` (D053),
  `DataPrivacyService` (D055), o painel da startup (D060) e as recomendações (D061) leem
  do mesmo repositório.
- `V29__unifica_interesses_em_match_interests.sql` copia as linhas de `user_interests`
  para `match_interests` (só pares STARTUP x INVESTOR; repetidas são ignoradas), acerta
  status fora da regra (por exemplo, duas curtidas simultâneas que ficaram `LIKED` dos dois
  lados) e marca `user_interests` como obsoleta com `COMMENT`. Nada é apagado: a tabela
  fica, sem uso, até uma decisão própria de removê-la.
- `UserInterest` e `UserInterestRepository` saíram do código.

**Mudança de comportamento na rota do `main`:** `POST /api/matches/interest` passa a
exigir o perfil de quem chama (409) e um outro lado ativo (conta removida: 404), as mesmas
regras de `/api/interests`. Antes ele aceitava quem não tinha perfil. `GET /api/matches` e
`GET /api/matches/saved` deixam de listar pares com conta removida.

**Justificativa:** a tabela que a nuvem já tem não muda de estrutura (nenhuma migration
do `main` é tocada), as rotas das duas linhas continuam funcionando e uma regra só decide
interesse, match e contato.

**Impacto:** `match/repository/MatchInterestRepository.java`,
`match/service/MatchInterestService.java`, `interest/service/InterestService.java`,
`communication/service/MeetingMatchPolicy.java`, `popularity/service/PopularityService.java`,
`admin/service/AdminMetricsService.java`, `privacy/service/DataPrivacyService.java`, V29.
Testes ajustados (só trocaram o repositório; a regra verificada é a mesma):
`AdminMetricsServiceTest` (`count()` virou `countActive()`, que ignora `REJECTED`),
`DataPrivacyServiceTest` (tipo do mock) e `IntegrationTestSupport.createMatch` (grava as
duas linhas em `match_interests`). Teste novo: `UnificacaoMainIntegrationTest`
(`rotasDoMainEDaCarolGravamELeemNoMesmoLugar`, `rotaDoMainMantemSuasValidacoes`).


## D059: Renumeração das migrations da linha da Carol

Autora: Carol
Data: 2026-11-21
Status: Aceita

**Contexto:** O banco da nuvem aplicou as migrations do `main` até a
`V23__create_match_interest.sql`. A linha da Carol tinha cinco migrations a partir da
mesma V23, com outro conteúdo (`V23__capital_procurado_opcional.sql` e seguintes). Com
números repetidos o Flyway não sobe (versão duplicada), e mudar uma migration já aplicada
quebra a validação de checksum na nuvem.

**Alternativas:**

- (a) Renumerar as migrations do `main`
- (b) Renumerar as da Carol para depois da última do `main`, na mesma ordem

**Decisão:** (b). Nenhuma migration do `main` muda de número nem de conteúdo. As da Carol
só mudaram de nome (conteúdo igual):

| Antes | Depois |
| --- | --- |
| `V23__capital_procurado_opcional.sql` | `V24__capital_procurado_opcional.sql` |
| `V24__meetings_proposals.sql` | `V25__meetings_proposals.sql` |
| `V25__create_profile_views.sql` | `V26__create_profile_views.sql` |
| `V26__create_user_interests_and_saved.sql` | `V27__create_user_interests_and_saved.sql` |
| `V27__add_updated_at_to_profiles.sql` | `V28__add_updated_at_to_profiles.sql` |
| (nova) | `V29__unifica_interesses_em_match_interests.sql` (D058) |

As decisões antigas citam os números antigos (V24 na D032, V25 na D041, V26 na D049 e
D050, V27 na D045); vale esta tabela.

**Prova:** num PostgreSQL descartável, aplicadas só as migrations do `origin/main` (V1 a
V23) e inseridos dados no formato que o código do `main` grava (perfis, reunião e
`match_interests` com `MATCHED` e `LIKED`), o Flyway 12.4.0 com o conjunto unido validou
V1 a V23 sem erro de checksum e aplicou só V24 a V29. Os dados ficaram (reunião com
`proposer_user_id` igual ao organizador e 1 horário sugerido; perfis com `updated_at`;
`capital_procurado` aceitando nulo), e o par com duas curtidas `LIKED` virou `MATCHED`.
Num segundo banco, parado na V28 com linhas em `user_interests`, a V29 copiou o par mútuo
como `MATCHED` e o interesse simples como `LIKED`, ignorou a linha STARTUP para STARTUP e
manteve as 4 linhas de origem.

**Na primeira subida no Azure:** o Flyway da nuvem vê a V23 já aplicada e aplica só V24 a
V29, nessa ordem. Alteram tabelas com dados: V24 (`startup_profiles`: tira o NOT NULL de
`capital_procurado`), V25 (`meetings`: colunas novas, `format` NOT NULL com padrão
`ONLINE`, `proposer_user_id` preenchido com o organizador antes do NOT NULL, e um horário
sugerido por reunião existente), V28 (`startup_profiles` e `investor_profiles`:
`updated_at` NOT NULL com padrão `now()`) e V29 (`match_interests`: só `UPDATE` de status
fora da regra). Nenhuma cria coluna NOT NULL sem valor: todas têm padrão ou preenchimento
antes da restrição, e `meetings.organizer_user_id` já é NOT NULL desde a V20.

**Impacto:** `src/main/resources/db/migration/V24` a `V29`.


## D060: Perfis públicos e painel da startup do main com as regras da descoberta

Autora: Carol
Data: 2026-11-21
Status: Aceita

**Contexto:** O `main` (T21 e T22) criou `GET /api/profile/startup/{id}`,
`GET /api/profile/investor/{id}` e `GET /api/profile/startup/dashboard`. Os perfis
públicos devolviam e-mail e `pitchFileUrl` a qualquer usuário logado, o que contraria a
D046 (o que é público é decidido no `PublicProfileMapper`, nunca e-mail nem arquivo de
pitch) e a D052 (e-mail só depois do match). O painel contava `match_scores` como
"matches" (pares com score, não matches) e devolvia `totalVisualizacoes` sempre nulo,
enquanto a linha da Carol já tinha visitas (D041) e matches reais (D049).

**Alternativas:**

- (a) Manter as duas lógicas
- (b) Manter as rotas e o formato das respostas do `main` e fazer as rotas delegarem às regras únicas

**Decisão:** (b).

- `PublicProfileService` (pacote `discovery`) atende as duas rotas de perfil: busca o
  perfil, responde 404 para conta inexistente, removida ou sem perfil, e monta os campos a
  partir do `PublicProfileMapper`. O formato das respostas
  (`PublicStartupProfileResponse` e `PublicInvestorProfileResponse`) não mudou. `email` só
  vem para o próprio titular, ADMIN ou quem tem match mútuo; `pitchFileUrl` só para o
  titular e ADMIN; nos outros casos, `null`. Nome, disponibilidade e observação da
  disponibilidade continuam públicos nessas rotas.
- A lógica duplicada saiu do `ProfileService`.
- `DashboardStartupService`: `totalVisualizacoes` = visitas dos últimos 28 dias
  (`PopularityService.viewsLast28Days`, a mesma conta da popularidade);
  `totalMatches` = matches mútuos em `match_interests`. Reuniões agendadas e mensagens não
  lidas não mudaram. `MatchScoreRepository.countByStartupId` continua no repositório.
- Os detalhes com score continuam em `/api/discovery/{startups|investors}/{userId}`.

**Justificativa:** o que é público e quando o contato aparece fica num lugar só; as rotas
do `main` continuam respondendo no mesmo formato.

**Impacto:** `discovery/service/PublicProfileService.java`,
`profile/controller/ProfileController.java` (com `@Operation`),
`profile/service/ProfileService.java`, `profile/service/DashboardStartupService.java`,
`popularity/service/PopularityService.java`. Testes:
`perfilPublicoSoMostraEmailDepoisDoMatchENuncaOArquivoDePitch`,
`perfilPublicoDeContaRemovidaDa404`, `dashboardDaStartupContaMatchesReaisEVisitas`.


## D061: Uma regra só de acesso às recomendações do scorecard

Autora: Carol
Data: 2026-11-21
Status: Aceita (complementa a D048)

**Contexto:** As duas linhas fecharam o mesmo IDOR em `GET /api/scorecard/recommendations`
de jeitos diferentes. O `main` (T20) tirou o `investorId` da query e passou a usar o
usuário do token; também criou `GET /api/scorecard/recommendations/investors` para a
startup, com o e-mail do investidor e um e-mail inventado
("investidor-desconhecido@unio.com") quando o perfil faltava. A linha da Carol (D048)
manteve o `investorId` obrigatório e exigiu que fosse o do usuário logado, com ADMIN
consultando qualquer um (`ScorecardAccess`).

**Alternativas:**

- (a) Ficar só com a do `main` (o ADMIN deixa de consultar um investidor)
- (b) Ficar só com a da Carol (quebra os clientes do `main`, que não mandam o id)
- (c) Uma regra que atende os dois contratos

**Decisão:** (c), em `ScorecardAccess.resolveOwnSide`, usada pelas duas rotas: o id na
query é opcional; sem ele, vale o usuário logado (contrato do `main`); com ele, precisa
ser o do usuário logado, senão 403, exceto para ADMIN (D048). Nenhum papel lê
recomendações de outro usuário. Em `/recommendations/investors`, `investorEmail` só vem
quando há match mútuo (D052); sem match ou sem perfil, `null`, nunca um endereço
inventado.

**Justificativa:** as duas proteções continuam valendo e nenhum cliente existente quebra.

**Impacto:** `scorecard/common/ScorecardAccess.java`,
`scorecard/recommendation/controller/RecommendationController.java` (com `@Operation`),
`scorecard/recommendation/service/RecommendationService.java`. Testes:
`recomendacoesUsamORegraUnicaDeAcesso`, `recomendacaoDeInvestidorSoMostraEmailDepoisDoMatch`.


## D062: Login inválido responde "Credenciais inválidas"

Autora: Carol
Data: 2026-11-21
Status: Aceita

**Contexto:** A senha errada lançava a exceção do Spring Security fora do
`GlobalExceptionHandler`. Na linha da Carol o 401 saía sem corpo; no `main`, com o
`RestAuthenticationEntryPoint`, saía "Não autenticado", que é a mensagem de rota protegida
sem token, não de login.

**Alternativas:**

- (a) Tratar `AuthenticationException` no handler global
- (b) Tratar no `AuthService.login`, só para o login

**Decisão:** (b). Qualquer falha de autenticação no login (senha errada, e-mail
inexistente, conta desativada) responde 401 com `message: "Credenciais inválidas"` no
JSON padrão, igual nos três casos para não revelar se o e-mail existe. As rotas
protegidas sem token continuam com o 401 "Não autenticado" e o 403 "Acesso negado" do
`main` (`RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`). O front já mostra o
`message` do back no login sem tratar como sessão expirada (ADR-012 do front).

**Impacto:** `auth/service/AuthService.java`. Teste:
`loginInvalidoRespondeCredenciaisInvalidas`.


## D063: Moderação de cadastros e de conteúdo, com o pitch publicado para o investidor

Autora: Carol
Data: 2026-11-22
Status: Aceita

**Contexto:** RF08 (o administrador modera cadastros e conteúdo), RNF10 (toda ação
administrativa fica no log de auditoria) e RF06 (o investidor vê o pitch e o Lean Canvas no
perfil da startup) não tinham back: o admin só listava usuários, a tela de conteúdo dizia
"ainda não disponível" e o perfil público tinha `canvas: null`. O pitch da startup existe
só nas respostas livres do onboarding (`respostas.pitch` e `respostas.pitchLeanCanvas`).
Restrição da entrega: nada do que existe no `main` (trabalho do João e do Robson) muda de
contrato, rota, status, campo ou regra; o trabalho é aditivo, com ganchos mínimos.

**Alternativas:**

- Situação da conta: (a) coluna nova em `users`; (b) tabela própria em que a ausência de
  linha vale APROVADO.
- Esconder conta moderada: (a) filtro em cada consulta (descoberta, perfis públicos,
  contrapartes); (b) um gancho no `ParticipantService.isActive`, que todas essas consultas
  já usam para esconder conta excluída.
- Origem do conteúdo publicado: (a) corpo do POST; (b) as respostas do onboarding da
  própria startup.
- Envio novo com o anterior publicado: (a) o anterior segue público até o novo ser aprovado;
  (b) o envio novo substitui o anterior para o público na hora.
- Onde expor o pitch ao investidor: (a) campos novos no `PublicProfileDto`; (b) rota nova.

**Decisão:**

- Situação: (b), `account_moderation` (V30). APROVADO, PENDENTE, RECUSADO, SUSPENSO.
  Contas antigas seguem iguais sem migração de dados. O ADMIN nunca é moderado nem
  bloqueado; ninguém modera a si mesmo (400) nem outro ADMIN (403); estado repetido é
  idempotente.
- RECUSADO e SUSPENSO: o login responde 403 "Conta recusada pela moderação" ou "Conta
  suspensa", depois da senha conferida (senha errada continua 401, D062). PENDENTE entra
  para completar o perfil.
- Esconder: (b). `isActive` passa a consultar `AccountVisibility`, que guarda em memória,
  por até 5 segundos, os ids das contas não APROVADO (uma consulta por janela em vez de uma
  por candidato) e é limpa a cada ação de moderação. Em outra instância do App Service a
  mudança aparece em até 5 segundos. O login lê o banco direto.
- Recusar cancela as reuniões futuras da conta com o `cancelFutureBetween` que já existe
  (D051), com o motivo "Reunião cancelada porque a conta foi recusada pela moderação".
  Suspender não cancela. Matches, mensagens e reuniões passadas nunca são apagados.
- Conteúdo: (b) para a origem: o POST não tem corpo e copia o que a startup salvou; o que
  vai para revisão é exatamente o que está salvo. Limite de 20000 caracteres somando pitch,
  link e blocos; link de vídeo só do YouTube ou do Vimeo (mesma regra do front).
- `startup_pitch_publication` (V30): um registro por envio, versão crescente; vale o de
  maior versão, e só se estiver PUBLICADO: (b) para o envio novo, como pedido na entrega.
  Só o envio atual aceita aprovar ou remover (409 no antigo).
- Exposição: (b), `GET /api/discovery/startups/{userId}/pitch` (INVESTOR, a própria startup
  e ADMIN). `PublicProfileDto` e `GET /api/discovery/startups/{userId}` não mudam.
- Duas propriedades, com variável de ambiente: `unio.moderation.cadastro-requer-aprovacao`
  (`UNIO_MODERATION_CADASTRO_REQUER_APROVACAO`, padrão false) e
  `unio.moderation.pitch-requer-aprovacao` (`UNIO_MODERATION_PITCH_REQUER_APROVACAO`,
  padrão true).
- Auditoria: cada ação grava em `audit_logs` pelo `AuditService` existente, com o e-mail do
  ADMIN, o código da ação (`MODERACAO_CONTA_*`, `MODERACAO_PITCH_*`), o id do alvo e os
  detalhes (situação anterior e nova, motivo, reuniões canceladas), sem senha, documento
  nem o e-mail da conta moderada. `GET /api/admin/audit` não muda.

**Ganchos no código existente (os únicos):**

| Arquivo | Gancho | Motivo |
| --- | --- | --- |
| `auth/service/AuthService.java` | `login`: `moderationGate.checkLogin(user)` depois da autenticação | 403 para RECUSADO e SUSPENSO |
| `auth/service/AuthService.java` | `register`: `moderationGate.onAccountCreated(savedUser)` | PENDENTE quando `cadastro-requer-aprovacao=true`; com false não grava nada |
| `communication/service/ParticipantService.java` | `isActive`: `&& !accountVisibility.isHidden(id)` | tira a conta moderada da descoberta, dos perfis públicos e das contrapartes |
| `privacy/service/DataPrivacyService.java` | `deleteAccount`: `pitchPublicationRepository.deleteByUserId(userId)` | LGPD: a cópia do pitch sai junto com o onboarding |

Os quatro entram por setter `@Autowired(required = false)`, sem mudar construtor; quando a
dependência não existe (testes de unidade que montam a classe na mão), o comportamento é o
de antes. Para conta sem registro de moderação, as quatro rotas respondem igual.

**Justificativa:** tabela própria e setter opcional deixam o código do `main` intacto e
tornam o recurso removível sem migração de dados. O gancho único em `isActive` cobre todas
as listas públicas de uma vez, com a mesma semântica de conta excluída, em vez de quatro
filtros espalhados. Ler o conteúdo do onboarding evita que a startup publique algo
diferente do que salvou e mantém o front como único dono do formato das respostas.

**Consequências:**

- Conta moderada aparece como "Usuário removido" nas conversas, reuniões e avaliações já
  existentes dos outros, e mandar mensagem a ela responde o 409 de conta removida, enquanto
  durar a moderação.
- Token emitido antes da suspensão vale até expirar (até 60 minutos).
- Com pitch-requer-aprovacao=true, a startup que envia uma versão nova fica sem pitch
  público até a aprovação (o front avisa).
- A exportação de dados (T13) não inclui os envios do pitch (o conteúdo já sai no
  onboarding exportado).

**Impacto:** `db/migration/V30__cria_moderacao_de_contas_e_pitch.sql`; pacote novo
`moderation` (controllers `AdminModerationController` e `PitchPublicationController`,
serviços `AccountModerationService`, `PitchPublicationService`, `AccountModerationGate`,
`AccountVisibility`, `ModerationSettings`, `ModerationActions`); os quatro ganchos acima;
`application.properties`. Contrato em `docs/contrato/contrato-moderacao.md`. Testes:
`ModeracaoContasIntegrationTest`, `PitchPublicacaoIntegrationTest`,
`ModeracaoConfiguracaoInvertidaIntegrationTest`, `ModeracaoUnitTest`, `PitchConteudoTest`.
Front: ADR-013.


## D064: Exportação de dados com a moderação e os envios do pitch do titular

Autora: Carol
Data: 2026-11-22
Status: Aceita

**Contexto:** A D063 criou `account_moderation` e `startup_pitch_publication`. A exclusão de
conta (T13) já apagava os envios do pitch, mas `GET /api/privacy/export` não trazia nenhuma
das duas tabelas, e o registro de moderação ficava depois da exclusão. O RNF03 pede acesso e
exclusão coerentes: o que é apagado também deve poder ser exportado.

**Alternativas:**

- (a) Montar as duas partes dentro do `DataPrivacyService`, com mais dois repositórios
  injetados.
- (b) Um serviço pequeno no pacote `moderation` (`ModerationPrivacyData`) que monta os dados
  do titular e apaga os dois registros, injetado no `DataPrivacyService` pelo mesmo setter
  opcional da D063.

**Decisão:** (b).

- Duas chaves novas no fim do export, depois de `auditLog`; as 15 que já existiam ficam com o
  mesmo nome, ordem e tipo:
  - `moderation`: `{ status, hasRecord, reason, reviewedAt }`. Sem registro:
    `status` APROVADO e `hasRecord` false, como o sistema já interpreta. Nunca o e-mail
    nem o id do administrador que decidiu.
  - `pitchPublications`: envios do titular do mais recente para o mais antigo, com `id`,
    `version`, `status`, `submittedAt`, `reviewedAt`, `removalReason` (só quando REMOVIDO),
    `shortPitch`, `videoUrl` e `leanCanvas` (os nove blocos). Lista vazia para quem não é
    startup.
- Só o titular exporta os próprios dados (a regra do export não mudou); o ADMIN recebe só o
  dele.
- A exclusão de conta passa a apagar também o registro de `account_moderation`, além dos
  envios do pitch. O histórico das decisões continua no log de auditoria, sem dados da
  conta excluída.
- O setter da D063 em `DataPrivacyService` trocou o repositório do pitch pelo
  `ModerationPrivacyData`. Sem ele (testes de unidade que montam a classe na mão), o export
  devolve `moderation` sem registro e `pitchPublications` vazia, e a exclusão segue como antes.

**Justificativa:** mantém o `DataPrivacyService` com uma linha por chave, como já era, e
deixa num lugar só o que a moderação guarda sobre o titular, para a exportação e a exclusão
não divergirem.

**Impacto:** `privacy/service/DataPrivacyService.java` (método `export`, o setter e a linha
da exclusão), `moderation/service/ModerationPrivacyData.java` (novo),
`moderation/repository/StartupPitchPublicationRepository.java` (consulta por titular). Sem
migration. Teste: `ExportacaoModeracaoIntegrationTest`.


## Fora de escopo desta entrega (registrado, não implementado)

- Chat (`/api/conversations`): o produto decidiu que não há chat; o contato é externo,
  depois do match.
- Telefone e WhatsApp no perfil.
- Notificações em tempo real.
- Popularidade no ranking do back (a ordem da descoberta é só o score; D042).
- Revogar na hora o token de uma conta suspensa ou recusada (hoje vale até expirar; D063).
