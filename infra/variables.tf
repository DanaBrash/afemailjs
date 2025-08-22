
variable "subscription_id" {
  description = "The Azure Subscription ID"
  type        = string
  default    = "c1b1f12b-41c7-4fb3-b5ac-02e36ce1331e"
}
variable "tenant_id" {
  description = "The Azure Tenant ID"
  type        = string
  default    = "6dd7381d-4ace-410a-b7f3-011a192ebe60"
}


variable "project_name"      {
  type = string 
  default = "afemailsjs"
  }
variable "location"          { 
  type = string
  default = "westus2" 
  }

variable "allowed_origins" {
  type    = list(string)
  default = ["https://tyranny.sucks", "http://localhost:5173"]
}

# EmailJS (public ids fine in state)
variable "emailjs_service_id" { 
  type = string 
  default = "service_rnek34q" 
  }
variable "emailjs_template_id"{ 
  type = string 
  default = "template_hzcvjoc" 
  }
variable "emailjs_user_id"    { 
  type = string 
  default = "Nhcs_vv_yPrheGumE" 
  }
variable "emailjs_private_key"{ 
  type = string 
  sensitive = true
  default = "" 
  }

# OIDC to Azure (optional: OFF by default so you can apply immediately)
variable "enable_oidc"   { 
  type = bool   
  default = false 
  }
variable "github_owner"  { 
  type = string 
  default = "" 
  }
variable "github_repo"   { 
  type = string 
  default = "" 
  }
variable "github_branch" { 
  type = string 
  default = "main" 
  }
