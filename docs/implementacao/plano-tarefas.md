# Plano de Implementação (ordem exata)

Este plano organiza a implementação do backend de scorecard de matchmaking em
tarefas pequenas (1–2 dias), agrupadas por blocos lógicos e em ordem estrita
de execução.

---

## A. Fundação (enums, entidades, repositórios)

### Tarefa 0 — Setup do projeto

**Objetivo:** preparar estrutura base para o módulo scorecard.
**Entregável:** pacotes criados, dependências configuradas, banco dev/test, migrations habilitadas.
**Dependências:** nenhuma.
**Critério de pronto:** `mvn test` (ou `gradle test`) roda vazio sem erro, banco sobe, migration inicial criada.

### Tarefa 1 — Especificação de domínio

**Objetivo:** documentar em `docs/dominio.md`:
- Os 6 enums (InvestorProfileType, ScoreDimension, CriticalityLevel,
  MatchScoreFactorType, FeedbackAction, MatchScoreClassification)
- As 7 entidades com campos, tipos, obrigatoriedade, relacionamentos
- Invariantes de negócio (ex.: "um critério pertence a exatamente uma dimensão",
  "peso da dimensão = soma dos pesos dos critérios ativos",
  "uma policy ativa por InvestorProfileType",
  "MatchScoreFactor tem no máximo 3 POSITIVE e 3 ATTENTION por MatchScore")

**Entregável:** `docs/dominio.md`.
**Dependências:** nenhuma.
**Critério de pronto:** documento revisado, sem ambiguidade, cobre todas as decisões D001–D011.

### Tarefa 2 — Modelar entidades persistentes (sem lógica de negócio)

**Objetivo:** estruturar entidades ScorePolicy, ScoreCriterion, MatchScore, MatchScoreFactor e referências de feedback.
**Entregável:** modelos de persistência prontos com campos aprovados (incluindo `classification`, `dimension`, `type`, `rank`, etc.).
**Dependências:** Tarefa 1.
**Critério de pronto:** mapeamento completo de campos e relacionamentos, incluindo versionamento simples (`version`, `active`).

### Tarefa 3 — Criar camada de repositórios e contratos de acesso

**Objetivo:** definir operações CRUD/consulta necessárias para o MVP.
**Entregável:** interfaces de repositório por agregado (policy, criteria, score, factors, feedback).
**Dependências:** Tarefa 2.
**Critério de pronto:** todos os casos de acesso previstos para endpoints e serviços estão cobertos por contratos claros.

### Tarefa 3.5 — Migrations e schema do banco

**Objetivo:** criar migrations que materializam o schema das 7 entidades.
**Entregável:** scripts de migration versionados (ex.: V1__create_scorecard_tables.sql).
**Dependências:** Tarefa 2 (modelagem de entidades).
**Critério de pronto:** `mvn flyway:migrate` (ou equivalente) cria o schema completo do zero em um banco vazio, e a suíte de repositórios (Tarefa 3) passa.

---

## B. Policy e seed inicial

### Tarefa 4 — Implementar fluxo de versionamento de policy (simples)

**Objetivo:** garantir criação/ativação de policy com apenas uma versão ativa por tipo de investidor.
**Entregável:** regras de ciclo de vida de policy aplicadas na camada de aplicação.
**Dependências:** Tarefa 3.
**Critério de pronto:** criação de nova versão funciona e desativação da anterior ocorre de forma consistente.

### Tarefa 5 — Implementar gestão de critérios por policy

**Objetivo:** permitir cadastro/edição/ativação de critérios ligados à policy.
**Entregável:** operações para manter critérios ativos/inativos e sua criticidade.
**Dependências:** Tarefa 4.
**Critério de pronto:** critérios refletem corretamente estado ativo e vínculo de versão da policy.

### Tarefa 6 — Seed inicial de policy/criteria do contrato v2

**Objetivo:** disponibilizar configuração inicial mínima para cálculo do MVP.
**Entregável:** rotina de seed idempotente com policy ativa e critérios iniciais por perfil.
**Dependências:** Tarefa 5.
**Critério de pronto:** ambiente novo sobe com policy funcional e pronta para cálculo sem ajustes manuais.

---

## C. Cálculo e explicabilidade

### Tarefa 7 — Estruturar pipeline do ScoreCalculatorService

**Objetivo:** orquestrar fluxo: carregar policy ativa → avaliar critérios → compor score.
**Entregável:** fluxo de cálculo end-to-end com entrada/saída compatível com contrato v2.
**Dependências:** Tarefa 6.
**Critério de pronto:** geração de MatchScore e fatores ocorre de ponta a ponta de forma determinística.

### Tarefa 8 — Implementar cálculo por dimensão e classificação final

**Objetivo:** aplicar regra de peso derivado dos critérios ativos por `ScoreDimension` e classificar resultado.
**Entregável:** motor de agregação por dimensão + classificação em `MatchScore.classification`.
**Dependências:** Tarefa 7.
**Critério de pronto:** score final e classificação batem com cenários de referência definidos pelo time.

### Tarefa 9 — Persistir fatores explicáveis (MatchScoreFactor)

**Objetivo:** registrar fatores positivos e de atenção com ordenação e rastreabilidade.
**Entregável:** geração/persistência de factors com `type`, `rank`, `factorCode`, `factorLabel`, `factorScore`, `weightApplied`, `dimension`, `explanation`.
**Dependências:** Tarefa 8.
**Critério de pronto:** cada score salvo possui fatores auditáveis e ordenados para consumo externo.

### Tarefa 10 — Implementar ExplanationService

**Objetivo:** entregar explicação textual/estruturada do score com base nos fatores persistidos.
**Entregável:** serviço de explicabilidade para detalhamento por dimensão e resumo final.
**Dependências:** Tarefa 9.
**Critério de pronto:** endpoint de explicação retorna narrativa consistente com os fatores e classificação.

---

## D. Recomendação e feedback

### Tarefa 11 — Implementar RecommendationService

**Objetivo:** transformar score/classificação/fatores em recomendação acionável.
**Entregável:** motor de recomendação com saída padronizada por faixa de compatibilidade.
**Dependências:** Tarefa 10.
**Critério de pronto:** recomendações são reproduzíveis e coerentes com score + explicação.

### Tarefa 12 — Publicar endpoints de cálculo/explicação/recomendação (v2)

**Objetivo:** expor os 6 endpoints REST do contrato aprovado com validações básicas.
**Entregável:** camada API v2 integrada aos serviços.
**Dependências:** Tarefa 11.
**Critério de pronto:** todos os endpoints respondem no formato do contrato v2 e encadeiam corretamente os serviços.

### Tarefa 13 — Implementar persistência de feedback sem recalibração

**Objetivo:** registrar feedback referenciando `investorId + startupId + scorePolicyId`, sem FK para MatchScore.
**Entregável:** fluxo completo de entrada e armazenamento de feedback.
**Dependências:** Tarefa 12.
**Critério de pronto:** feedback fica armazenado e consultável sem alterar políticas, pesos ou resultados históricos.

---

## E. Testes do MVP

### Tarefa 14 — Testes unitários de domínio e serviços

**Objetivo:** validar regras críticas (versionamento, cálculo por dimensão, classificação, fatores, recomendação).
**Entregável:** suíte unitária mínima por componente-chave.
**Dependências:** Tarefas 8–13.
**Critério de pronto:** casos normais e de borda principais cobertos com resultados esperados estáveis.

### Tarefa 15 — Testes de integração dos 6 endpoints v2

**Objetivo:** garantir contrato, persistência e encadeamento entre API, serviços e dados.
**Entregável:** suíte de integração do fluxo principal (policy→score→explanation→recommendation→feedback).
**Dependências:** Tarefa 14.
**Critério de pronto:** fluxo MVP completo passa de forma repetível em ambiente local/CI.

### Tarefa 16 — Hardening final do MVP acadêmico-produto

**Objetivo:** fechar prontidão mínima de entrega.
**Entregável:** checklist de qualidade (erros de validação, observabilidade básica, consistência de respostas, documentação operacional curta).
**Dependências:** Tarefa 15.
**Critério de pronto:** MVP executável, testado e pronto para início de piloto controlado.