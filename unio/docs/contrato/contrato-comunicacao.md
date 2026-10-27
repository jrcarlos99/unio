# Contrato — Comunicação, avaliação e LGPD (T09a, T09b, T12, T13, T16)

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

| Método | Rota | Quem | Transição |
|---|---|---|---|
| POST | `/api/meetings` | qualquer participante | cria `PENDENTE` |
| GET | `/api/meetings?status=CONFIRMADA` | — | lista (filtro opcional) |
| GET | `/api/meetings/{id}` | participantes | — |
| POST | `/api/meetings/{id}/accept` | convidado | `PENDENTE → CONFIRMADA` |
| POST | `/api/meetings/{id}/decline` | convidado | `PENDENTE → RECUSADA` |
| POST | `/api/meetings/{id}/cancel` | qualquer um | `PENDENTE/CONFIRMADA → CANCELADA` (corpo opcional `{ "reason": "..." }`) |
| POST | `/api/meetings/{id}/complete` | qualquer um, depois do início | `CONFIRMADA → REALIZADA` |

```json
// POST /api/meetings
{ "participantId": 12, "title": "Primeira conversa", "agenda": "Tese e próximos passos",
  "startsAt": "2026-11-05T14:00:00-03:00", "durationMinutes": 30,
  "meetingUrl": "https://meet.google.com/abc-defg-hij" }

// Meeting (resposta)
{ "id": 5, "title": "Primeira conversa", "agenda": "Tese e próximos passos",
  "startsAt": "2026-11-05T17:00:00Z", "endsAt": "2026-11-05T17:30:00Z", "durationMinutes": 30,
  "meetingUrl": "https://meet.google.com/abc-defg-hij", "status": "PENDENTE", "cancelReason": null,
  "organizer": true, "participant": { "id": 12, "name": "AgroTech PE", "role": "STARTUP", "active": true },
  "createdAt": "...", "updatedAt": "..." }
```

Regras: `startsAt` no futuro; duração de 15 a 240 min; `meetingUrl` opcional,
começando com `https://`; horário em conflito com outra reunião pendente ou
confirmada de qualquer um dos dois → **409**. Datas sempre em UTC na resposta.

## T12 — Avaliação pós-interação

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/api/meetings/{id}/reviews` | `{ "rating": 5, "comment": "..." }` (nota 1–5, comentário até 1000) | `201` `Review` |
| GET | `/api/meetings/{id}/reviews` | — | `200` `Review[]` |
| GET | `/api/reviews/received` | — | `200` `{ "averageRating": 4.5, "totalReviews": 2, "reviews": [ ... ] }` |

Só para reunião `REALIZADA` (senão **409**) e uma vez por participante (**409**
na segunda). A avaliação é sempre do outro participante da reunião.

## T13 — Exportação e exclusão de dados (LGPD)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/privacy/export` | — | `200` JSON como anexo `unio-meus-dados.json` |
| POST | `/api/privacy/delete-account` | `{ "password": "senha atual", "confirmed": true }` | `204` |

Exportação: `account`, `consent`, `profile`, `onboarding`, `conversations`
(com mensagens), `meetings`, `reviewsWritten`, `reviewsReceived`, `auditLog`.

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
