module "naming" {
  source = "git::https://github.com/DanaBrash/calabashnaming.git" # switch back for external tests
  suffix = local.suffix
}

resource "azurerm_resource_group" "rg" {
  name     = module.naming.resource_group.name
  location = local.location
}
