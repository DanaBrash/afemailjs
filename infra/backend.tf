
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-mailjs"
    storage_account_name = "stmailjstfstate"
    container_name       = "tfstate"
    key                  = "afemailjs/terraform.tfstate"
  }
}
