data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (Ubuntu Publisher)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "jenkins" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  subnet_id                   = aws_subnet.public_a.id
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.jenkins_sg.id]
  key_name                    = aws_key_pair.jenkins_key.key_name
  iam_instance_profile        = aws_iam_instance_profile.jenkins_profile.name

  tags = {
    Name = "rt-jenkins"
  }
}

output "jenkins_public_ip" {
  value = aws_instance.jenkins.public_ip
}

