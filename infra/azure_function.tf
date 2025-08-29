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
    cors {
      allowed_origins     = var.allowed_origins
      support_credentials = false # set true ONLY if you use cookies/auth
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    WEBSITE_RUN_FROM_PACKAGE = "1"
    EMAILJS_ENDPOINT         = "https://api.emailjs.com/api/v1.0/email/send"
    EMAILJS_SERVICE_ID       = var.emailjs_service_id
    EMAILJS_TEMPLATE_ID      = var.emailjs_template_id
    EMAILJS_PUBLIC_KEY       = var.emailjs_public_key
    EMAILJS_PRIVATE_KEY      = var.emailjs_private_key
    ALLOWED_ORIGINS          = join(",", var.allowed_origins)
    AZURE_CLIENT_ID          = azurerm_user_assigned_identity.uami.client_id
  }


}

