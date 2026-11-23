# Registros de decisão (ADR) do front

Cada decisão de arquitetura ou de fluxo que muda o comportamento do front vira um
arquivo `ADR-NNN-titulo-curto.md` nesta pasta. Decisões do back ficam em
`unio/docs/decisoes.md` (D001, D002...) e são citadas pelo número.

## Formato

```markdown
# ADR-NNN: Título

- **Autora:** Nome
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
| [ADR-004](ADR-004-reunioes.md) | Reuniões entre unios com mock no front e mapeamento isolado para /api/meetings | Superada em parte pela ADR-005; mock substituído pela ADR-011 |
| [ADR-005](ADR-005-reunioes-integradas-ao-back.md) | Reuniões integradas ao /api/meetings, com o mock mantido como modo alternativo | Aceita (status REALIZADA pela ADR-006; regra de match pela ADR-009; modo mock substituído pela ADR-011) |
| [ADR-006](ADR-006-avaliacao-e-popularidade.md) | Avaliação pós-reunião só com nota, popularidade em porcentagem e fluxo "Compareci" | Aceita (modo API pela ADR-007; interesses reais pela ADR-008; modo mock substituído pela ADR-011) |
| [ADR-007](ADR-007-ids-reais-e-dados-de-exemplo.md) | Só ids reais vão ao back; avaliação, popularidade, gate de onboarding e dashboard no modo API | Aceita (exemplos reduzidos pelas ADR-008 a ADR-010 e removidos pela ADR-011) |
| [ADR-008](ADR-008-descoberta-interesse-e-salvos-em-dois-modos.md) | Descoberta, interesse, match e salvos em dois modos, com mapeamento isolado | Aceita (modo mock substituído pela ADR-011) |
| [ADR-009](ADR-009-reuniao-so-com-match-contato-e-dashboard.md) | Reunião só com match nos dois modos, contato só por e-mail e dashboard com dados reais | Aceita (modo mock substituído pela ADR-011) |
| [ADR-010](ADR-010-admin-e-privacidade-no-modo-api.md) | Admin com métricas e auditoria do back; privacidade e dados no Meu perfil | Aceita (modo mock substituído pela ADR-011) |
| [ADR-011](ADR-011-producao-sem-mocks.md) | Front só com o back da nuvem, sem mocks e sem dados de exemplo | Aceita |
| [ADR-012](ADR-012-unificacao-com-o-main.md) | Front da linha da Carol no merge com o main | Aceita |
| [ADR-013](ADR-013-moderacao-e-pitch-publicado.md) | Moderação no admin e pitch publicado para o investidor | Aceita |
| [ADR-014](ADR-014-admin-com-o-layout-e-os-componentes-do-app.md) | Admin com o mesmo layout e os mesmos componentes do app | Aceita |

Auditoria de integração front x back: [`docs/integracao/auditoria-front-back.md`](../integracao/auditoria-front-back.md).
