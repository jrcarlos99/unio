# Contrato: Comunicação, avaliação e LGPD (T09a, T09b, T12, T13, T16, RF10 popularidade)

Complemento do `contrato-v2.md` para o time de front. Todas as rotas exigem
`Authorization: Bearer <token>`. O Swagger (`/swagger-ui/index.html`) tem os
schemas completos.

**Ids:** `participantId` é o **id do usuário** do outro lado — o mesmo `id`
devolvido em `GET /api/profile/me` e usado como chave dos perfis de startup e
investidor.

**Quem pode usar:** mensagens, reuniões e avaliações só entre um `STARTUP` e um
`INVESTOR`. ADMIN recebe 403. Conversa/reunião de outra pessoa responde 404.

**Erros:** formato padrão

```json
{ "timestamp": "2026-11-02T15:00:00Z", "status": 400, "error": "Bad Request",
  "message": "A mensagem não pode ser vazia", "path": "/api/conversations/3/messages",
  "errors": [ { "field": "content", "defaultMessage": "A mensagem não pode ser vazia" } ] }
```

`errors` só aparece em erro de validação. Sem token ou token expirado → **401**.

---

## T09a — Mensagens (`/api/conversations`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/api/conversations` | `{ "participantId": 12 }` | `200` `Conversation` (cria ou devolve a existente) |
| GET | `/api/conversations` | — | `200` `Conversation[]` (mais recente primeiro) |
| GET | `/api/conversations/{id}/messages?page=0&size=30` | — | `200` `MessagePage` (mais recente primeiro, `size` máx. 100) |
| POST | `/api/conversations/{id}/messages` | `{ "content": "Olá!" }` (1–2000 caracteres) | `201` `Message` |
| POST | `/api/conversations/{id}/read` | — | `200` `{ "updated": 3 }` |

```json
// Conversation
{ "id": 3,
  "participant": { "id": 12, "name": "AgroTech PE", "role": "STARTUP", "active": true },
  "createdAt": "2026-11-02T14:00:00Z", "lastMessageAt": "2026-11-02T14:05:00Z",
  "lastMessagePreview": "Olá! Gostei do pitch de vocês.", "unreadCount": 1 }

// Message
{ "id": 40, "conversationId": 3, "senderId": 7, "mine": true,
  "content": "Olá!", "createdAt": "2026-11-02T14:05:00Z", "readAt": null }

// MessagePage
{ "content": [ /* Message */ ], "page": 0, "size": 30, "totalElements": 1, "totalPages": 1 }
```

`participant.name`: nome da startup; para investidor, a parte do e-mail antes do
`@` (o perfil de investidor não tem nome). `active: false` e nome
`"Usuário removido"` quando a pessoa excluiu a conta — enviar mensagem nesse
caso devolve **409**.

## T09b — Reuniões (`/api/meetings`)

Atualizado em 2026-11-08 com as D032 a D039 (`V24__meetings_proposals.sql`). O
contrato antigo continua valendo (D038).

| Método | Rota | Quem | Transição |
|---|---|---|---|
| POST | `/api/meetings` | qualquer participante | cria `PENDENTE` com 1 a 3 horários sugeridos |
| GET | `/api/meetings?status=CONFIRMADA&from=...&to=...` | — | lista (filtros opcionais) |
| GET | `/api/meetings/counterparts` | STARTUP ou INVESTOR | com quem dá para marcar (D037) |
| GET | `/api/meetings/{id}` | participantes | — |
| POST | `/api/meetings/{id}/accept` | quem não fez a proposta vigente | `PENDENTE → CONFIRMADA` (corpo `{ "startsAt" }`) |
| POST | `/api/meetings/{id}/decline` | quem não fez a proposta vigente | `PENDENTE → RECUSADA` |
| POST | `/api/meetings/{id}/counter-proposal` | ver abaixo | `PENDENTE/CONFIRMADA → PENDENTE` |
| PATCH | `/api/meetings/{id}/details` | organizador | link e/ou local (sem mudar status) |
| POST | `/api/meetings/{id}/cancel` | qualquer um | `PENDENTE/CONFIRMADA → CANCELADA` (corpo opcional `{ "reason": "..." }`) |
| POST | `/api/meetings/{id}/complete` | qualquer um, depois do início | `CONFIRMADA → REALIZADA` |

```json
// POST /api/meetings (formato novo)
{ "participantId": 12, "subject": "Apresentação de pitch", "durationMinutes": 45,
  "suggestedTimes": ["2026-11-05T14:00:00-03:00", "2026-11-06T10:00:00-03:00"],
  "message": "Queremos apresentar a tração do trimestre.",
  "format": "PRESENCIAL", "locationName": "Porto Digital",
  "locationAddress": "Rua do Apolo, 181, Recife", "locationReference": "Sala 3" }

// POST /api/meetings (contrato antigo, continua valendo: vira 1 horário sugerido)
{ "participantId": 12, "title": "Primeira conversa", "agenda": "Tese e próximos passos",
  "startsAt": "2026-11-05T14:00:00-03:00", "durationMinutes": 30,
  "meetingUrl": "https://meet.google.com/abc-defg-hij" }

// Meeting (resposta): campos da T09b + os novos no fim
{ "id": 5, "title": "Apresentação de pitch", "agenda": null,
  "startsAt": "2026-11-05T17:00:00Z", "endsAt": "2026-11-05T17:45:00Z", "durationMinutes": 45,
  "meetingUrl": null, "status": "PENDENTE", "cancelReason": null,
  "organizer": true, "participant": { "id": 12, "name": "AgroTech PE", "role": "STARTUP", "active": true },
  "createdAt": "...", "updatedAt": "...",
  "subject": "Apresentação de pitch", "message": "Queremos apresentar a tração do trimestre.",
  "format": "PRESENCIAL",
  "location": { "name": "Porto Digital", "address": "Rua do Apolo, 181, Recife", "reference": "Sala 3" },
  "suggestedTimes": ["2026-11-05T17:00:00Z", "2026-11-06T13:00:00Z"],
  "proposedByMe": true }

// POST /api/meetings/{id}/accept
{ "startsAt": "2026-11-06T13:00:00Z" }

// POST /api/meetings/{id}/counter-proposal
{ "suggestedTimes": ["2026-11-07T15:00:00Z"], "message": "Pode ser nesse dia?" }

// PATCH /api/meetings/{id}/details
{ "meetingUrl": "https://meet.google.com/abc-defg-hij" }
{ "location": { "name": "Porto Digital", "address": "Rua do Apolo, 181", "reference": null } }

// GET /api/meetings/counterparts (sem e-mail nem documento)
[ { "userId": 12, "name": "Tidalog", "role": "STARTUP", "subtitle": "Logística • Seed",
    "segment": "Logística", "stage": "Seed", "tipoInvestidor": null,
    "ticketMin": null, "ticketMax": null, "matchScore": 87.5 } ]
```

Regras:

- **Horários (D032):** de 1 a 3 em `suggestedTimes`, todos no futuro, sem repetidos
  (4 ou mais → **400**). Com `suggestedTimes`, o `startsAt` é ignorado; sem ele, o
  `startsAt` vira a lista de 1 (D038). A resposta traz `suggestedTimes` em ordem
  cronológica; numa PENDENTE, `startsAt`/`endsAt` são os do primeiro horário.
- **Aceite:** com mais de um horário, o corpo `{ "startsAt" }` é obrigatório e deve
  ser um dos sugeridos (senão **400**); com um só, o corpo pode faltar. Depois do
  aceite, `startsAt`/`endsAt` são os do horário escolhido.
- **Quem responde (D033):** numa PENDENTE, `accept` e `decline` são de quem **não**
  fez a proposta vigente (`proposedByMe: false`); o proposer recebe **403**.
- **Contraproposta e remarcação (D033):** numa PENDENTE, só quem não fez a proposta
  vigente; numa CONFIRMADA, qualquer participante. Troca os horários, quem chamou
  passa a ser o proposer e o status volta para PENDENTE.
- **Conflito (D034):** só reuniões CONFIRMADAS ocupam a agenda. Criação e
  contraproposta → **409** só se todos os horários conflitarem; aceite → **409** se
  o horário escolhido conflitar.
- **Título (D038):** `title` é opcional quando vier `subject`; sem os dois → **400**.
- **Formato e local (D035):** `format` é `ONLINE` (padrão) ou `PRESENCIAL`; local só
  em PRESENCIAL (senão **400**). `subject` até 40, `message` até 280 caracteres.
- **Link e local (D036):** só o organizador (`organizer: true`) altera, com a reunião
  PENDENTE ou CONFIRMADA. `meetingUrl` só `https://` (vazio apaga). Campo ausente
  fica como está.
- **Intervalo:** `from` e `to` em ISO-8601, `[from, to)`. Entram as reuniões com
  algum horário no intervalo (o confirmado ou, numa PENDENTE, um dos sugeridos).
- **Counterparts (D037):** usuários ativos do papel complementar com perfil criado.
  `matchScore` é nulo quando o scorecard ainda não calculou o par. **Não** filtra por
  match mútuo (D039).
- Duração de 15 a 240 min. Datas sempre em UTC na resposta.

## T12 — Avaliação pós-interação

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/api/meetings/{id}/reviews` | `{ "rating": 5, "comment": "..." }` (nota 1 a 5, comentário opcional até 1000) | `201` `Review` |
| GET | `/api/meetings/{id}/reviews` | — | `200` `Review[]` |
| GET | `/api/reviews/received` | — | `200` `{ "averageRating": 4.5, "totalReviews": 2, "reviews": [ ... ] }` |
| GET | `/api/reviews/summary/{userId}` | (sem corpo) | `200` `ReviewSummary` (D040) |

Só para reunião `REALIZADA` (senão **409**) e uma vez por participante (**409**
na segunda). A avaliação é sempre do outro participante da reunião.

`Review` = `{ "id", "meetingId", "reviewer", "reviewed", "rating", "createdAt" }`.

**Comentário oculto (D043):** o `comment` continua opcional no POST e é gravado,
mas **não volta em nenhuma resposta** destas rotas, nem para quem escreveu nem para
quem foi avaliado. Ele só aparece no export LGPD do próprio autor
(`reviewsWritten`). O acesso da moderação (ADMIN) ainda não existe.

**Resumo público (D040):** `GET /api/reviews/summary/{userId}`

```json
{ "userId": 42, "totalReviews": 3, "averageRating": 4.7, "percentage": 93, "visible": true }
```

- Só agregados: sem comentários, sem autores, sem notas individuais.
- Com menos de 3 avaliações: `averageRating` e `percentage` nulos e `visible: false`.
- `percentage = round(média / 5 * 100)`; `averageRating` com uma casa decimal.
- Pode consultar o **próprio** resumo ou o de um usuário **ativo** do **papel
  complementar**. Mesmo papel, usuário removido ou inexistente → **404**.

## RF10: Popularidade e visitas ao perfil

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/api/profile-views` | `{ "targetUserId": 42 }` | `204` (D041) |
| GET | `/api/profile/me/popularity` | (sem corpo) | `200` `Popularity` (D042) |

**Visitas (D041):** chamar ao abrir o perfil de outra pessoa (uma vez por
abertura). O back conta no máximo **uma visita por visitante, por perfil, por dia**
(fuso America/Recife). Auto-visita e visitante do mesmo papel do alvo são
ignorados (também `204`). Alvo inexistente ou removido → **404**. O visitante
**nunca** é exposto em nenhuma resposta.

**Popularidade própria (D042):**

```json
{ "userId": 42, "totalReviews": 4, "averageRating": 4.5, "percentage": 90, "visible": true,
  "meetingsCompleted": 4, "profileViews28d": 59, "profileViewsPrev28d": 50,
  "weeklyViews": [ { "weekStart": "2026-10-20", "views": 10 }, { "weekStart": "2026-10-27", "views": 14 },
                   { "weekStart": "2026-11-03", "views": 16 }, { "weekStart": "2026-11-10", "views": 19 } ],
  "interestsReceived": 0 }
```

- Os 5 primeiros campos são o mesmo resumo do `summary` (mínimo de 3).
- `profileViews28d`: últimos 28 dias, hoje incluso; `profileViewsPrev28d`: os 28 anteriores.
- `weeklyViews`: 4 janelas de 7 dias dentro dos 28 dias, da mais antiga à mais recente.
- `interestsReceived`: sempre `0` por enquanto. O interesse mútuo ainda não existe
  no back (D039).
- A popularidade **não** entra no score de compatibilidade nem no ranking do back
  (D042). A ordenação por popularidade é só do front (ADR-006).

## T13 — Exportação e exclusão de dados (LGPD)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/privacy/export` | — | `200` JSON como anexo `unio-meus-dados.json` |
| POST | `/api/privacy/delete-account` | `{ "password": "senha atual", "confirmed": true }` | `204` |

Exportação: `account`, `consent`, `profile`, `onboarding`, `conversations`
(com mensagens), `meetings`, `reviewsWritten` (com o `comment` que o titular
escreveu), `reviewsReceived` (sem `comment`, D043), `profileViewsMade` (perfis que
o titular visitou e o dia), `profileViewsReceivedTotal` (só o total, sem os
visitantes, D044), `auditLog`.

Na exclusão, as visitas do titular (como visitante e como visitado) são apagadas
(D044).

Exclusão (irreversível): senha errada → **403**; sem `confirmed: true` → **400**;
ADMIN → **403**. Depois do `204` o front deve apagar o token e voltar à landing —
o token antigo passa a receber 401.

## T16 — Métricas do admin

`GET /api/admin/metrics` ganhou campos (os antigos continuam):

```json
{ "totalStartups": 4, "totalInvestors": 3, "totalMatches": 12, "totalFeedbacks": 5,
  "distributionByClassification": { "FORTE": 7, "MODERADO": 5 },
  "totalConversations": 5, "totalMessages": 40, "totalMeetings": 6,
  "meetingsByStatus": { "PENDENTE": 1, "CONFIRMADA": 2, "RECUSADA": 0, "CANCELADA": 1, "REALIZADA": 2 },
  "totalReviews": 3, "averageRating": 4.7 }
```
