# Contrato de API — Onboarding de primeiro acesso

**Status:** Ativo
**Data:** 2026-10-11
**Escopo:** adiciona `GET` e `PUT /api/profile/onboarding`. Não altera nenhum endpoint
de `contrato-v2.md` nem de `/api/auth/**`, `/api/profile/**` (demais rotas), `/api/admin/**`.

---

## Visão geral

Guarda o status e as respostas do onboarding de primeiro acesso dos perfis STARTUP e
INVESTOR. Tabela `user_onboarding` (migration `V10__create_user_onboarding.sql`), uma
linha por usuário, criada no primeiro `PUT`.

- O usuário só lê e altera o **próprio** onboarding: o id vem do JWT, nunca da URL ou do corpo.
- `respostas` é um **JSON livre** cujo formato pertence ao front. O back não valida o
  conteúdo; só guarda e devolve. Limite: 20 KB serializado.
- Os dados serão consumidos pelo motor de matchmaking/IA. Renomear campos de `respostas`
  exige ajustar esse consumidor.
- Não depende de o perfil startup/investor já existir.

| Status       | Significado                                   |
|--------------|-----------------------------------------------|
| `PENDENTE`   | Ainda não concluído nem pulado (padrão)       |
| `CONCLUIDO`  | Usuário terminou os 4 passos                  |
| `PULADO`     | Usuário optou por pular                       |

**Autenticação:** `Authorization: Bearer <token>` (token de `POST /api/auth/login`).
**Papéis:** `STARTUP` e `INVESTOR`. `ADMIN` recebe 403.

---

## GET /api/profile/onboarding

Devolve o onboarding do usuário logado. Sem registro salvo, devolve `PENDENTE`,
`respostas` vazias e `atualizadoEm: null` (sem gravar nada).

**200 OK** — sem registro:
```json
{ "status": "PENDENTE", "respostas": {}, "atualizadoEm": null }
```

**200 OK** — com registro:
```json
{
  "status": "CONCLUIDO",
  "respostas": {
    "segmentosInteresse": ["Fintech", "Saúde"],
    "estagiosInteresse": ["MVP", "Tração"],
    "ticketMedio": "R$ 50 a 200 mil",
    "apenasMentor": false,
    "disponibilidade": "Média",
    "consentimentoLgpd": true
  },
  "atualizadoEm": "2026-10-11T17:00:00.123456Z"
}
```

---

## PUT /api/profile/onboarding

Upsert do onboarding do usuário logado. Os dois campos são opcionais:

| Campo       | Tipo                                   | Regra                                                         |
|-------------|----------------------------------------|---------------------------------------------------------------|
| `status`    | `PENDENTE` \| `CONCLUIDO` \| `PULADO`  | Ausente = mantém o status atual                               |
| `respostas` | objeto JSON                            | Ausente = mantém as respostas; presente = **substitui** tudo  |

Como `respostas` é substituído por inteiro, o front sempre lê, mescla a chave que
quer alterar e grava o objeto todo (`onboardingAnswersStore.updateAnswer`). Assim
uma tela não apaga o que outra gravou. Chaves usadas hoje pelo front: `onboarding`
(respostas do wizard), `teamMembers`, `startupDocuments`, `profileVisibility`,
`investorProfileExtras`, `pitch` e `pitchLeanCanvas`. Ver
`UNIO-front/docs/adr/ADR-003`.

`atualizadoEm` é sempre atualizado. Resposta no mesmo formato do `GET`.

| Ação do front               | Corpo                                              |
|-----------------------------|----------------------------------------------------|
| Salvar progresso (autosave) | `{ "respostas": { ... } }`                         |
| Concluir                    | `{ "status": "CONCLUIDO", "respostas": { ... } }`  |
| Pular                       | `{ "status": "PULADO" }`                           |

**Request** (concluir, STARTUP):
```json
{
  "status": "CONCLUIDO",
  "respostas": {
    "segmento": "Fintech",
    "estagio": "MVP",
    "necessidades": ["Capital", "Mentoria"],
    "capitalProcurado": "R$ 200 a 500 mil",
    "localizacao": "São Paulo/SP",
    "tracao": ["Clientes pagantes"],
    "tamanhoEquipe": "2 a 5",
    "modeloNegocio": "B2B",
    "mercadoAlvo": "PMEs",
    "pitch": "Plataforma de crédito para PMEs...",
    "consentimentoLgpd": true
  }
}
```

**200 OK**:
```json
{
  "status": "CONCLUIDO",
  "respostas": { "segmento": "Fintech", "...": "..." },
  "atualizadoEm": "2026-10-11T17:00:00.123456Z"
}
```

---

## Criação do perfil a partir do onboarding (desde 2026-11-07)

O onboarding é o único caminho de criação de perfil (D028). Fluxo do front:

1. `POST /api/auth/register` cria só o `User`.
2. O front navega para `/onboarding/startup` ou `/onboarding/investidor`. Enquanto
   `GET /api/profile/me` responder 404, o onboarding é obrigatório e não pode ser pulado.
3. No último passo, com o consentimento marcado, o front chama
   `POST /api/profile/startup` ou `POST /api/profile/investor`. 409 (perfil já existe)
   é tratado como sucesso. Quem já tem perfil não chama o `POST` de novo.
4. Em seguida grava as respostas completas do wizard em `respostas.onboarding`
   (mescla por chave, item acima). Falha nessa gravação não desfaz o perfil.

O status `CONCLUIDO`/`PULADO` do wizard continua no `localStorage` do front; este
endpoint não é chamado com `status` nesse fluxo.

### Mudanças nos DTOs de criação

| DTO                     | Campo                          | Antes                    | Agora                                         |
|-------------------------|--------------------------------|--------------------------|-----------------------------------------------|
| `StartupCreateRequest`  | `capitalProcurado`             | `@NotNull @Positive`     | opcional, `@Positive` quando presente (D029)  |
| `InvestorCreateRequest` | `ticketMinimo`, `ticketMaximo` | `@NotNull @Positive`     | opcionais, `@Positive` quando presentes (D029)|
| `InvestorCreateRequest` | `perfilRisco`                  | opcional, nulo gravado   | nulo ou em branco grava "Investidor Anjo" (D030) |

Mínimo maior que máximo continua 400, mas só é verificado quando os dois tickets vêm
preenchidos. Coluna `startup_profiles.capital_procurado` aceita nulo desde a
`V23__capital_procurado_opcional.sql`. Em `GET /api/profile/me` esses campos podem vir `null`.

**Exemplo** (`POST /api/profile/startup`, startup que não busca investimento):
```json
{
  "nome": "EcoTech",
  "segmento": "Fintech",
  "estagio": "MVP",
  "localizacao": "Recife / Porto Digital",
  "modeloNegocio": "B2B",
  "mercadoAlvo": "PMEs",
  "pitchCanvas": "Crédito para PMEs do varejo"
}
```

**Exemplo** (`POST /api/profile/investor`, atua apenas como mentor, sem faixa de ticket):
```json
{
  "segmentosInteresse": ["Fintech", "EdTech", "AgTech"],
  "estagiosInteresse": ["MVP"],
  "perfilRisco": "Mentor",
  "disponibilidade": "MEDIA",
  "regiaoInteresse": "Recife / Porto Digital,Nordeste"
}
```

Conversão das respostas (faixas, disponibilidade, regiões): `UNIO-front/docs/adr/ADR-002`.

---

## Códigos de resposta

| Código | Quando                                                                  |
|--------|-------------------------------------------------------------------------|
| 200    | Sucesso (`GET` e `PUT`)                                                 |
| 400    | `status` fora do enum, JSON malformado ou `respostas` acima de 20 KB    |
| 401    | Token inválido/expirado (ver observação abaixo)                         |
| 403    | Usuário `ADMIN`; também requisição **sem** token (ver observação)       |

**Observação sobre 401 × 403:** o `SecurityConfig` atual não define um
`AuthenticationEntryPoint`, então o Spring Security responde **403** a requisições sem
`Authorization`, como já acontece em todas as rotas autenticadas do projeto. O front deve
tratar 401 e 403 sem token como "sessão ausente".

Corpo de erro: formato padrão do Spring Boot (`/error`), por exemplo:
```json
{ "timestamp": "2026-10-11T17:00:00.000+00:00", "status": 400, "error": "Bad Request", "path": "/api/profile/onboarding" }
```
