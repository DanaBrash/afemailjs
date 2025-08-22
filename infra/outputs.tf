data "azurerm_client_config" "current" {}

output "resource_group"          { value = azurerm_resource_group.rg.name }
output "function_app_name"       { value = azurerm_linux_function_app.func.name }
output "function_default_hostname" { value = azurerm_linux_function_app.func.default_hostname }
output "uami_client_id"  { value = azurerm_user_assigned_identity.uami.client_id }
output "uami_principal_id" { value = azurerm_user_assigned_identity.uami.principal_id }

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

output "tf_deployer_object_id" {
  value = data.azuread_service_principal.tf_deployer.object_id
}

output "fic_subject_main" {
  value = "repo:${var.github_owner}/${var.github_repo}:ref:refs/heads/${var.github_main_branch}"
}

output "fic_subject_pr" {
  value = var.enable_pr_oidc ? "repo:${var.github_owner}/${var.github_repo}:pull_request" : null
}
