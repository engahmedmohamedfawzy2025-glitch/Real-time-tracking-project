// Jenkinsfile - corrected: proper quoting, robust frontend docker run, good logging
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
          // Build frontend inside node:18-alpine; ensure both commands run inside container
          // Run as root to avoid permission problems; use set -eux to show errors/commands
          sh '''
            echo "Building frontend inside node:18-alpine container (all commands run INSIDE container)..."

            docker run --rm \
              -v "$(pwd)":/app \
              -w /app \
              node:18-alpine \
              sh -c 'set -eux; \
                     # optionally configure npm cache dir if needed: mkdir -p /tmp/npm-cache; export npm_config_cache=/tmp/npm-cache; \
                     npm ci --silent; \
                     npm run build'

            rc=$?
            if [ $rc -ne 0 ]; then
              echo "Frontend build FAILED inside container (exit code $rc)"
              exit $rc
            fi

            echo "Frontend build SUCCEEDED."
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
          // If you want to dockerize frontend, build & push here.
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
