resource "aws_security_group" "jenkins_sg" {
  name        = "rt-jenkins-sg"
  description = "Allow SSH and Jenkins (public for demo)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH (Port 22)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Jenkins UI (Port 8080)"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rt-jenkins-sg"
  }
}

