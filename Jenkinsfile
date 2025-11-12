// Jenkinsfile - use docker run for frontend build (no Docker Pipeline plugin required)
pipeline {
  agent any

  environment {
    ECR = '865503655419.dkr.ecr.eu-central-1.amazonaws.com'
    AWS_REGION = 'eu-central-1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          echo "Commit short: ${env.GIT_COMMIT_SHORT}"
        }
      }
    }

    stage('Login to ECR') {
      steps {
        sh """
          aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR}
        """
      }
    }

    stage('Build Backend') {
      steps {
        dir('app/backend') {
          sh """
            echo "Building backend Docker image..."
            docker build -t ${ECR}/rt-api:${GIT_COMMIT_SHORT} -t ${ECR}/rt-api:latest .
          """
        }
      }
    }

    stage('Build Frontend') {
      steps {
        dir('app/frontend') {
          // Use docker run to perform npm install & build inside node image
          sh '''
            echo "Building frontend inside node:18-alpine container..."

            # run the node container mounting current workspace, execute npm commands
            docker run --rm \
              -v "$(pwd)":/app \
              -w /app \
              -u "$(id -u)":"$(id -g)" \
              node:18-alpine \
              sh -c "npm ci --silent && npm run build"

            status=$?
            if [ $status -ne 0 ]; then
              echo "Frontend build failed inside container (exit $status)"
              exit $status
            fi

            echo "Frontend build succeeded."
          '''
        }
      }
    }

    stage('Push Images') {
      steps {
        script {
          echo "Pushing backend images to ECR..."
          sh "docker push ${ECR}/rt-api:${GIT_COMMIT_SHORT}"
          sh "docker push ${ECR}/rt-api:latest"
          // If you choose to dockerize frontend, build & push it here similarly.
        }
      }
    }
  }

  post {
    success { echo "✅ Pipeline succeeded. Backend image pushed: ${ECR}/rt-api:${GIT_COMMIT_SHORT}" }
    failure { echo "❌ Pipeline failed — check logs above for the failing stage." }
    always { echo "Pipeline finished at: ${new Date()}" }
  }
}
