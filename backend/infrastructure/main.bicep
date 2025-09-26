targetScope = 'subscription'
param location string = deployment().location
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string
var principalIds = ['c431c925-8638-4d80-8ab5-7afa55354710'] // Object ID of the AAD identities. Must be a list of GUIDs.

resource resourcegroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-acidwatch-${environment}'
  location: location
}

module insights 'appinsight.bicep' = {
  scope: resourcegroup
  name: 'acidwatch-insights-deployment-${environment}'
  params: {
    location: location
    appInsightsName: 'acidwatch-insights-${environment}'
    logAnalyticsNamespaceName: 'acidwatch-insights-${environment}'
  }
}
