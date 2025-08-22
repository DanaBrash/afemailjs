resource "azurerm_service_plan" "plan" {
  name                = module.naming.app_service_plan.name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "Y1" # Linux Consumption
}


resource "azurerm_linux_function_app" "func" {
  name                       = module.naming.function_app.name
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  service_plan_id            = azurerm_service_plan.plan.id
  storage_account_name       = azurerm_storage_account.sa.name
  storage_account_access_key = azurerm_storage_account.sa.primary_access_key

  functions_extension_version = "~4"

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.uami.id]
  }

  site_config {
    application_stack { node_version = "20" }
    # cors { allowed_origins = ["http://localhost:5173","http://localhost:3000"] } # your code handles CORS
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    WEBSITE_RUN_FROM_PACKAGE = "1"
    EMAILJS_ENDPOINT         = "https://api.emailjs.com/api/v1.0/email/send"
    EMAILJS_SERVICE_ID       = var.emailjs_service_id
    EMAILJS_TEMPLATE_ID      = var.emailjs_template_id
    EMAILJS_USER_ID          = var.emailjs_user_id
    EMAILJS_PRIVATE_KEY      = var.emailjs_private_key
    ALLOWED_ORIGINS          = join(",", var.allowed_origins)
    AZURE_CLIENT_ID          = azurerm_user_assigned_identity.uami.client_id
  }
}

resource "azuread_application_registration" "gh" {
  display_name     = "${module.naming.function_app.name}-appreg"
  description      = "EmailJS Function App Registration"
  sign_in_audience = "AzureADMyOrg"
}

resource "azuread_service_principal" "gh" {
  count     = var.enable_pr_oidc ? 1 : 0
  client_id = azuread_application_registration.gh.client_id
}

resource "azuread_application_federated_identity_credential" "gh" {
  application_id = azuread_application_registration.gh.id
  display_name   = "my-repo-deploy"
  description    = "Deployments for my-repo"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:my-organization/my-repo:environment:prod"
}

resource "azurerm_role_assignment" "gh_contrib_rg" {
  count                = var.enable_pr_oidc ? 1 : 0
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.gh[0].object_id
}
