
terraform {
  backend "azurerm" {
    resource_group_name  = "env-rg"
    storage_account_name = "calabashtfstate"
    container_name       = "tfstate"
    key                  = "afemailjs/terraform.tfstate"
  }
}
