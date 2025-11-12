// Jenkinsfile - compatible with agents that DO NOT have Docker Pipeline plugin
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
          // robust frontend build: use existing node/npm if available;
          // otherwise try apt / yum / apk installers (common Linux distros),
          // otherwise fail with clear message.
          sh '''
            echo "Preparing frontend build..."

            if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 ; then
              echo "Node and npm found: $(node -v) / $(npm -v)"
            else
              echo "Node/npm not found. Attempting to install Node 18..."
              if command -v apt-get >/dev/null 2>&1 ; then
                echo "Detected apt-get. Installing via NodeSource..."
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - || { echo "NodeSource setup failed"; exit 1; }
                sudo apt-get install -y nodejs || { echo "apt-get install nodejs failed"; exit 1; }
              elif command -v yum >/dev/null 2>&1 ; then
                echo "Detected yum. Installing via NodeSource..."
                curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - || { echo "NodeSource setup failed"; exit 1; }
                sudo yum install -y nodejs || { echo "yum install nodejs failed"; exit 1; }
              elif command -v apk >/dev/null 2>&1 ; then
                echo "Detected apk (Alpine). Installing nodejs & npm via apk..."
                sudo apk add --no-cache nodejs npm || { echo "apk add nodejs failed"; exit 1; }
              else
                echo "No supported package manager found (apt-get/yum/apk). Cannot install Node. Please ensure node/npm available on agent or install Node manually."
                exit 2
              fi
              echo "Installed Node: $(node -v) / $(npm -v || echo 'npm not found')"
            fi

            echo "Running npm ci..."
            npm ci --silent || { echo "npm ci failed"; exit 3; }

            echo "Running frontend build..."
            npm run build || { echo "npm run build failed"; exit 4; }

            echo "Frontend build finished successfully."
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
          // Uncomment below lines if you build a frontend Docker image
          // sh "docker push ${ECR}/rt-frontend:${GIT_COMMIT_SHORT}"
          // sh "docker push ${ECR}/rt-frontend:latest"
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline succeeded — pushed: ${ECR}/rt-api:${GIT_COMMIT_SHORT}"
    }
    failure {
      echo "❌ Pipeline failed — check the stage logs above for error codes."
    }
    always {
      echo "Pipeline finished at: ${new Date()}"
    }
  }
}
