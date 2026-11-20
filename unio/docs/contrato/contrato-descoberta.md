# Contrato: descoberta, interesse, match e salvos

Autora: Carol
Data: 2026-11-16
Status: Aceita
Decisões: D045 a D055 (`docs/decisoes.md`)

Todos os endpoints exigem `Authorization: Bearer <token>`. Erros seguem o formato
único da API (`{ timestamp, status, error, message, path }`). Ids de usuário são o
`id` de `users` (o mesmo `participantId` de `POST /api/meetings`).

## Descoberta (`/api/discovery`)

| Método | Caminho | Papel | Resposta |
| --- | --- | --- | --- |
| GET | `/api/discovery/startups` | INVESTOR | `DiscoveryPageResponse` |
| GET | `/api/discovery/investors` | STARTUP | `DiscoveryPageResponse` |
| GET | `/api/discovery/startups/{userId}` | INVESTOR | `DiscoveryItemResponse` |
| GET | `/api/discovery/investors/{userId}` | STARTUP | `DiscoveryItemResponse` |

**Parâmetros das listas (todos opcionais):**

- `q`: busca sem acento e sem diferença de maiúsculas.
  - Startups: nome, segmento, estágio, localização, modelo de negócio e mercado-alvo.
  - Investidores: nome, tipo, região, segmentos e estágios de interesse.
- `segmento` e `estagio`: igualdade, sem acento. Para investidores, vale se um dos itens
  de interesse bater.
- `tipo` (só investidores): `perfilRisco`. "Investidor Anjo" e "Mentor" incluem "Ambos".
- `minScore`: de 0 a 100.
- `limit` (padrão 20, máximo 100) e `offset`.

**Regras:**

- Candidatos: usuários ativos do papel complementar, com perfil criado.
- Ordem: score decrescente, depois o nome.
- Score sob demanda (D045). O score gravado vale se for mais novo que os dois perfis;
  senão, é recalculado.
- No máximo `unio.discovery.max-calculations-per-request` cálculos por requisição. Os
  pares que sobram ficam em `notCalculated` e entram nas próximas leituras.
- Critério eliminatório violado (D047): `scoreFinal` 0, `classification` `SEM_MATCH`,
  `calculatedAt` nulo e `nextStep.code` `CRITICAL_CRITERION_VIOLATED`. Esse par não é
  gravado.

**Erros:**

| Status | Quando |
| --- | --- |
| 403 | Papel errado |
| 409 | Quem chama ainda não tem perfil |
| 404 | No detalhe: candidato inexistente, removido ou sem perfil |

```json
{
  "total": 14, "limit": 20, "offset": 0, "notCalculated": 0,
  "items": [
    {
      "userId": 12,
      "name": "Tidalog",
      "role": "STARTUP",
      "profile": {
        "segmento": "Logística", "estagio": "Seed", "localizacao": "Recife, PE",
        "modeloNegocio": "B2B SaaS", "mercadoAlvo": "Transportadoras",
        "capitalProcurado": 300000, "pitchCanvas": "..."
      },
      "scoreFinal": 92.50,
      "classification": "EXCELENTE",
      "dimensions": [{ "dimension": "SEGMENTO", "score": 100.00, "weight": 0.2500, "weightedScore": 25.00 }],
      "topPositiveFactors": [{ "factorCode": "SEGMENTO_MATCH", "factorScore": 100.00, "dimension": "SEGMENTO" }],
      "topAttentionFactors": [{ "factorCode": "MODELO_NEGOCIO_FIT", "factorScore": 50.00 }],
      "nextStep": { "code": "GENERIC_REVIEW", "text": "Revisar os fatores de atenção identificados." },
      "scorecard": {
        "startupId": "00000000-0000-0000-0000-00000000000c",
        "investorId": "00000000-0000-0000-0000-000000000007",
        "scorePolicyId": 1
      },
      "interestStatus": "NONE",
      "saved": false,
      "calculatedAt": "2026-11-16T22:10:00Z"
    }
  ]
}
```

**Campos do perfil:**

- Investidor: `segmentosInteresse` (lista), `estagiosInteresse` (lista), `ticketMinimo`,
  `ticketMaximo`, `perfilRisco`, `disponibilidade` e `regiaoInteresse`.
- Os campos do outro papel não aparecem.

**`interestStatus`:**

| Valor | Significado |
| --- | --- |
| `NONE` | Nenhum dos dois demonstrou interesse |
| `SENT` | Eu demonstrei interesse |
| `RECEIVED` | O outro lado demonstrou interesse |
| `MATCH` | Os dois demonstraram interesse |

**Nunca aparecem:** e-mail, documento, senha, o JSON de onboarding nem
`pitchFileUrl`.

## Feedback do algoritmo

`POST /api/scorecard/feedback` com
`{ startupId, investorId, scorePolicyId, action }`, onde os três primeiros vêm do
objeto `scorecard` do item.

- **Ações usadas pelo front:**
  - `VIEWED` ao abrir o perfil.
  - `INTERESTED` ao clicar em "Tenho interesse".
  - `NOT_INTERESTED` ao dispensar.
- **Respostas:**

  | Status | Quando |
  | --- | --- |
  | 201 | Gravado |
  | 409 `FEEDBACK_DUPLICATE` | A mesma ação no mesmo par em menos de 5 minutos. O front trata como sucesso. |
  | 403 | O par não é do usuário logado (D048) |

## Interesse e match (`/api/interests`)

| Método | Caminho | Resposta |
| --- | --- | --- |
| PUT | `/api/interests/{targetUserId}` | `{ "status": "ENVIADO" \| "MATCH", "matchedAt": "..." \| null }` |
| DELETE | `/api/interests/{targetUserId}` | `{ "status": "NONE" \| "RECEIVED", "canceledMeetings": 0 }` |
| GET | `/api/interests/matches` | lista de `ConnectionResponse` com `contact.email` |

**PUT:**

- Idempotente.
- Vira `MATCH` quando o outro lado já tinha demonstrado interesse.
- `matchedAt` é o horário do segundo interesse.

**DELETE:**

- Idempotente.
- Se havia match, cancela as reuniões futuras do par e informa quantas em
  `canceledMeetings`.
  - Conta como futura a `CONFIRMADA` com início depois de agora.
  - Conta também a `PENDENTE` com algum horário sugerido depois de agora.
- O motivo do cancelamento é "Match desfeito".

**Só entre STARTUP e INVESTOR ativos com perfil. Erros:**

| Status | Quando |
| --- | --- |
| 400 | Mesmo papel ou si mesmo |
| 404 | Alvo inexistente, removido ou sem perfil |
| 409 | Quem chama não tem perfil |
| 403 | ADMIN |

**`GET /api/interests/matches`** devolve os matches do mais recente para o mais antigo:

```json
[
  {
    "userId": 12, "name": "Tidalog", "role": "STARTUP",
    "matchedAt": "2026-11-16T22:15:00Z", "savedAt": null,
    "scoreFinal": 92.50, "classification": "EXCELENTE",
    "interestStatus": "MATCH", "saved": false,
    "profile": { "segmento": "Logística" },
    "contact": { "email": "contato@exemplo.com.br" }
  }
]
```

`contact.email` só existe aqui (D052).

## Salvos (`/api/saved`)

| Método | Caminho | Resposta |
| --- | --- | --- |
| PUT | `/api/saved/{targetUserId}` | 204 (idempotente) |
| DELETE | `/api/saved/{targetUserId}` | 204 (idempotente) |
| GET | `/api/saved` | lista de `ConnectionResponse` com `savedAt` e sem `contact` |

## Reuniões com a regra de match (D051)

A regra vale com `unio.communication.require-match=true`, que é o padrão.

- `POST /api/meetings` sem match mútuo responde 403 com a mensagem "Vocês precisam
  dar match (interesse mútuo) para marcar uma reunião".
- `GET /api/meetings/counterparts` lista só quem tem match.
- Reuniões já existentes seguem o fluxo de sempre.

## Métricas e popularidade (D053)

- `GET /api/admin/metrics` ganhou:
  - `interestsSent`: interesses enviados.
  - `mutualMatches`: pares com match mútuo.
- `totalMatches` continua sendo o número de scores calculados.
- `GET /api/profile/me/popularity`: `interestsReceived` agora é o total real de
  interesses recebidos, sem dizer de quem.

## Administrador (D054)

- **Primeiro ADMIN:** criado na subida a partir das variáveis de ambiente
  `UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD`, só se não existir nenhum.
- **`POST /api/admin/bootstrap-admin`:** só ADMIN. Recebe `{ "email", "password" }` no
  corpo; a query string não é mais aceita.
