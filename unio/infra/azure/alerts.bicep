// T17 — Alertas no Azure (RNF01 — disponibilidade)
//
// Cria um grupo de ações (e-mail) e alertas de métrica para:
//   - App Service (unio-webapp): erros 5xx, tempo de resposta, health check
//   - Plano do App Service: CPU e memória
//   - PostgreSQL Flexible Server: banco fora do ar, CPU, memória, armazenamento, conexões
//   - Resource Health: indisponibilidade da plataforma no grupo de recursos
//
// Deploy: veja infra/azure/deploy-alerts.sh e docs/operacao/alertas-azure.md

targetScope = 'resourceGroup'

@description('E-mail (ou lista de distribuição) que recebe os alertas')
param alertEmail string

@description('Nome do Web App do backend')
param webAppName string = 'unio-webapp'

@description('Nome do plano do App Service onde o Web App roda')
param appServicePlanName string

@description('Nome do servidor PostgreSQL Flexible Server')
param postgresServerName string

@description('Sufixo de ambiente usado nos nomes dos recursos de alerta')
@allowed(['prod', 'staging', 'dev'])
param environment string = 'prod'

@description('Limite de conexões ativas no PostgreSQL antes de alertar (ajuste ao SKU)')
param maxActiveConnections int = 40

resource webApp 'Microsoft.Web/sites@2023-12-01' existing = {
  name: webAppName
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: appServicePlanName
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' existing = {
  name: postgresServerName
}

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-unio-${environment}'
  location: 'global'
  properties: {
    groupShortName: 'unio-${environment}'
    enabled: true
    emailReceivers: [
      {
        name: 'equipe-unio'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// Severidade: 0 crítico · 1 erro · 2 aviso · 3 informativo
var metricAlertDefinitions = [
  {
    name: 'unio-${environment}-api-http-5xx'
    description: 'API devolvendo erros 5xx (mais de 5 em 5 minutos)'
    severity: 1
    scope: webApp.id
    namespace: 'Microsoft.Web/sites'
    metric: 'Http5xx'
    aggregation: 'Total'
    operator: 'GreaterThan'
    threshold: 5
    frequency: 'PT1M'
    window: 'PT5M'
  }
  {
    name: 'unio-${environment}-api-response-time'
    description: 'Tempo médio de resposta da API acima de 2 segundos'
    severity: 2
    scope: webApp.id
    namespace: 'Microsoft.Web/sites'
    metric: 'HttpResponseTime'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 2
    frequency: 'PT5M'
    window: 'PT15M'
  }
  {
    name: 'unio-${environment}-api-health-check'
    description: 'Health check (/actuator/health) falhando em alguma instância'
    severity: 0
    scope: webApp.id
    namespace: 'Microsoft.Web/sites'
    metric: 'HealthCheckStatus'
    aggregation: 'Average'
    operator: 'LessThan'
    threshold: 100
    frequency: 'PT1M'
    window: 'PT5M'
  }
  {
    name: 'unio-${environment}-plan-cpu'
    description: 'CPU do plano do App Service acima de 80%'
    severity: 2
    scope: appServicePlan.id
    namespace: 'Microsoft.Web/serverfarms'
    metric: 'CpuPercentage'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 80
    frequency: 'PT5M'
    window: 'PT15M'
  }
  {
    name: 'unio-${environment}-plan-memory'
    description: 'Memória do plano do App Service acima de 85%'
    severity: 2
    scope: appServicePlan.id
    namespace: 'Microsoft.Web/serverfarms'
    metric: 'MemoryPercentage'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 85
    frequency: 'PT5M'
    window: 'PT15M'
  }
  {
    name: 'unio-${environment}-db-alive'
    description: 'PostgreSQL não está respondendo'
    severity: 0
    scope: postgres.id
    namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
    metric: 'is_db_alive'
    aggregation: 'Average'
    operator: 'LessThan'
    threshold: 1
    frequency: 'PT1M'
    window: 'PT5M'
  }
  {
    name: 'unio-${environment}-db-cpu'
    description: 'CPU do PostgreSQL acima de 80%'
    severity: 2
    scope: postgres.id
    namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
    metric: 'cpu_percent'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 80
    frequency: 'PT5M'
    window: 'PT15M'
  }
  {
    name: 'unio-${environment}-db-memory'
    description: 'Memória do PostgreSQL acima de 85%'
    severity: 2
    scope: postgres.id
    namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
    metric: 'memory_percent'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 85
    frequency: 'PT5M'
    window: 'PT15M'
  }
  {
    name: 'unio-${environment}-db-storage'
    description: 'Armazenamento do PostgreSQL acima de 80%'
    severity: 1
    scope: postgres.id
    namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
    metric: 'storage_percent'
    aggregation: 'Average'
    operator: 'GreaterThan'
    threshold: 80
    frequency: 'PT15M'
    window: 'PT1H'
  }
  {
    name: 'unio-${environment}-db-connections'
    description: 'Conexões ativas no PostgreSQL acima do limite configurado'
    severity: 2
    scope: postgres.id
    namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
    metric: 'active_connections'
    aggregation: 'Maximum'
    operator: 'GreaterThan'
    threshold: maxActiveConnections
    frequency: 'PT5M'
    window: 'PT15M'
  }
]

resource metricAlerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [for definition in metricAlertDefinitions: {
  name: definition.name
  location: 'global'
  properties: {
    description: definition.description
    severity: definition.severity
    enabled: true
    scopes: [
      definition.scope
    ]
    evaluationFrequency: definition.frequency
    windowSize: definition.window
    autoMitigate: true
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'criterio'
          criterionType: 'StaticThresholdCriterion'
          metricNamespace: definition.namespace
          metricName: definition.metric
          timeAggregation: definition.aggregation
          operator: definition.operator
          threshold: definition.threshold
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}]

// Avisa quando o Azure marca o Web App ou o banco como indisponível/degradado
resource resourceHealthAlert 'Microsoft.Insights/activityLogAlerts@2020-10-01' = {
  name: 'unio-${environment}-resource-health'
  location: 'global'
  properties: {
    description: 'Resource Health: Web App ou PostgreSQL indisponível ou degradado'
    enabled: true
    scopes: [
      resourceGroup().id
    ]
    condition: {
      allOf: [
        {
          field: 'category'
          equals: 'ResourceHealth'
        }
        {
          anyOf: [
            {
              field: 'resourceType'
              equals: 'Microsoft.Web/sites'
            }
            {
              field: 'resourceType'
              equals: 'Microsoft.DBforPostgreSQL/flexibleServers'
            }
          ]
        }
      ]
    }
    actions: {
      actionGroups: [
        {
          actionGroupId: actionGroup.id
        }
      ]
    }
  }
}

output actionGroupId string = actionGroup.id
output alertNames array = [for definition in metricAlertDefinitions: definition.name]
