module "naming" {
  source =  "git::https://github.com/DanaBrash/calabashNaming.git?ref=main" # switch back for external tests
  suffix = local.suffix
}

# https://github.com/DanaBrash/calabashNaming

resource "azurerm_resource_group" "rg" {
  name     = module.naming.resource_group.name
  location = local.location
}

# User-Assigned Managed Identity (shared across RG)
resource "azurerm_user_assigned_identity" "uami" {
  name                = module.naming.user_assigned_identity.name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# Give that identity Contributor on the RG (scope as you prefer)
resource "azurerm_role_assignment" "uami_contributor_rg" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.uami.principal_id
}