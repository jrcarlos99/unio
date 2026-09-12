# Contexto do Projeto — Scorecard de Matchmaking

## Escopo travado
- 7 entidades, 3 serviços, 6 endpoints REST
- Java + Spring Boot + Maven (integrado ao backend existente)
- H2 em dev + Testcontainers PostgreSQL em testes + PostgreSQL em prod
- Flyway para migrations
- Package by feature + core compartilhado

## Decisões travadas (D001–D016)
- D001: ScoreDimension é enum; peso derivado dos critérios
- D002: FeedbackEvent sem FK para MatchScore
- D003: MatchScoreFactor tem campo dimension
- D004: peso da dimensão derivado, não persistido
- D005: top factors sempre no nível raiz
- D006: POST /calculate recalcula e atualiza
- D007: active=true desativa policy anterior
- D008: feedback duplicado em janela de 5 min
- D009: códigos de erro estruturados
- D010: escopo do MVP travado
- D011: trabalho futuro documentado
- D012: banco = H2 dev + Testcontainers + PostgreSQL prod
- D013: stack = Java + Spring Boot
- D014: build tool = Maven
- D015: estrutura de pacotes = feature-first + core compartilhado
- D016: migrations = Flyway
- (ver `docs/decisoes.md` para detalhe completo)

## Contrato de API
- 6 endpoints REST
- Ver `docs/contrato/contrato-v2.md` para payloads

## Progresso atual
- [x] Contrato v2 aprovado
- [x] Setup definido
- [ ] Bloco A — Fundação (em andamento)

## Próximo passo
Tarefa 0 — gerar estrutura de pastas, build e configuração.

## Regras desta conversa
- Não gerar código sem OK explícito
- Se algo for ambíguo, perguntar antes
- Respeitar decisões D001–D018
- Todo item de decisão usa tag 🟢/🟡/🔴 (ver docs/dominio.md);
  só itens 🟢 viram prompt de código sem aviso explícito

## Arquivos de contexto adicionais
- `AGENTS.md` (raiz) — instruções automáticas para o Copilot no IntelliJ
- `docs/decisoes.md` — decisões detalhadas (D001–D018)
- `docs/estado-atual.md` — progresso do projeto
- `docs/implementacao/plano-tarefas.md` — 17 tarefas (Tarefa 0 a Tarefa 16)
- `docs/contrato/contrato-v2.md` — contrato ativo da API