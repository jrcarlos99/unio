# Especificação de Domínio — Scorecard de Matchmaking

Tarefa 1 do plano de implementação. Cobre os 6 enums, as 7 (ou 8 — ver nota)
entidades do MVP e as invariantes de negócio derivadas de D001–D017.

> ⚠️ **Status: rascunho para revisão.** Os valores dos enums abaixo são
> propostas minhas baseadas nos documentos existentes (critérios de
> compatibilidade, D005, D008, cadeia de eventos do documento de IA), não
> decisões já tomadas pelo grupo. Precisam de validação antes de virar
> código na Tarefa 2.
>
> **Decisão já tomada (D018):** `investorId` e `startupId` são `UUID`.
> Backend existente (auth/profile) ainda não tinha esse tipo definido;
> optou-se por UUID para evitar acoplamento a sequência incremental e por
> compatibilidade nativa com PostgreSQL/H2/Testcontainers. Ver seção 2.3,
> 2.4 e 2.5 abaixo.

## Legenda de status

A partir de 2026-09-12, todo item de decisão (enum, campo, invariante) leva
uma tag individual:

- 🟢 **DECIDIDO** — pode virar prompt de código sem checar de novo
- 🟡 **PROPOSTO** — ainda é sugestão minha ou de terceiro, não validada
  pelo grupo; NÃO deve virar prompt de código sem aviso explícito
- 🔴 **PENDENTE** — bloqueia algo à frente, precisa de decisão do grupo

Regra: se um item `🟡` já foi usado em código antes de virar `🟢` (como
aconteceu com os 6 enums na Tarefa 2), ele é revisado uma única vez e então
promovido a `🟢` (documentado como decisão formal) ou corrigido — nunca
fica em limbo indefinidamente.

---

## 0. Nota sobre contagem de entidades

D010 fixa "7 entidades" e lista:
`InvestorProfileType (enum), ScoreDimension (enum), CriticalityLevel (enum),
ScorePolicy, ScoreCriterion, MatchScore, MatchScoreFactor`.

Porém D002 e D008 tratam `FeedbackEvent` como entidade persistida própria
(com regra de deduplicação, campos definidos), e a Tarefa 13 do plano fala
em "persistência de feedback". `FeedbackEvent` está incluído neste documento
como 8ª entidade. Se o grupo preferir manter a contagem em "7" por qualquer
motivo (ex.: para efeito de relatório do TCC), isso deve ser uma decisão
explícita — sugiro registrar como D018 antes de fechar a Tarefa 1.

---

## 1. Enums

### 1.1 InvestorProfileType 🟢 DECIDIDO — confirmado idêntico ao código gerado (2026-09-12)
Define o tipo de perfil de investidor/mentor, usado para segmentar qual
`ScorePolicy` está ativa (D007: uma policy ativa por `InvestorProfileType`).

**Proposta de valores:**
- `ANGEL_INVESTOR` — investidor anjo individual
- `MENTOR` — mentor sem aporte direto de capital
- `VENTURE_CAPITAL` — fundo/VC (se o MVP cobrir esse perfil)

*Justificativa:* alinhado ao ator "Investidor Anjo / Mentor" do documento de
requisitos geral. Se o MVP acadêmico só cobrir investidor anjo, os outros
dois podem ficar fora do MVP e voltar como trabalho futuro (D011).

### 1.2 ScoreDimension 🟢 DECIDIDO — confirmado idêntico ao código gerado (2026-09-12)
Dimensão de avaliação de compatibilidade. Peso é sempre derivado da soma
dos pesos dos critérios ativos daquela dimensão na policy ativa (D001, D004).

**Proposta de valores** (baseados nos critérios de compatibilidade do
documento de IA — 1ª AV):
- `SEGMENTO`
- `ESTAGIO`
- `CAPITAL`
- `REGIAO`
- `MODELO_NEGOCIO`
- `PERFIL_RISCO_CRESCIMENTO`

### 1.3 CriticalityLevel 🟢 DECIDIDO — confirmado idêntico ao código gerado (2026-09-12)
Criticidade de um critério dentro de uma policy. Usado para o código de
erro `CRITICAL_CRITERION_VIOLATED` (D009).

**Proposta de valores:**
- `CRITICAL` — viola → bloqueia o match (gera `CRITICAL_CRITERION_VIOLATED`)
- `HIGH`
- `MEDIUM`
- `LOW`

### 1.4 MatchScoreFactorType 🟢 DECIDIDO — implícito em D003/D005, baixo risco
Tipo de fator explicativo do score (D003, D005).

**Valores** (já implícitos nas decisões, baixo risco de mudança):
- `POSITIVE`
- `ATTENTION`

*Invariante:* no máximo 3 `POSITIVE` e 3 `ATTENTION` por `MatchScore`
(regra citada na Tarefa 1 do plano).

### 1.5 FeedbackAction 🟢 DECIDIDO — confirmado idêntico ao código gerado (2026-09-12)
Ação de feedback do investidor sobre uma startup, usada na deduplicação
(D008: dedup por investorId + startupId + scorePolicyId + action, janela
de 5 min).

**Proposta de valores** (alinhados à cadeia de eventos do documento de IA,
item 12 — "Plano de coleta futura" — o que cria uma ponte útil entre este
módulo e o futuro trabalho de dados/IA):
- `VIEWED`
- `INTERESTED`
- `NOT_INTERESTED`
- `CONNECTION_ACCEPTED`
- `MEETING_HELD`
- `PROPOSAL_SENT`
- `INVESTMENT_MADE`

### 1.6 MatchScoreClassification 🟢 DECIDIDO — confirmado idêntico ao código gerado (2026-09-12)
Classificação final do score (campo `MatchScore.classification`, Tarefa 8
do plano).

**Proposta de valores:**
- `HIGH_COMPATIBILITY`
- `MODERATE_COMPATIBILITY`
- `LOW_COMPATIBILITY`
- `NOT_RECOMMENDED` — normalmente associado a violação de critério `CRITICAL`

---

> **Decisão já tomada (D019):** o `id` (PK técnica) de todas as 5 entidades
> é `Long` com `GenerationType.IDENTITY`. Diferente de D018 — que trata dos
> identificadores de negócio (`investorId`/`startupId`, vindos de outro
> módulo) — esta é a chave técnica interna de cada tabela do scorecard.
> Resolvido implicitamente pelo Copilot na Tarefa 2 e formalizado aqui em
> 2026-09-12.

## 2. Entidades 🟢 DECIDIDO — revisado campo a campo contra o código gerado na Tarefa 2 (2026-09-12), sem divergências

### 2.1 ScorePolicy
Representa uma versão de política de scoring para um `InvestorProfileType`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID / Long | sim | PK |
| investorProfileType | enum `InvestorProfileType` | sim | perfil ao qual a policy se aplica |
| version | int | sim | número da versão (D007) |
| active | boolean | sim | apenas uma `active=true` por `investorProfileType` |
| name | String | não | rótulo legível |
| createdAt | timestamp | sim | auditoria |

**Invariante:** ao criar uma policy com `active=true`, a anterior do mesmo
`investorProfileType` é desativada automaticamente (D007). MatchScores
antigos continuam referenciando a policy antiga (não é reprocessado).

### 2.2 ScoreCriterion
Critério individual de avaliação, pertence a exatamente uma `ScorePolicy`
e a exatamente uma `ScoreDimension`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID / Long | sim | PK |
| scorePolicyId | FK → ScorePolicy | sim | policy à qual pertence |
| dimension | enum `ScoreDimension` | sim | dimensão do critério (D003) |
| code | String | sim | identificador único do critério (ex.: `SEGMENTO_MATCH_EXATO`) |
| label | String | sim | rótulo legível (para explicação) |
| weight | BigDecimal | sim | peso do critério dentro da dimensão |
| criticality | enum `CriticalityLevel` | sim | criticidade (D009) |
| active | boolean | sim | se está em uso na policy |

**Invariante:** peso da dimensão = soma dos pesos dos `ScoreCriterion.weight`
ativos daquela dimensão, dentro da policy ativa — **nunca persistido**,
sempre calculado em tempo de leitura/uso (D001, D004).

### 2.3 MatchScore
Resultado de score calculado para um par (startup, investidor) sob uma
policy específica.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID / Long | sim | PK |
| investorId | UUID (referência externa) | sim | id do investidor (módulo profile) — D018 |
| startupId | UUID (referência externa) | sim | id da startup (módulo profile) — D018 |
| scorePolicyId | FK → ScorePolicy | sim | policy usada no cálculo |
| totalScore | BigDecimal | sim | score final agregado |
| classification | enum `MatchScoreClassification` | sim | classificação final |
| calculatedAt | timestamp | sim | data do último cálculo |

**Constraint:** único por `(investorId, startupId, scorePolicyId)` — D006:
`POST /calculate` sempre recalcula e **atualiza** o registro existente para
esse trio, nunca cria histórico. `recalculated: boolean` é campo de
**resposta da API**, não persistido na entidade.

### 2.4 MatchScoreFactor
Fator individual que compõe a explicação de um `MatchScore`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID / Long | sim | PK |
| matchScoreId | FK → MatchScore | sim | score ao qual pertence |
| dimension | enum `ScoreDimension` | sim | dimensão do fator (D003) |
| type | enum `MatchScoreFactorType` | sim | POSITIVE ou ATTENTION (D005) |
| rank | int | sim | ordenação dentro do tipo |
| factorCode | String | sim | identificador do critério de origem |
| factorLabel | String | sim | rótulo legível |
| factorScore | BigDecimal | sim | contribuição numérica |
| weightApplied | BigDecimal | sim | peso efetivamente aplicado |
| explanation | String/Text | sim | texto explicativo |

**Invariante:** no máximo 3 registros `POSITIVE` e 3 `ATTENTION` por
`MatchScore` (Tarefa 1 do plano). `dimensions[].factors[]` sempre presentes
em `explanation` e `calculate`; opcional em `recommendations` — mas
`topPositiveFactors[]`/`topAttentionFactors[]` sempre no nível raiz (D005).

### 2.5 FeedbackEvent *(ver nota da seção 0)*
Registro de ação do investidor sobre uma startup, desacoplado de
`MatchScore` para não perder histórico em caso de recálculo.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID / Long | sim | PK |
| investorId | UUID | sim | id do investidor — D018 |
| startupId | UUID | sim | id da startup — D018 |
| scorePolicyId | FK → ScorePolicy | sim | policy vigente no momento do feedback |
| action | enum `FeedbackAction` | sim | ação registrada |
| createdAt | timestamp | sim | usado na janela de deduplicação |

**Invariantes:**
- **Sem FK para `MatchScore`** (D002) — feedback é sobre a decisão do
  investidor, não sobre uma linha específica de score.
- Deduplicação: mesmo `(investorId, startupId, scorePolicyId, action)` em
  janela de 5 minutos é bloqueado com `FEEDBACK_DUPLICATE (409)`; fora da
  janela, sempre registra novo evento, mesmo que repita a ação (D008).
- Persistido sem recalibração automática de policy/pesos no MVP (D010) —
  recalibração em batch é trabalho futuro (D011).

---

## 3. Invariantes de negócio (consolidado)

1. Um `ScoreCriterion` pertence a exatamente uma `ScoreDimension` e a
   exatamente uma `ScorePolicy`.
2. Peso de uma `ScoreDimension` = soma dos pesos dos `ScoreCriterion` ativos
   daquela dimensão na policy ativa; nunca persistido (D001, D004).
3. No máximo uma `ScorePolicy` com `active=true` por `InvestorProfileType`
   (D007).
4. `MatchScoreFactor`: no máximo 3 `POSITIVE` + 3 `ATTENTION` por
   `MatchScore`.
5. `POST /calculate` sempre recalcula e atualiza o `MatchScore` existente
   para `(investorId, startupId, scorePolicyId)` — sem histórico de scores
   no MVP (D006).
6. `FeedbackEvent` não referencia `MatchScore` diretamente (D002).
7. Deduplicação de feedback: mesmo
   `(investorId, startupId, scorePolicyId, action)` em janela de 5 min
   → `FEEDBACK_DUPLICATE (409)` (D008).
8. Violação de critério `CRITICAL` → `CRITICAL_CRITERION_VIOLATED (422)` e
   tende a levar `classification` para `NOT_RECOMMENDED` (regra a confirmar
   na Tarefa 8).
9. Todos os erros de negócio seguem a tabela de códigos estruturados (D009).

---

## 4. Pendências para fechar a Tarefa 1

- [ ] Validar/ajustar valores propostos dos 6 enums (seção 1) — ✅ feito em
  2026-09-12, todos promovidos a 🟢 DECIDIDO
- [ ] Decidir se `FeedbackEvent` entra formalmente na contagem de entidades
  (registrar como D020 se sim — nota: D019 já foi usado para a decisão
  de PK técnica)
- [ ] Confirmar regra exata de como `CriticalityLevel.CRITICAL` afeta
  `MatchScoreClassification` (invariante 8 ainda é rascunho)
- [x] `investorId`/`startupId` são `UUID` (D018 — resolvido em 2026-09-12)