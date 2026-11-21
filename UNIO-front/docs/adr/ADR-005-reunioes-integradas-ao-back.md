# ADR-005: Reuniões integradas ao /api/meetings, com o mock mantido como modo alternativo

- **Autora:** Carol
- **Data:** 2026-11-08
- **Status:** Aceita (regra de match e popup do unio atualizados pela ADR-009); modo mock substituído pela ADR-011.
- **Substitui em parte:** ADR-004 (a lacuna com o back e o "serviço único com mock")
- **Back:** D032 a D039 em `unio/docs/decisoes.md`, migration `V24__meetings_proposals.sql`,
  contrato em `unio/docs/contrato/contrato-comunicacao.md` (seção T09b)

> **Nota (2026-11-20, Carol):** o modo mock alternativo das reuniões deixou de existir. Substituída pela [ADR-011](ADR-011-producao-sem-mocks.md) nesse ponto; o resto desta ADR fica como histórico.

## Contexto

A tela de Reuniões (ADR-004) foi feita sobre um mock em `localStorage`, porque o back aceitava
um horário só. O fluxo da tela tem até 3 horários sugeridos, o aceite de um deles, "propor
outros horários", remarcar, assunto, mensagem, formato online ou presencial, link e local.

O back evoluiu de forma compatível (D032 a D039): `suggestedTimes`, `accept` com
`{ startsAt }`, `counter-proposal`, `PATCH details`, `counterparts`, formato e local, e uma
regra de conflito em que só reuniões CONFIRMADAS ocupam a agenda. Faltava ligar o front a ele
sem perder o mock, que continua sendo útil para demonstração e para quem roda só o front.

## Decisão

1. **Serviço em dois modos, escolhido por uma constante.** `services/api.ts` exporta
   `MOCK_BACKEND` (`VITE_MOCK_BACKEND === "true"`), a mesma usada para o `mockBackend.ts`.
   `services/reunioesService.ts` só decide e delega:
   - `reunioesService.mock.ts`: o mock de antes (localStorage, dados de exemplo, outra parte
     simulada);
   - `reunioesService.api.ts`: as mesmas funções e tipos, com o cliente axios `api`.

   As telas continuam importando só `reunioesService`. Uma interface no arquivo garante que os
   dois modos têm as mesmas funções.
2. **Mapeamento isolado.** `services/reunioes.mapping.ts` é o único lugar que conhece os nomes
   do back:
   - status: `PENDENTE`, `CONFIRMADA`, `RECUSADA` e `CANCELADA` viram os mesmos em minúsculas;
     `REALIZADA` vira `realizada` desde a [ADR-006](ADR-006-avaliacao-e-popularidade.md) (antes
     virava `confirmada`, que já está no passado);
   - campos: `subject` ↔ assunto, `message` ↔ mensagem, `format` ↔ formato (em maiúsculas no
     back), `suggestedTimes` ↔ horários, `meetingUrl` ↔ link e `location` ↔ local;
   - lados: `proposedByMe` vira `solicitante` ("eu" ou "outro") e `organizer` vira `organizador`.
     Uma pendente recebida é a que tem `solicitante: "outro"`;
   - o código `UNIO-####` é calculado no front a partir do id;
   - datas: sempre vão em UTC (`toISOString`) e são exibidas em America/Recife;
   - erros: `erroDaApi` transforma o 409 de agenda em "Esse horário já está ocupado para um dos
     participantes." e o 400 em erros por campo do front (`ErroReunioes.campos`). O modal de
     solicitação mostra esses erros no próprio campo.
3. **Contrapartes via `GET /api/meetings/counterparts`.**
   - O `contraparte.id` e o `unioId` passam a ser o `userId` do back, como texto.
   - `matchPercentual` vem do `matchScore` quando o scorecard já calculou o par; sem score, o
     selo de match não aparece.
   - `cargoEmpresa`, `selos` e `destaque` saem só do que o endpoint traz: tipo de investidor,
     segmento e estágio, e faixa de ticket. O que faltar fica de fora, sem texto inventado.
   - O link para o perfil (`perfilHref`) só existe no mock, porque as páginas de perfil ainda
     usam dados de exemplo.
   - Por isso `matchPercentual`, `cargoEmpresa` e `perfilHref` ficaram opcionais nos tipos.
     `participante` já era opcional.
4. **Notificações derivadas por polling.** O back não tem endpoint de notificações. Enquanto
   houver alguém assinando `assinarReunioes` (sidebar, sino ou página) e a aba estiver visível, o
   modo API busca `GET /api/meetings` a cada 30 segundos e compara com a última lista vista. Essa
   lista fica em `localStorage` por e-mail (`unio_reunioes_vistas_<email>`), com try/catch.
   - **Recebida:** uma pendente com `solicitante: "outro"` que não estava na última lista.
   - **Aceita, recusada e cancelada:** o status de uma reunião mudou.
   - **Proposta:** a outra parte devolveu a reunião com outros horários ou pediu para remarcar.

   As notificações ficam em `unio_reunioes_notificacoes_<email>` (no máximo 30). As ações do
   próprio usuário atualizam a lista vista na hora, então não viram notificação para ele. A
   bolinha da sidebar mostra quantas pendentes recebidas existem. As regras ficam em
   `services/reunioesNotificacoes.ts`, que é puro e tem teste.
5. **Conflito no front.** `detectarConflito` continua síncrono e usa as reuniões confirmadas já
   carregadas. O back só confirma o conflito no aceite (409) ou quando todos os horários estão
   ocupados (D034).
6. **Desfazer match (modo API).** Cancela as pendentes e as confirmadas futuras com a pessoa,
   uma chamada de `cancel` por reunião, com o mesmo aviso de antes.
7. **Sem dados de exemplo no modo API.** `mocks/reunioesMock.ts` só é usado pelo mock.

## Alternativas descartadas

- **Negociar os horários fora do back** (opção B da ADR-004): o front guardaria as propostas e
  enviaria só o horário aceito. Perde o histórico, não funciona entre dispositivos e não deixa a
  outra pessoa ver a proposta. Foi descartada quando o back passou a aceitar `suggestedTimes`.
- **WebSocket ou SSE para notificações:** o back não tem infraestrutura de tempo real e a D028
  já a deixou como trabalho futuro. O polling de 30 segundos é suficiente para reuniões, que não
  pedem resposta imediata.
- **Trocar o mock pela API de uma vez:** o mock continua útil para demonstração e para rodar o
  front sem o back. Os dois modos ficam atrás da mesma interface.

## Consequências

- Com `VITE_MOCK_BACKEND=true`, tudo funciona como antes (ADR-004). Sem a variável, a página
  usa o back de verdade.
- No modo API, a lista "Com quem" mostra todos os usuários do outro papel com perfil criado, e
  os textos da tela deixam de falar em match (`REUNIOES_EXIGEM_MATCH`).
- O popup do unio (Meus unios) ainda usa os ids dos dados de exemplo. No modo API, o atalho
  "Solicitar reunião" abre o modal sem pessoa pré-selecionada, e desfazer um match de exemplo
  não encontra reuniões reais.
- O funil da startup ("Reunião marcada") continua lendo o mock (`reunioesStore.ts`), porque a
  home da startup ainda usa dados de exemplo.
- São até 3 requisições a cada mudança (página, sidebar e sino). As chamadas simultâneas da
  lista completa são unificadas e as contrapartes ficam em memória por 60 segundos.

> **Atualização (2026-11-16, Carol, ADR-008 e ADR-009):**
> - O match mútuo agora existe no back (D049), e a reunião exige match nos dois modos
>   (D051, `REUNIOES_EXIGEM_MATCH = true`).
> - "Com quem" lista só quem deu match.
> - O popup do unio usa ids reais, e desfazer o match cancela no back as reuniões futuras
>   do par.
> - O funil "Reunião marcada" lê o back desde a ADR-007.
>
> As consequências acima sobre o modo API valem só para o histórico.

## Pendências

- ~~**Match mútuo no back** (D039): hoje a regra "só com match" vale apenas no mock.~~
  Resolvida pela D049 e D051 do back (ADR-009).
- **Notificações no back:** não há e-mail nem push. As notificações dependem de a aba estar
  aberta e ficam só no navegador onde foram vistas.
- **Tempo real:** o polling de 30 segundos atrasa os avisos.
- **Nome do investidor:** o perfil de investidor não tem nome. O back usa a parte do e-mail antes
  do `@` (`ParticipantService.displayName`).
- **UUID x Long no scorecard** (D018 e D025): o `matchScore` depende da conversão
  `new UUID(0, id)`.

## Arquivos

- Criados:
  - `src/services/reunioesService.api.ts`
  - `src/services/reunioes.mapping.ts`
  - `src/services/reunioesNotificacoes.ts`
  - `tests/reunioes.mapping.test.ts`
  - `tests/reunioesNotificacoes.test.ts`
- Renomeado: `src/services/reunioesService.ts` → `src/services/reunioesService.mock.ts`. O
  mapeamento antigo saiu do fim dele e foi para `reunioes.mapping.ts`.
- Novo `src/services/reunioesService.ts`: só decide o modo.
- Alterados:
  - `src/services/api.ts` (`MOCK_BACKEND`)
  - `src/types/reunioes.ts`
  - `src/utils/reunioes.ts` (`arquivoIcsDaReuniao`, usado pelos dois modos)
  - `src/components/reunioes/CartaoContraparte.tsx`
  - `src/components/reunioes/SolicitarReuniaoModal.tsx`
  - `src/pages/shared/PaginaReunioes.tsx`
  - comentários em `reunioesStore.ts` e `mocks/reunioesMock.ts`
