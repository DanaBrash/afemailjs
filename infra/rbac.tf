data "azuread_service_principal" "tf_deployer" {
  client_id = var.deploy_app_client_id
}


# RBAC: Contributor on the RG for tf-deployer (so it can deploy/update resources)
resource "azurerm_role_assignment" "tf_deploy_contrib_rg" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_service_principal.tf_deployer.object_id
}
