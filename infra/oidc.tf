# Look up your tf-deployer app by its Application (client) ID
data "azuread_application" "tf_deployer" {
  client_id = var.deploy_app_client_id
}

# (If you also use RBAC elsewhere)
data "azuread_service_principal" "tf_deployer" {
  client_id = var.deploy_app_client_id
}

# GitHub OIDC FIC for pushes to main
resource "azuread_application_federated_identity_credential" "gh_main" {
  # v3 syntax: this is the APPLICATION OBJECT ID
  count = can(data.azurerm_resource_group.existing_rg.id) ? 0 : 1 
  application_id = data.azuread_application.tf_deployer.id
  display_name = "gh-oidc-main"
  description  = "GitHub Actions OIDC for main branch"
  issuer       = "https://token.actions.githubusercontent.com"
  subject      = "repo:${var.github_owner}/${var.github_repo}:ref:refs/heads/${var.github_main_branch}"
  audiences    = ["api://AzureADTokenExchange"]
}

# OPTIONAL: FIC for pull_request event (enable via var.enable_pr_oidc)
resource "azuread_application_federated_identity_credential" "gh_pr" {
  count          = var.enable_pr_oidc ? 1 : 0
  application_id = data.azuread_application.tf_deployer.id

  display_name = "gh-oidc-pull-request"
  description  = "GitHub Actions OIDC for PRs"
  issuer       = "https://token.actions.githubusercontent.com"
  subject      = "repo:${var.github_owner}/${var.github_repo}:pull_request"
  audiences    = ["api://AzureADTokenExchange"]
}

# RBAC: Contributor on the RG for tf-deployer (so it can deploy/update resources)
resource "azurerm_role_assignment" "tf_deployer_contrib" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_service_principal.tf_deployer.object_id
}

