
variable "subscription_id" {
  description = "The Azure Subscription ID"
  type        = string
  default     = "c1b1f12b-41c7-4fb3-b5ac-02e36ce1331e"
}
variable "tenant_id" {
  description = "The Azure Tenant ID"
  type        = string
  default     = "6dd7381d-4ace-410a-b7f3-011a192ebe60"
}

variable "project_name" {
  type    = string
  default = "afemailsjs"
}
variable "location" {
  type    = string
  default = "westus2"
}

variable "allowed_origins" {
  type    = list(string)
  default = ["https://tyranny.sucks", "http://localhost:5173"]
}

# EmailJS (public ids fine in state)
variable "emailjs_service_id" {
  type    = string
  default = "service_rnek34q"
}
variable "emailjs_template_id" {
  type    = string
  default = "template_g867h71"
}
variable "emailjs_public_key" {
  type    = string
  default = "Nhcs_vv_yPrheGumE"
}
variable "emailjs_private_key" {
  type      = string
  sensitive = true
  default   = "zNTc3DE3fW6rWdPwNPiVw"
}

# OIDC to Azure (optional: OFF by default so you can apply immediately)
variable "deploy_app_client_id" {
  type        = string
  description = "Application (client) ID of tf-deployer app registration"
  default     = "bdbc6bec-6f3d-48b9-99e9-6bbcc0ef51f5"
}

variable "github_owner" {
  type    = string
  default = "DanaBrash"
}

variable "github_repo" {
  type    = string
  default = "afemailjs"
}

variable "github_main_branch" {
  type    = string
  default = "main"
}

variable "enable_pr_oidc" {
  type    = bool
  default = false
}

variable "allow_role_assignments" {
  type    = bool
  default = false
}

