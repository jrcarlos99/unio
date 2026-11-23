# Contrato: descoberta, interesse, match e salvos

Autora: Carol
Data: 2026-11-16 (atualizado em 2026-11-21 no merge com o `main`)
Status: Aceita
Decisões: D045 a D055 e D058 a D062 (`docs/decisoes.md`)

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

Armazenamento: `match_interests` (V23), a mesma tabela das rotas `/api/matches` do
`main` (D058). As duas interfaces leem e gravam no mesmo lugar.

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

### Interesses recebidos (D065)

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/api/interests/received?limit=&offset=` | página de interesses recebidos ainda não retribuídos |
| GET | `/api/interests/received/count` | `{ "total": 2 }` (o mesmo total da lista) |

- Só STARTUP e INVESTOR. ADMIN: 403. Sem token: 401. Sem perfil: lista vazia.
- Do interesse mais recente para o mais antigo. `limit` padrão 20, máximo 100; `offset`
  negativo vira 0.
- Só quem demonstrou interesse em mim e ainda não recebeu o meu de volta. Retribuir é o
  `PUT /api/interests/{userId}` acima, que vira `MATCH` na hora; depois disso o item sai da
  lista. Se o outro lado desfaz, o item também sai.
- Contas excluídas ou ocultas pela moderação (D063: PENDENTE, RECUSADO, SUSPENSO) não
  aparecem.
- Startup: `segmento`, `estagio` e `localizacao` (cidade e UF) do cadastro. Investidor:
  segmentos e estágios de interesse separados por vírgula e a região de interesse em
  `localizacao`.
- `scoreFinal` e `classification`: último score já gravado do par, sem recalcular (pode vir
  `null`).
- Sem `email`, `contact`, documento ou arquivo de pitch (D052).

```json
{
  "total": 2, "limit": 20, "offset": 0,
  "items": [
    {
      "userId": 34, "name": "Ana Capital", "role": "INVESTOR",
      "segmento": "Logística, Fintech", "estagio": "Seed", "localizacao": "Nordeste",
      "scoreFinal": 78.75, "classification": "FORTE",
      "interestedAt": "2026-11-22T14:50:00Z"
    },
    {
      "userId": 12, "name": "Tidalog", "role": "STARTUP",
      "segmento": "Logística", "estagio": "Seed", "localizacao": "Recife, PE",
      "scoreFinal": null, "classification": null,
      "interestedAt": "2026-11-20T09:00:00Z"
    }
  ]
}
```

O exemplo mistura os dois papéis só para mostrar os campos. Na prática a startup só recebe
interesses de investidores e o investidor, de startups.

`interestsReceived` da popularidade (`GET /api/profile/me/popularity`) continua igual: conta
todos os interesses recebidos, inclusive os que viraram match.

## Salvos (`/api/saved`)

| Método | Caminho | Resposta |
| --- | --- | --- |
| PUT | `/api/saved/{targetUserId}` | 204 (idempotente) |
| DELETE | `/api/saved/{targetUserId}` | 204 (idempotente) |
| GET | `/api/saved` | lista de `ConnectionResponse` com `savedAt` e sem `contact` |

## Rotas do `main` com as mesmas regras (D058 a D062)

As rotas abaixo vieram do `main` (T20 a T23) e continuam com o mesmo caminho e o mesmo
formato de resposta. A regra de cada uma é a mesma das rotas acima.

### Interesse pelo contrato do `main` (`/api/matches`, D058)

| Método | Caminho | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/api/matches/interest` | `{ "startupId": 12, "investorId": 34 }` | 201, a linha de `match_interests` de quem chamou |
| GET | `/api/matches` | | linhas de quem chamou com match mútuo (`status: MATCHED`) |
| GET | `/api/matches/saved` | | linhas de quem chamou ainda sem match (`status: LIKED`) |

Linha: `{ id, startupId, investorId, likedByUserId, status, createdAt }`.

- `POST /api/matches/interest` é o mesmo "Tenho interesse" de `PUT /api/interests/{id}`
  (idempotente; vira `MATCHED` quando o outro lado já curtiu).
- Erros próprios do contrato do `main`: 400 sem `startupId`/`investorId` ou com os dois
  iguais; 403 quando o lado do papel de quem chama não é o próprio usuário ("em seu
  próprio nome") e para ADMIN; 404 quando o outro lado não existe.
- Erros da regra comum: 409 quem chama não tem perfil; 404 outro lado removido ou sem perfil.
- `/api/matches/saved` não são os salvos de bookmark: estes são `GET /api/saved`.

### Recomendações do scorecard (D061)

| Método | Caminho | Quem | Query |
| --- | --- | --- | --- |
| GET | `/api/scorecard/recommendations` | INVESTOR, ADMIN | `investorId` (opcional), `limit` (padrão 20) |
| GET | `/api/scorecard/recommendations/investors` | STARTUP, ADMIN | `startupId` (opcional), `limit` (padrão 20) |

- Sem o id, vale o usuário logado. Com o id, ele precisa ser o do usuário logado, senão
  403; ADMIN consulta qualquer um.
- Só leem scores já gravados; a lista com cálculo sob demanda é `/api/discovery`.
- `/recommendations/investors` devolve `[{ investorId, investorEmail, totalScore }]`;
  `investorEmail` só vem quando há match mútuo (D052), senão `null`.

### Perfis públicos e painel da startup (D060)

| Método | Caminho | Quem | Resposta |
| --- | --- | --- | --- |
| GET | `/api/profile/startup/{id}` | autenticado | `PublicStartupProfileResponse` |
| GET | `/api/profile/investor/{id}` | autenticado | `PublicInvestorProfileResponse` |
| GET | `/api/profile/startup/dashboard` | STARTUP | `{ totalVisualizacoes, totalMatches, totalReunioesAgendadas, totalMensagensNaoLidas }` |

- Perfis: os campos de perfil são os da descoberta (`PublicProfileMapper`), mais nome,
  `createdAt`, disponibilidade e observação. `email` só para o titular, ADMIN ou quem tem
  match mútuo; `pitchFileUrl` só para o titular e ADMIN; nos outros casos, `null`. Conta
  inexistente, removida ou sem perfil: 404.
- Painel: `totalVisualizacoes` são as visitas dos últimos 28 dias (igual a
  `profileViews28d` da popularidade); `totalMatches` são os matches mútuos;
  `totalReunioesAgendadas`, reuniões `PENDENTE` ou `CONFIRMADA`.

### Login inválido (D062)

`POST /api/auth/login` com senha errada, e-mail inexistente ou conta desativada: 401 com
`message: "Credenciais inválidas"`. Rota protegida sem token: 401 "Não autenticado".
Autenticado sem permissão: 403 "Acesso negado".

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

## Configuração do App Service (D054, D056 e D057)

Variáveis em App Service → Configuration → Application settings. Depois de salvar,
**reinicie o App Service**: todas são lidas só na subida.

| Variável | Para quê | Valor |
| --- | --- | --- |
| `UNIO_CORS_ALLOWED_ORIGINS` | Origens do front aceitas pelo CORS (D056) | Lista separada por vírgulas, sem barra final e sem `*`. Substitui a lista padrão inteira. |
| `UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD` | Primeiro administrador (D054) | Só se ainda não houver ADMIN; senha com 8+ caracteres. Podem ser removidas depois do primeiro login. |
| `UNIO_SCORECARD_SEED_DEFAULT_POLICIES` | Desliga o seed das políticas padrão (D057) | Opcional; padrão `true`. |

Sem `UNIO_CORS_ALLOWED_ORIGINS`, valem: `http://localhost:3000`, `http://localhost:5173`,
`http://127.0.0.1:3000`, `http://127.0.0.1:5173`, `https://unio-frontend-drab.vercel.app` e
`https://unio-pi.vercel.app`. Origem fora da lista: o preflight volta 403 sem
`Access-Control-Allow-Origin` e o navegador bloqueia a chamada.
