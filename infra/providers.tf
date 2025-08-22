
terraform {
  required_version = ">=1.11.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.38.0"
    }
    random  = { source = "hashicorp/random",  version = "~> 3.6" }
    azuread = { source = "hashicorp/azuread", version = "~> 2.50" }
  }
}

provider "azuread" {}

provider "azurerm" {
  features {}
  subscription_id            = var.subscription_id
  tenant_id                  = var.tenant_id
}

