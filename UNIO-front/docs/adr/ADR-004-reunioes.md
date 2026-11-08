# ADR-004: Reuniões entre unios com mock no front e mapeamento isolado para /api/meetings

- **Status:** Proposta
- **Data:** 2026-11-08
- **Back:** branch `feat/p2-comunicacao-lgpd-qualidade` (`communication/MeetingController`, `V20__create_meetings.sql`), lida sem alterações

## Contexto

A rota `/reunioes` mostrava só "Em breve". O produto pede reuniões apenas entre quem deu match
(status `match`), sem chat nem vídeo na plataforma: a reunião tem data, horário e um link
(online) ou local (presencial). Ciclo: quem solicita sugere até 3 horários; o outro lado aceita
um, propõe outros ou recusa; a confirmada pode ser remarcada, cancelada ou exportada em `.ics`.

O back em desenvolvimento (`/api/meetings`, ainda não está na `main`) tem:

| Back | Front (`types/reunioes.ts`) |
|---|---|
| `PENDENTE`, `CONFIRMADA`, `RECUSADA`, `CANCELADA`, `REALIZADA` | `pendente`, `confirmada`, `recusada`, `cancelada` |
| `startsAt` (um horário só) | `horariosSugeridos` (até 3) + `horarioConfirmado` |
| `durationMinutes` de 15 a 240 | `duracaoMin` 30, 45 ou 60 (cabe na faixa) |
| `meetingUrl` opcional, só `https://` | `link` opcional, validado com `new URL` e só https |
| sem campo de local | `local { nome, endereco, referencia? }` |
| `title`, `agenda` (até 2000) | `assunto` (4 opções), `mensagem` (até 280), `pauta` |
| conflito de agenda devolve **409** e bloqueia | conflito só **avisa**, nunca bloqueia |
| `accept` só pelo convidado; sem contraproposta | quem responde é sempre o outro lado da proposta vigente; "propor" devolve a solicitação |

## Decisão

1. **Serviço único com mock:** `src/services/reunioesService.ts` é o único ponto de dados das
   telas (Reuniões, popup do unio, sidebar, sino). Todas as funções já devolvem `Promise`; trocar
   o mock pela API é reimplementar cada função, sem mudar as telas. Persistência do mock em
   `localStorage` por e-mail (`unio_reunioes_<email>`, em `reunioesStore.ts`), com `try/catch`.
2. **Mapeamento isolado:** `toBackStatus`, `fromBackStatus` (`REALIZADA` vira `confirmada` no
   passado) e `paraMeetingCreateRequest` ficam no fim do serviço e são o único lugar que conhece
   os nomes do back.
3. **Fuso fixo** America/Recife (GMT-3), ISO em UTC no armazenamento, formatação pt-BR e semana
   começando na segunda, em `utils/datas.ts` (sem biblioteca de datas).
4. **`.ics` gerado no front** (`utils/ics.ts`), com `DTSTART`/`DTEND` em UTC e `UID` estável
   (`<id>@unio.app`). Substitui o atalho "Criar convite no Google Agenda" do popup do unio.

## Lacuna com o back (levar ao squad)

O back **não aceita horários sugeridos**. Uma das duas saídas precisa ser escolhida antes da
integração:

- **A (recomendada):** o back passa a aceitar `suggestedTimes: Instant[]` (1 a 3) na criação,
  `POST /{id}/accept` recebe o horário escolhido e um `POST /{id}/counter-proposal` devolve a
  solicitação ao outro lado com novos horários. Também faltam `location` (presencial) e a regra
  de só permitir reunião entre quem deu match.
- **B (provisória):** o front negocia os horários fora do back e envia só o horário aceito
  (`startsAt`) quando a reunião é confirmada, criando-a já para o aceite do outro lado. O local
  vai no texto de `agenda`. Perde o histórico de propostas e não funciona entre dispositivos.

Outras diferenças: o back bloqueia conflito com 409 (o front só avisa; a tela precisa tratar o
409 como aviso ou o back passa a só sinalizar) e conta `PENDENTE` como ocupando a agenda (o front
considera só as confirmadas).

## Alternativas

- **Usar `/api/meetings` já agora:** não está na `main` e não suporta o fluxo de 3 horários.
- **Biblioteca de calendário (FullCalendar etc.):** descartada; a grade é CSS grid própria
  (`components/reunioes/GradeCalendario.tsx`), sem dependências novas.

## Consequências

- Dados de exemplo (`mocks/reunioesMock.ts`) aparecem só com quem deu match e são recriados a cada
  semana. A "outra parte" do mock aceita as propostas ímpares depois de cerca de 5 segundos.
- O funil da startup ("Reunião marcada") conta unios com reunião confirmada, somados sem repetir
  aos eventos antigos do `unioLocal`.
- Desfazer match cancela as pendentes e as confirmadas futuras com a pessoa.
- Arquivos: `types/reunioes.ts`, `services/reunioesService.ts`, `services/reunioesStore.ts`,
  `mocks/reunioesMock.ts`, `utils/datas.ts`, `utils/ics.ts`, `utils/reunioes.ts`,
  `components/reunioes/*`, `pages/shared/PaginaReunioes.tsx`, `tests/datas.test.ts`,
  `tests/ics.test.ts`.
