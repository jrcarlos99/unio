# ADR-002: Mapeamento das respostas do onboarding para os DTOs do back

- **Status:** Aceita
- **Data:** 2026-11-07
- **Back:** D028 (onboarding cria o perfil), D029 (capital e tickets opcionais), D030
  (`perfilRisco` com padrão) em `unio/docs/decisoes.md`

## Contexto

O onboarding pergunta faixas em texto ("R$ 50 a 200 mil"), disponibilidade em português e várias
regiões, enquanto `StartupCreateRequest` e `InvestorCreateRequest` esperam números, o enum
`DisponibilidadeMentoria` e uma string só em `regiaoInteresse`. O back também exige `nome` da
startup, que o onboarding não perguntava.

## Decisão

Funções puras em `src/services/perfilFromOnboarding.ts` (`montarPayloadStartup`,
`montarPayloadInvestidor`, `validarPayloadStartup`, `validarPayloadInvestidor`), com as tabelas
em constantes nomeadas. O corpo nunca leva `undefined` nem `NaN`: campo sem valor é omitido.

### Startup (`POST /api/profile/startup`)

| Resposta | Campo | Regra |
|---|---|---|
| `nome` (novo, passo 1, obrigatório) | `nome` | `trim`, até 255 |
| `segmento`, `estagio`, `modeloNegocio` | iguais | direto |
| `localizacao`, `mercadoAlvo` | iguais | `trim`, até 255 |
| `capitalProcurado` (faixa) | `capitalProcurado` | `CAPITAL_PROCURADO_POR_FAIXA`, só se "Investimento" estiver nas necessidades |
| `pitch` (até 140) | `pitchCanvas` (TEXT) | `trim`, omitido se vazio |
| (não perguntado) | `disponibilidade` | omitido |

`CAPITAL_PROCURADO_POR_FAIXA`: "Até R$ 50 mil" = 25 000; "R$ 50 a 200 mil" = 125 000;
"R$ 200 a 500 mil" = 350 000; "Acima de R$ 500 mil" = 500 000 (piso, sem teto).

### Investidor (`POST /api/profile/investor`)

| Resposta | Campo | Regra |
|---|---|---|
| `segmentosInteresse`, `estagiosInteresse` | iguais | listas |
| `ticketMedio` (faixa) | `ticketMinimo` e `ticketMaximo` | `TICKETS_POR_FAIXA`; sem faixa (mentor) os dois são omitidos |
| `apenasMentor` | `perfilRisco` | `"Mentor"` se verdadeiro, senão `"Investidor Anjo"` (valores de `TIPOS_PERFIL`) |
| `disponibilidade` | `disponibilidade` | `DISPONIBILIDADE_PARA_BACK`: Baixa = `BAIXA`, Média = `MEDIA`, Alta = `ALTA` |
| `regioesInteresse` | `regiaoInteresse` | juntas por `,` (`SEPARADOR_REGIOES`), omitido se vazio |
| (não existe no DTO) | `nome` | não enviado |

`TICKETS_POR_FAIXA`: "Até R$ 50 mil" = 10 000 a 50 000; "R$ 50 a 200 mil" = 50 000 a 200 000;
"R$ 200 a 500 mil" = 200 000 a 500 000; "Acima de R$ 500 mil" = 500 000 a 1 000 000.

`perfilRisco` continua sendo enviado mesmo com o padrão do back (D030). Hoje qualquer valor leva à
política `ANGEL_INVESTOR` (D025, item 2), inclusive `"Mentor"`.

### Validação antes do envio

As mesmas regras do back: textos obrigatórios da startup até 255 caracteres; capital e tickets
positivos quando presentes; mínimo não maior que máximo; listas do investidor cabendo nas colunas
`VARCHAR(255)`. Com erro, a faixa do último passo mostra a mensagem e nada é enviado.

## Alternativas

- **Valor sentinela (1) para capital/ticket ausente.** Grava dado falso e derruba o `CAPITAL_FIT`,
  que é crítico: o par sairia das recomendações (detalhado na D029).
- **Mínimo da faixa como capital procurado.** Subestima a startup; o meio da faixa cai dentro do
  ticket do investidor da mesma faixa, o que dá `CAPITAL_FIT` 100 para quem escolheu igual.
- **Regiões separadas por ", ".** Funciona (o back faz `trim`), mas `,` é o mesmo formato que o
  back usa para `segmentosInteresse`.

## Consequências

- Startup sem investimento e mentor sem ticket recebem `CAPITAL_FIT` 50 (neutro), sem violação
  crítica.
- O que o DTO não tem (necessidades, tração, tamanho da equipe, preferências, formas de interação,
  consentimento) fica só em `respostas.onboarding` (ADR-003).
- Startup criada sem capital podia ficar presa no editor de perfil, que exigia capital. O editor
  passou a aceitar o campo vazio e envia `null` quando a pessoa limpa o valor.
- Testes: `tests/perfilFromOnboarding.test.ts` (`npm test`, `node:test` com
  `--experimental-strip-types`, sem dependência nova). Por isso `perfilFromOnboarding.ts` só tem
  `import type`.

### Arquivos

- Criados: `src/services/perfilFromOnboarding.ts`, `tests/perfilFromOnboarding.test.ts`.
- Alterados: `src/types/onboarding.ts` (`nome` em `RespostasStartup`),
  `src/pages/onboarding/startup/config.ts`, `PassoSegmento.tsx` (campo nome),
  `PassoLocalizacao.tsx` e `PassoModelo.tsx` (limite de 255), `src/pages/onboarding/OnboardingStartup.tsx`
  (resumo do passo 1), `src/utils/startupProfile.ts`, `src/types/startupProfile.ts`,
  `src/components/profile/CompanyDataCard.tsx` (capital opcional), `src/services/mockBackend.ts`
  (validação igual à do back), `src/services/onboarding.mapping.ts`, `package.json` (script `test`).
