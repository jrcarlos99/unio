# Alertas no Azure (T17 — RNF01)

O backend roda no Azure App Service (`unio-webapp`, grupo `unio-rg`, região
`brazilsouth`) com PostgreSQL Flexible Server. Os alertas abaixo avisam a equipe
por e-mail quando a disponibilidade ou o desempenho saem do esperado.

Os recursos ficam versionados como código em `infra/azure/alerts.bicep`.

## O que é monitorado

| Alerta | Recurso | Métrica | Condição | Severidade |
|---|---|---|---|---|
| `api-health-check` | Web App | `HealthCheckStatus` | média < 100% em 5 min | 0 — crítico |
| `db-alive` | PostgreSQL | `is_db_alive` | média < 1 em 5 min | 0 — crítico |
| `api-http-5xx` | Web App | `Http5xx` | > 5 erros em 5 min | 1 — erro |
| `db-storage` | PostgreSQL | `storage_percent` | > 80% em 1 h | 1 — erro |
| `api-response-time` | Web App | `HttpResponseTime` | média > 2 s em 15 min | 2 — aviso |
| `plan-cpu` | Plano App Service | `CpuPercentage` | média > 80% em 15 min | 2 — aviso |
| `plan-memory` | Plano App Service | `MemoryPercentage` | média > 85% em 15 min | 2 — aviso |
| `db-cpu` | PostgreSQL | `cpu_percent` | média > 80% em 15 min | 2 — aviso |
| `db-memory` | PostgreSQL | `memory_percent` | média > 85% em 15 min | 2 — aviso |
| `db-connections` | PostgreSQL | `active_connections` | máx. > 40 em 15 min | 2 — aviso |
| `resource-health` | grupo `unio-rg` | Resource Health | Web App ou banco indisponível/degradado | — |

Todos os alertas de métrica têm `autoMitigate` ligado: quando a métrica volta ao
normal, o Azure envia o e-mail de "resolvido".

Os limites de tempo de resposta (2 s) e de conexões (40) vêm do teste de carga
(T18, `docs/testes/teste-de-carga.md`). Revise-os depois de cada rodada de teste.

## Health check

O alerta `api-health-check` depende do **health check do App Service** apontando
para `/actuator/health` (rota pública, já liberada no `SecurityConfig`). O script
de deploy ativa essa configuração. Com ele ativo, o App Service também tira de
rotação instâncias que falham repetidamente.

## Como aplicar

Pré-requisitos: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
e `az login` com permissão de colaborador no grupo `unio-rg`.

```bash
cd unio

# Descubra os nomes do plano e do banco
az appservice plan list -g unio-rg -o table
az postgres flexible-server list -g unio-rg -o table

ALERT_EMAIL=equipe@exemplo.com \
APP_SERVICE_PLAN=<nome-do-plano> \
POSTGRES_SERVER=<nome-do-servidor> \
./infra/azure/deploy-alerts.sh
```

O deploy é idempotente: rodar de novo atualiza os alertas existentes.

## Como testar

1. **E-mail:** Portal → Monitor → Alertas → Grupos de ações → `ag-unio-prod` →
   *Testar* → tipo "E-mail".
2. **Health check:** pare o Web App por alguns minutos
   (`az webapp stop -g unio-rg -n unio-webapp`) e confirme o e-mail do alerta
   crítico; depois `az webapp start ...` e confirme o "resolvido".
3. **5xx:** em ambiente de homologação, gere erros (ex.: banco indisponível) e
   verifique o alerta `api-http-5xx`.

## Resposta a incidentes (resumo)

| Alerta | Primeira ação |
|---|---|
| Health check / 5xx | Ver *Log stream* do Web App e `/actuator/health`; checar conexão com o banco |
| Banco fora do ar | Ver Resource Health do PostgreSQL; checar firewall/credenciais (`DB_URL`) |
| CPU/memória/tempo de resposta | Conferir pico de uso; considerar escalar o plano (B1 → B2/S1) |
| Armazenamento do banco | Aumentar o storage do servidor; revisar crescimento de `messages` e `audit_logs` |
