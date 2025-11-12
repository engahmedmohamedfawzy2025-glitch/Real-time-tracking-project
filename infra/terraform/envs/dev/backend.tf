terraform {
  backend "s3" {
    bucket       = "rt-tracking-tf-state-1762770389"
    key          = "envs/dev/terraform.tfstate"
    region       = "eu-central-1"
    use_lockfile = true
    encrypt      = true
  }
}

