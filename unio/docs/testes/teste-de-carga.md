# Teste de carga (T18 — RNF05)

> **Status:** script e metodologia prontos. A tabela de resultados (seção 6) deve
> ser preenchida pela equipe depois de cada rodada — os números dependem do
> ambiente (máquina local, plano B1 do Azure etc.).

## 1. Objetivo

Verificar se o backend atende ao **RNF05 — Escalabilidade** com a carga esperada
para o piloto no Porto Digital, e encontrar o primeiro gargalo antes dos beta
testers (RNF07).

Carga de referência do piloto: **50 usuários simultâneos** navegando
(recomendações, conversas, reuniões) e **2 mensagens por segundo** sendo enviadas.

## 2. Critérios de aceite

| Métrica | Meta |
|---|---|
| Taxa de erro HTTP (`http_req_failed`) | < 1% |
| Latência p95 de todas as requisições | < 800 ms |
| Latência p99 de todas as requisições | < 2 s |
| p95 de `GET /api/scorecard/recommendations` | < 1,2 s |
| p95 de `POST /api/conversations/{id}/messages` | < 800 ms |
| Checks de status OK | > 99% |

Os critérios estão codificados como `thresholds` no script: se algum falhar, o
k6 termina com código de saída diferente de zero.

## 3. Cenários (`load-test/k6/unio-load-test.js`)

| Cenário | Executor | Carga | Endpoints |
|---|---|---|---|
| `navegacao` | `ramping-vus` | 0 → 20 VUs (1 min) → 50 VUs (2 min) → 50 VUs por `HOLD` (5 min) → 0 | `GET /api/profile/me`, `GET /api/scorecard/recommendations`, `GET /api/meetings`, `GET /api/conversations`, `GET /api/conversations/{id}/messages` |
| `mensagens` | `constant-arrival-rate` | 2 req/s por 8 min (começa no 1º min) | `POST /api/conversations/{id}/messages` |

Cada VU de navegação espera 1–3 s entre ações (tempo de leitura de um usuário real).

## 4. Preparação

1. **Ambiente:** local (`./mvnw spring-boot:run`) ou homologação. Evite produção:
   o cenário `mensagens` grava ~1.000 mensagens.
2. **Usuários de teste:** crie uma startup e um investidor pela API e complete os
   perfis (o `GET /api/profile/me` precisa existir para os dois):

   ```bash
   API=http://localhost:8080
   curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"carga-startup@teste.unio","documento":"00000000191","password":"senhaForte123","role":"STARTUP","acceptedTerms":true}'
   curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"carga-investidor@teste.unio","documento":"00000000272","password":"senhaForte123","role":"INVESTOR","acceptedTerms":true}'
   # depois faça login com cada um e chame POST /api/profile/startup e POST /api/profile/investor
   ```

3. **k6:** instale ([guia oficial](https://grafana.com/docs/k6/latest/set-up/install-k6/))
   ou use Docker.

## 5. Execução

```bash
cd unio
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e STARTUP_EMAIL=carga-startup@teste.unio -e STARTUP_PASSWORD=senhaForte123 \
  -e INVESTOR_EMAIL=carga-investidor@teste.unio -e INVESTOR_PASSWORD=senhaForte123 \
  load-test/k6/unio-load-test.js
```

Com Docker (Linux/macOS, API rodando na máquina):

```bash
docker run --rm -i --network host -v "$PWD:/work" -w /work grafana/k6 run \
  -e BASE_URL=http://localhost:8080 -e STARTUP_EMAIL=... -e STARTUP_PASSWORD=... \
  -e INVESTOR_EMAIL=... -e INVESTOR_PASSWORD=... load-test/k6/unio-load-test.js
```

Variáveis opcionais: `PEAK_VUS` (padrão 50), `HOLD` (padrão `5m`).
O resumo aparece no terminal e o resultado completo vai para
`load-test/resultados/summary.json` (fora do git).

**Teste de estresse (opcional):** repita com `PEAK_VUS=100` e `PEAK_VUS=200` para
achar o ponto em que os critérios deixam de ser atendidos.

## 6. Resultados

Preencha uma linha por rodada.

| Data | Ambiente | VUs pico | Req/s | Erro % | p95 (ms) | p99 (ms) | Recomendações p95 | Mensagem p95 | Passou? |
|---|---|---|---|---|---|---|---|---|---|
| _aaaa-mm-dd_ | _local / Azure B1_ | 50 | | | | | | | |

Observações da rodada (CPU/memória do App Service e do PostgreSQL no portal,
erros no log stream, endpoint mais lento):

- _..._

## 7. Como interpretar e o que ajustar

| Sintoma | Causa provável | Ação |
|---|---|---|
| Recomendações lentas, CPU do banco alta | consulta de scores sem índice / cálculo por item | índices em `match_scores(investor_id)`; cache das recomendações |
| `GET /api/conversations` cresce com o nº de conversas | prévia e não lidas consultadas por conversa (N+1) | consulta agregada única para prévia + contagem |
| Erros 5xx com "Connection is not available" | pool do Hikari pequeno para a carga | aumentar `spring.datasource.hikari.maximum-pool-size` (padrão 10) respeitando o limite do SKU do banco |
| CPU do App Service > 80% | plano B1 (1 núcleo) | escalar para B2/S1 ou habilitar scale-out |

Os limites dos alertas do Azure (T17 — `docs/operacao/alertas-azure.md`) usam
estes resultados: ajuste `HttpResponseTime` e `active_connections` conforme o
que for medido aqui.
