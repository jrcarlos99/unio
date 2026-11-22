# Contrato: moderação de cadastros e de conteúdo, pitch publicado

Autora: Carol
Data: 2026-11-22 (exportação de dados na D064)
Status: Aceita
Decisões: D063 e D064 (`docs/decisoes.md`)
Requisitos: RF06 (pitch e canvas), RF08 (moderação), RNF10 (auditoria)

Todas as rotas exigem `Authorization: Bearer <token>`. Erros seguem o formato único da
API (`{ timestamp, status, error, message, path, errors[] }`). Ids de usuário são o `id`
de `users`. Nenhuma rota existente mudou de caminho, status, campos ou regra; as mudanças
de comportamento das rotas antigas valem só para contas moderadas (seção "Efeitos nas
rotas existentes").

## Configuração

| Propriedade | Variável de ambiente | Padrão | Efeito |
| --- | --- | --- | --- |
| `unio.moderation.cadastro-requer-aprovacao` | `UNIO_MODERATION_CADASTRO_REQUER_APROVACAO` | `false` | `false`: conta nova entra APROVADO (o ADMIN ainda pode recusar ou suspender). `true`: conta nova entra PENDENTE, entra normalmente para completar o perfil, mas fica fora da descoberta, dos perfis públicos e das contrapartes até o ADMIN aprovar. |
| `unio.moderation.pitch-requer-aprovacao` | `UNIO_MODERATION_PITCH_REQUER_APROVACAO` | `true` | `true`: o envio do pitch entra EM_REVISAO e só aparece para investidores depois de PUBLICADO pelo ADMIN. `false`: entra PUBLICADO direto (o ADMIN ainda pode remover). |

No App Service: Configuration > Application settings, criar a variável e reiniciar. Sem
a variável, vale o padrão.

## Modelo (V30)

- `account_moderation`: `user_id` (PK e FK de `users`), `status` (APROVADO, PENDENTE,
  RECUSADO, SUSPENSO), `reason` (até 255), `reviewed_by_user_id`, `reviewed_at`,
  `created_at`, `updated_at`. **Sem linha = APROVADO**: as contas que já existem não
  precisam de migração de dados.
- `startup_pitch_publication`: `id`, `user_id` (startup), `pitch_text`, `video_url`,
  `canvas_json` (os nove blocos), `version` (crescente por startup, único com o
  `user_id`), `status` (EM_REVISAO, PUBLICADO, REMOVIDO), `reason`,
  `reviewed_by_user_id`, `reviewed_at`, `submitted_at`. Um registro por envio; o de
  maior versão é o que vale.

## Moderação de cadastros (somente ADMIN)

| Método | Caminho | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/api/admin/moderation/accounts` | | `ModerationPage<AccountModerationItem>` |
| POST | `/api/admin/moderation/accounts/{userId}/approve` | | `AccountModerationItem` |
| POST | `/api/admin/moderation/accounts/{userId}/reject` | `{ "reason": "..." }` | `AccountModerationItem` |
| POST | `/api/admin/moderation/accounts/{userId}/suspend` | `{ "reason": "..." }` | `AccountModerationItem` |
| POST | `/api/admin/moderation/accounts/{userId}/reactivate` | | `AccountModerationItem` |

**Parâmetros da lista (todos opcionais):**

- `status`: uma ou mais situações separadas por vírgula (`PENDENTE,SUSPENSO`).
- `role`: `STARTUP` ou `INVESTOR` (outro valor: 400 "Perfil inválido: use STARTUP ou INVESTOR").
- `q`: busca no e-mail e no nome da startup, sem diferença de maiúsculas.
- `limit` (padrão 20, máximo 100) e `offset`.

Lista só STARTUP e INVESTOR não excluídos pelo titular. Ordem: PENDENTE, SUSPENSO,
RECUSADO, APROVADO e, em cada grupo, cadastro mais recente primeiro.

```json
{
  "total": 1, "limit": 20, "offset": 0,
  "items": [
    {
      "userId": 12, "email": "contato@tidalog.com", "role": "STARTUP", "nome": "Tidalog",
      "status": "SUSPENSO", "reason": "Spam em mensagens",
      "reviewedBy": "admin@unio.com", "reviewedAt": "2026-11-22T10:00:00Z",
      "createdAt": "2026-11-02T10:00:00Z", "profileComplete": true
    }
  ]
}
```

**Regras das ações:**

- `reason` obrigatório em recusar e suspender: de 3 a 255 caracteres, sem contar espaços
  nas pontas. Sem corpo ou fora do limite: 400 "Informe o motivo, com 3 a 255 caracteres".
- Aprovar e reativar levam a conta para APROVADO e limpam o motivo (o motivo antigo fica no
  log de auditoria).
- Repetir a situação atual responde 200 sem mudar nada (aprovar quem não tem registro não
  cria registro).

**Erros:**

| Status | Quando |
| --- | --- |
| 400 | O ADMIN tenta moderar a própria conta: "Você não pode moderar a própria conta" |
| 403 | Quem chama não é ADMIN; ou o alvo é outro ADMIN: "A conta de um administrador não pode ser moderada" |
| 404 | Usuário inexistente: "Usuário não encontrado" |
| 409 | Conta excluída pelo titular: "A conta foi excluída pelo titular e não pode ser moderada" |

**Efeitos:**

| Situação | Login | Descoberta, perfis públicos, contrapartes | Reuniões e matches |
| --- | --- | --- | --- |
| APROVADO (ou sem registro) | normal | aparece | normais |
| PENDENTE | normal (para completar o perfil) | não aparece | ficam |
| SUSPENSO | 403 "Conta suspensa" | não aparece | ficam |
| RECUSADO | 403 "Conta recusada pela moderação" | não aparece | reuniões futuras canceladas com o motivo "Reunião cancelada porque a conta foi recusada pela moderação"; matches ficam |

- O 403 do login só sai depois que a senha confere; senha errada continua 401
  "Credenciais inválidas" (D062).
- O ADMIN nunca é bloqueado no login nem moderado.
- Reaprovar ou reativar volta tudo: a conta reaparece e os matches seguem valendo.
  Reuniões já canceladas não voltam.
- Token já emitido antes da suspensão continua válido até expirar (até 60 minutos); a
  conta já está fora da descoberta nesse intervalo.

## Pitch e Lean Canvas da startup

| Método | Caminho | Papel | Resposta |
| --- | --- | --- | --- |
| POST | `/api/profile/startup/pitch/publication` | STARTUP | `PitchPublicationStatusResponse` |
| GET | `/api/profile/startup/pitch/publication` | STARTUP | `PitchPublicationStatusResponse` |
| GET | `/api/discovery/startups/{userId}/pitch` | INVESTOR, a própria startup, ADMIN | `PublishedPitchResponse` |

**Envio (POST):** sem corpo. O back lê as respostas do onboarding da própria startup:
`respostas.pitch` (pitch curto) e `respostas.pitchLeanCanvas` (`videoUrl` e
`leanCanvas` com `problem`, `solution`, `keyMetrics`, `uniqueValueProposition`,
`unfairAdvantage`, `channels`, `customerSegments`, `costStructure`, `revenueStreams`),
as mesmas chaves que o `pitchService.ts` do front grava. Cria um envio com a próxima
versão, EM_REVISAO ou PUBLICADO conforme `pitch-requer-aprovacao`.

| Status | Quando |
| --- | --- |
| 400 | Pitch curto vazio: "Escreva o pitch curto antes de enviar para publicação" |
| 400 | Mais de 20000 caracteres somando pitch, link e blocos: "O pitch e o Lean Canvas passam do limite de 20000 caracteres. Encurte o texto e envie de novo" |
| 400 | Link de vídeo que não é http(s) do YouTube ou do Vimeo: "O link do vídeo precisa ser do YouTube ou do Vimeo" |
| 400 | `pitchLeanCanvas` em formato desconhecido: "O pitch salvo está em um formato que o servidor não reconhece" |
| 403 | Papel diferente de STARTUP |
| 409 | Sem perfil de startup: "Crie seu perfil de startup antes de publicar o pitch" |
| 409 | Dois envios ao mesmo tempo: "Outro envio do pitch acabou de ser registrado. Tente de novo" |

**Situação (GET da startup):** o último envio. Sem envio, 200 com `status` null.

```json
{
  "id": 5, "version": 2, "status": "REMOVIDO", "reason": "Contém telefone pessoal",
  "submittedAt": "2026-11-22T09:00:00Z", "reviewedAt": "2026-11-22T10:00:00Z",
  "requiresApproval": true,
  "shortPitch": "Logística inteligente para o Nordeste", "videoUrl": null,
  "leanCanvas": { "problem": "Frete caro", "solution": "Roteirização com IA", "...": "..." }
}
```

`reason` só vem quando `status` é REMOVIDO.

**Pitch publicado (GET do investidor):**

- Só o envio de maior versão, e só se estiver PUBLICADO. EM_REVISAO e REMOVIDO nunca são
  devolvidos. Um envio novo substitui o anterior: enquanto estiver EM_REVISAO, o público
  não vê pitch nenhum.
- 404 "Esta startup ainda não publicou o pitch" quando não há publicação.
- 404 "Startup não encontrada" quando o id não é de uma startup ativa (inexistente,
  excluída, PENDENTE, RECUSADO ou SUSPENSO).
- 403 para outra STARTUP.
- A visita ao perfil continua registrada só pelo `POST /api/profile-views` de sempre.

```json
{
  "startupId": 12, "version": 2,
  "shortPitch": "Logística inteligente para o Nordeste",
  "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
  "leanCanvas": { "problem": "Frete caro", "...": "..." },
  "publishedAt": "2026-11-22T10:00:00Z"
}
```

`publishedAt` é a data da aprovação, ou do envio quando não exige aprovação.

## Moderação de conteúdo (somente ADMIN)

| Método | Caminho | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/api/admin/moderation/content` | | `ModerationPage<PitchModerationItem>` |
| POST | `/api/admin/moderation/content/{id}/approve` | | `PitchModerationItem` |
| POST | `/api/admin/moderation/content/{id}/remove` | `{ "reason": "..." }` | `PitchModerationItem` |

- Lista: `status` (uma ou mais, separadas por vírgula), `limit` (padrão 20, máximo 100) e
  `offset`. Primeiro os envios atuais EM_REVISAO (o mais antigo primeiro, como fila),
  depois os demais do mais novo para o mais antigo.
- `current`: `false` quando a startup já mandou um envio mais novo. Com filtro de status,
  envios EM_REVISAO já substituídos ficam de fora (não aceitam ação).
- Aprovar e remover valem só para o envio atual da startup: 409 "Este envio foi
  substituído por um envio mais novo da mesma startup". 404 "Envio de pitch não
  encontrado". Repetir a situação responde 200 sem mudar nada.
- Remover exige motivo (mesma regra de 3 a 255 caracteres). A startup vê o motivo no GET
  da situação.

```json
{
  "id": 5, "startupId": 12, "startupName": "Tidalog", "startupEmail": "contato@tidalog.com",
  "version": 2, "status": "EM_REVISAO", "reason": null, "current": true,
  "submittedAt": "2026-11-22T09:00:00Z", "reviewedAt": null, "reviewedBy": null,
  "shortPitch": "...", "videoUrl": null, "leanCanvas": { "problem": "...", "...": "..." }
}
```

## Auditoria (RNF10)

Toda ação de ADMIN acima grava uma linha em `audit_logs` pelo `AuditService` existente.
`GET /api/admin/audit` não mudou de formato.

| `action` | `entityType` | `entityId` | `details` |
| --- | --- | --- | --- |
| `MODERACAO_CONTA_APROVADA` | `User` | id da conta | situação anterior e nova |
| `MODERACAO_CONTA_RECUSADA` | `User` | id da conta | situação anterior e nova, motivo, reuniões canceladas |
| `MODERACAO_CONTA_SUSPENSA` | `User` | id da conta | situação anterior e nova, motivo |
| `MODERACAO_CONTA_REATIVADA` | `User` | id da conta | situação anterior e nova |
| `MODERACAO_PITCH_APROVADO` | `StartupPitchPublication` | id do envio | startup, versão, situação anterior e nova |
| `MODERACAO_PITCH_REMOVIDO` | `StartupPitchPublication` | id do envio | startup, versão, situação anterior e nova, motivo |

`actorEmail` é o e-mail do ADMIN. O log não guarda senha, hash, documento nem o e-mail da
conta moderada. Repetir a situação também gera linha, com "(sem alteração)".

## Efeitos nas rotas existentes

Para contas APROVADO ou sem registro, nada muda. Para contas PENDENTE, RECUSADO e
SUSPENSO:

- `POST /api/auth/login`: 403 com a mensagem acima (RECUSADO e SUSPENSO).
- `POST /api/auth/register`: com `cadastro-requer-aprovacao=true`, a conta nova ganha a
  linha PENDENTE. Resposta igual.
- Tudo que usa `ParticipantService.isActive` passa a tratar a conta como inativa, como já
  tratava a conta excluída: `/api/discovery/**` (lista e detalhe), `/api/profile/startup/{id}`,
  `/api/profile/investor/{id}`, `/api/meetings/counterparts`, iniciar conversa, reunião,
  interesse ou avaliação com ela, contar visita ao perfil dela, e o nome de exibição dela
  nas listas dos outros ("Usuário removido") enquanto durar a moderação.
- `POST /api/privacy/delete-account`: apaga também os envios do pitch e o registro de
  moderação da conta (LGPD, D064).
- `GET /api/privacy/export`: duas chaves novas no fim, depois de `auditLog` (D064). As
  que já existiam não mudaram.

## Exportação de dados do titular (D064)

`moderation` traz o registro de moderação do próprio titular, sem o administrador que
decidiu. Sem registro, `status` APROVADO e `hasRecord` false. `pitchPublications` traz os
envios do titular, do mais recente para o mais antigo; para quem não é startup, lista vazia.
`removalReason` só vem preenchido em envio REMOVIDO.

```json
{
  "auditLog": [],
  "moderation": {
    "status": "SUSPENSO", "hasRecord": true,
    "reason": "Investigação de fraude", "reviewedAt": "2026-11-22T10:00:00Z"
  },
  "pitchPublications": [
    {
      "id": 8, "version": 2, "status": "EM_REVISAO",
      "submittedAt": "2026-11-22T11:00:00Z", "reviewedAt": null, "removalReason": null,
      "shortPitch": "Logística inteligente para o Nordeste",
      "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
      "leanCanvas": { "problem": "Frete caro", "solution": "Roteirização com IA", "...": "..." }
    },
    {
      "id": 5, "version": 1, "status": "REMOVIDO",
      "submittedAt": "2026-11-21T09:00:00Z", "reviewedAt": "2026-11-21T10:00:00Z",
      "removalReason": "Contém telefone pessoal",
      "shortPitch": "Primeira versão", "videoUrl": null,
      "leanCanvas": { "problem": "Frete caro", "...": "..." }
    }
  ]
}
```
