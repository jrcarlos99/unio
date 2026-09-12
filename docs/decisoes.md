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
+ core mínimo compartilhado (scorecard.common, scorecard.api).

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