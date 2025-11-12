// Jenkinsfile - Declarative pipeline (compatible with agents that have Docker & aws cli)
pipeline {
  agent any

  environment {
    ECR = '865503655419.dkr.ecr.eu-central-1.amazonaws.com'
    AWS_REGION = 'eu-central-1'
    // GIT_COMMIT_SHORT will be set at runtime in the pipeline script
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          // set short commit hash in environment for tagging
          env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          echo "Commit short: ${env.GIT_COMMIT_SHORT}"
        }
      }
    }

    stage('Login to ECR') {
      steps {
        // assumes aws CLI is configured on the agent with proper creds/role
        sh """
          aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR}
        """
      }
    }

    stage('Build Backend') {
      steps {
        dir('app/backend') {
          script {
            // build Docker image for backend on the agent host
            sh "docker build -t ${ECR}/rt-api:${GIT_COMMIT_SHORT} -t ${ECR}/rt-api:latest ."
          }
        }
      }
    }

    stage('Build Frontend') {
      steps {
        dir('app/frontend') {
          script {
            // Run frontend build inside official Node image so npm is available
            docker.image('node:18-alpine').inside('-u root:root') {
              // ensure we have correct permissions if writing build artifacts
              sh '''
                npm ci --silent
                npm run build
              '''
            }
            // Optional: if you have a Dockerfile for frontend and want to build an image:
            // sh "docker build -t ${ECR}/rt-frontend:${GIT_COMMIT_SHORT} -t ${ECR}/rt-frontend:latest ."
          }
        }
      }
    }

    stage('Push Images') {
      steps {
        script {
          // Push backend image(s)
          sh "docker push ${ECR}/rt-api:${GIT_COMMIT_SHORT}"
          sh "docker push ${ECR}/rt-api:latest"

          // If you built a frontend image uncomment these lines above and push:
          // sh "docker push ${ECR}/rt-frontend:${GIT_COMMIT_SHORT}"
          // sh "docker push ${ECR}/rt-frontend:latest"
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline succeeded. Images pushed: ${ECR}/rt-api:${GIT_COMMIT_SHORT}"
    }
    failure {
      echo "❌ Pipeline failed — check the logs above."
    }
    always {
      // Optional cleanup if needed
      echo "Pipeline finished at: ${new Date()}"
    }
  }
}
