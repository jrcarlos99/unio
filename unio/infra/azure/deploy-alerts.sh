#!/usr/bin/env bash
# T17 — Configura health check e alertas do backend UNIO no Azure (RNF01).
#
# Pré-requisitos: Azure CLI logado (az login) com permissão no grupo de recursos.
#
# Uso:
#   ALERT_EMAIL=equipe@exemplo.com \
#   APP_SERVICE_PLAN=<nome-do-plano> \
#   POSTGRES_SERVER=<nome-do-servidor-postgres> \
#   ./infra/azure/deploy-alerts.sh
#
# Variáveis opcionais: RESOURCE_GROUP (unio-rg), WEB_APP (unio-webapp), ENVIRONMENT (prod),
#                      MAX_DB_CONNECTIONS (40)
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-unio-rg}"
WEB_APP="${WEB_APP:-unio-webapp}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
MAX_DB_CONNECTIONS="${MAX_DB_CONNECTIONS:-40}"
: "${ALERT_EMAIL:?Defina ALERT_EMAIL}"
: "${APP_SERVICE_PLAN:?Defina APP_SERVICE_PLAN (az appservice plan list -g $RESOURCE_GROUP -o table)}"
: "${POSTGRES_SERVER:?Defina POSTGRES_SERVER (az postgres flexible-server list -g $RESOURCE_GROUP -o table)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/3 Ativando o health check do App Service em /actuator/health"
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEB_APP" \
  --generic-configurations '{"healthCheckPath": "/actuator/health"}' \
  --output none

echo "==> 2/3 Validando o template de alertas"
az deployment group validate \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/alerts.bicep" \
  --parameters alertEmail="$ALERT_EMAIL" \
               webAppName="$WEB_APP" \
               appServicePlanName="$APP_SERVICE_PLAN" \
               postgresServerName="$POSTGRES_SERVER" \
               environment="$ENVIRONMENT" \
               maxActiveConnections="$MAX_DB_CONNECTIONS" \
  --output none

echo "==> 3/3 Criando grupo de ações e alertas"
az deployment group create \
  --name "unio-alerts-$(date +%Y%m%d%H%M%S)" \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/alerts.bicep" \
  --parameters alertEmail="$ALERT_EMAIL" \
               webAppName="$WEB_APP" \
               appServicePlanName="$APP_SERVICE_PLAN" \
               postgresServerName="$POSTGRES_SERVER" \
               environment="$ENVIRONMENT" \
               maxActiveConnections="$MAX_DB_CONNECTIONS" \
  --query "properties.outputs.alertNames.value" \
  --output table

echo
echo "Pronto. Confira em: Portal do Azure > Monitor > Alertas > Regras de alerta"
echo "Para testar o e-mail: Monitor > Alertas > Grupos de ações > ag-unio-$ENVIRONMENT > Testar"
