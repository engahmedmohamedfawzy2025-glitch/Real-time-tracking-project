resource "aws_key_pair" "jenkins_key" {
  key_name   = "rt-jenkins-key"
  public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
}

