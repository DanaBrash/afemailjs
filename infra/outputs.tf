data "azurerm_client_config" "current" {}

output "resource_group"          { value = azurerm_resource_group.rg.name }
output "function_app_name"       { value = azurerm_linux_function_app.func.name }
output "function_default_hostname" { value = azurerm_linux_function_app.func.default_hostname }

# OIDC outputs (only if enabled)
output "deploy_oidc_client_id" {
  value       = try(azuread_application_registration.gh.client_id, "")
  description = "Use as AZURE_CLIENT_ID in GitHub Actions"
}
output "deploy_tenant_id" {
  value       = data.azurerm_client_config.current.tenant_id
  description = "Use as AZURE_TENANT_ID"
}
output "deploy_subscription_id" {
  value       = data.azurerm_client_config.current.subscription_id
  description = "Use as AZURE_SUBSCRIPTION_ID"
}
