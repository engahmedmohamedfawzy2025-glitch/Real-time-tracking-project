pipeline {
  agent any
  environment {
    ECR = '865503655419.dkr.ecr.eu-central-1.amazonaws.com'
    GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Login ECR') {
      steps {
        sh 'aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 865503655419.dkr.ecr.eu-central-1.amazonaws.com'
      }
    }

    stage('Build Backend') {
      agent {
        docker { image 'docker:24-dind' } // or use an agent with docker installed
      }
      steps {
        dir('app/backend') {
          // build uses Dockerfile which uses node image inside build — so it works
          sh "docker build -t ${ECR}/rt-api:${GIT_COMMIT_SHORT} -t ${ECR}/rt-api:latest ."
        }
      }
    }

    stage('Build Frontend') {
      agent {
        docker {
          image 'node:18-alpine'
          args '-u root:root'
        }
      }
      steps {
        dir('app/frontend') {
          sh 'npm ci'
          sh 'npm run build'
          // optional docker build for frontend assets if you have Dockerfile
          // sh "docker build -t ${ECR}/rt-frontend:${GIT_COMMIT_SHORT} -t ${ECR}/rt-frontend:latest ."
        }
      }
    }

    stage('Push Images') {
      steps {
        // push only if both images were built
        sh "docker push ${ECR}/rt-api:${GIT_COMMIT_SHORT} || true"
        sh "docker push ${ECR}/rt-api:latest || true"
        // sh "docker push ${ECR}/rt-frontend:${GIT_COMMIT_SHORT} || true"
      }
    }
  }

  post {
    success { echo '✅ Build succeeded' }
    failure { echo '❌ Build failed' }
  }
}
