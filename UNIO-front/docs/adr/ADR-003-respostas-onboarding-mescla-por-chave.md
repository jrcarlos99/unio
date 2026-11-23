# ADR-003: Gravação no endpoint de onboarding sempre por mescla de chave

- **Status:** Aceita
- **Data:** 2026-11-07
- **Back:** `unio/docs/contrato/contrato-onboarding.md`, D028

## Contexto

`PUT /api/profile/onboarding` **substitui** o objeto `respostas` inteiro (até 20 KB). Várias
telas usam esse mesmo JSON livre, cada uma com a sua chave:

| Chave | Quem grava |
|---|---|
| `onboarding` | último passo do onboarding (este ADR) |
| `teamMembers` | `services/teamService.ts` |
| `startupDocuments` | `services/documentService.ts` |
| `profileVisibility` | `services/visibilityService.ts` |
| `investorProfileExtras` | `services/investorProfileService.ts` |
| `pitch`, `pitchLeanCanvas` | `services/pitchService.ts` |

Mandar só as respostas do wizard apagaria equipe, documentos, visibilidade e pitch.

## Decisão

Toda gravação nesse endpoint lê o objeto atual, troca só a própria chave e envia o objeto todo,
usando `services/onboardingAnswersStore.ts` (`updateAnswer` para uma chave, `updateAnswers` para
mais de uma), que também recusa o envio acima de 20 KB (`AnswersTooLargeError`).

As respostas do wizard ficam em `respostas.onboarding`:

```json
{ "perfil": "startup", "concluidoEm": "2026-11-07T21:00:00.000Z", "nome": "EcoTech", "segmento": "Fintech", "...": "..." }
```

A gravação acontece depois de o perfil ser criado, dentro de `try/catch`
(`salvarRespostasOnboardingNoBack` em `services/perfilOnboardingService.ts`), e não bloqueia nem
desfaz a criação do perfil. O `status` do endpoint não é enviado nesse fluxo; o status do wizard
continua no `localStorage`.

## Alternativas

- **Respostas do wizard no topo de `respostas`** (formato do exemplo do contrato). Misturaria
  campos do wizard com as chaves das outras telas e um `PUT` direto apagaria tudo.
- **Endpoint por chave no back.** Resolveria a concorrência, mas mexe no endpoint de onboarding,
  fora do escopo.

## Consequências

- Nenhuma tela apaga dados de outra.
- Continua existindo a corrida "ler, mudar, gravar": duas abas gravando ao mesmo tempo podem
  perder uma alteração. Risco baixo no uso atual; resolver no back se crescer.
- `teamService.ts` ainda tem a própria cópia de ler e gravar (mesma lógica de mescla); pode passar
  a usar `onboardingAnswersStore` depois.
- O consumidor de IA citado no Javadoc do `OnboardingService` (back) deve ler as respostas em
  `respostas.onboarding`, não no topo.

### Arquivos

- Criados: `src/services/perfilOnboardingService.ts` (`CHAVE_RESPOSTAS_ONBOARDING`,
  `salvarRespostasOnboardingNoBack`).
- Usado sem alteração nesta tarefa: `src/services/onboardingAnswersStore.ts`.
