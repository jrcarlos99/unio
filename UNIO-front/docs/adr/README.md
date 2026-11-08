# Registros de decisão (ADR) do front

Cada decisão de arquitetura ou de fluxo que muda o comportamento do front vira um
arquivo `ADR-NNN-titulo-curto.md` nesta pasta. Decisões do back ficam em
`unio/docs/decisoes.md` (D001, D002...) e são citadas pelo número.

## Formato

```markdown
# ADR-NNN: Título

- **Status:** Proposta | Aceita | Substituída por ADR-XXX
- **Data:** AAAA-MM-DD

## Contexto
O problema e as restrições.

## Decisão
O que foi decidido.

## Alternativas
O que foi considerado e por que não foi escolhido.

## Consequências
O que muda, o que fica pendente e os arquivos afetados.
```

## Índice

| ADR | Título | Status |
|-----|--------|--------|
| [ADR-001](ADR-001-onboarding-cria-perfil.md) | Onboarding como único caminho de criação de perfil | Aceita |
| [ADR-002](ADR-002-mapeamento-onboarding-dtos.md) | Mapeamento das respostas do onboarding para os DTOs do back | Aceita |
| [ADR-003](ADR-003-respostas-onboarding-mescla-por-chave.md) | Gravação no endpoint de onboarding sempre por mescla de chave | Aceita |
| [ADR-004](ADR-004-reunioes.md) | Reuniões entre unios com mock no front e mapeamento isolado para /api/meetings | Proposta |
