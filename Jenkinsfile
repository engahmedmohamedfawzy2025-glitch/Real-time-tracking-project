pipeline {
  agent any
  environment {
    AWS_REGION = 'eu-central-1'
    ACCOUNT_ID = sh(returnStdout: true, script: "aws sts get-caller-identity --query Account --output text").trim()
    ECR_API    = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/rt-api"
    ECR_FE     = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/rt-frontend"
    COMMIT     = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
  }
  stages {
    stage('Checkout'){ steps { checkout scm } }

    stage('Login ECR'){
      steps {
        sh '''
          aws ecr get-login-password --region $AWS_REGION | \
          docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
        '''
      }
    }

    stage('Build Backend'){
      steps {
        dir('app/backend'){
          sh 'docker build -t $ECR_API:$COMMIT -t $ECR_API:latest .'
        }
      }
    }

    stage('Build Frontend'){
      steps {
        dir('app/frontend'){
          sh '''
            npm ci
            npm run build
            echo "FROM nginx:alpine\nCOPY build/ /usr/share/nginx/html" > Dockerfile
            docker build -t $ECR_FE:$COMMIT -t $ECR_FE:latest .
          '''
        }
      }
    }

    stage('Push Images'){
      steps {
        sh '''
          docker push $ECR_API:$COMMIT
          docker push $ECR_API:latest
          docker push $ECR_FE:$COMMIT
          docker push $ECR_FE:latest
        '''
      }
    }
  }
  post {
    success { echo "✅ Images pushed successfully: $ECR_API:$COMMIT and $ECR_FE:$COMMIT" }
    failure { echo "❌ Build failed! Check logs." }
  }
}
