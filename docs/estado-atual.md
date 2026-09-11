# Estado Atual do Projeto — Scorecard de Matchmaking

Última atualização: 2026-09-11

## Resumo

Backend de matching entre startups e investidores com scorecard explicável,
configurável e versionável. Projeto acadêmico com potencial de virar produto.

## Escopo travado do MVP

- 7 entidades: InvestorProfileType (enum), ScoreDimension (enum),
  CriticalityLevel (enum), ScorePolicy, ScoreCriterion, MatchScore,
  MatchScoreFactor
- 3 serviços: ScoreCalculatorService, ExplanationService, RecommendationService
- 6 endpoints REST (contrato v2)
- Feedback persistido sem recalibração
- Versionamento simples (version + active) na policy

## Documentos do projeto

- `docs/decisoes.md` — 11 decisões de design (D001–D011)
- `docs/contrato/contrato-v2.md` — contrato ativo da API
- `docs/implementacao/plano-tarefas.md` — 17 tarefas (Tarefa 0 a Tarefa 16)
- `docs/dominio.md` — a ser criado na Tarefa 1

## Progresso

- [x] Contrato v2 aprovado
- [x] Setup definido
- [x] Bloco A — Fundação
  - [x] Tarefa 0 — Setup do projeto (concluída em 2026-09-11)
  - [ ] Tarefa 1 — Especificação de domínio (próxima)
- [ ] Bloco B — Policy e seed
- [ ] Bloco C — Cálculo e explicabilidade
- [ ] Bloco D — Recomendação e feedback
- [ ] Bloco E — Testes

## Próximo passo

Tarefa 0 — Setup do projeto.
Aguardando definição de stack (Java/Spring? Kotlin? Outro?) antes de gerar código.

## Fora do MVP (trabalho futuro)

Ver D011 em `docs/decisoes.md`.