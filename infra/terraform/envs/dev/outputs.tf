output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public_a.id
}

output "ecr_repositories" {
  value = {
    api      = aws_ecr_repository.api.repository_url
    frontend = aws_ecr_repository.frontend.repository_url
  }
}

