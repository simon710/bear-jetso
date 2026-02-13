# Bear Jetso Merchants API - Quick Deploy Script
# This script automates the deployment process.

Write-Host "🚀 Bear Jetso Merchants API - Auto Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check AWS CLI
Write-Host "Step 1/7: Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Step 2: Check AWS Credentials
Write-Host "`nStep 2/7: Checking AWS Credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ AWS Account ID: $($identity.Account)" -ForegroundColor Green
    Write-Host "✅ AWS User: $($identity.Arn)" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS credentials not configured. Please run: aws configure" -ForegroundColor Red
    exit 1
}

# Step 3: Install CDK Dependencies
Write-Host "`nStep 3/7: Installing CDK dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\cdk"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK dependencies installation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ CDK dependencies installation complete" -ForegroundColor Green

# Step 4: Install Lambda Dependencies
Write-Host "`nStep 4/7: Installing Lambda dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\lambda"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lambda dependencies installation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Lambda dependencies installation complete" -ForegroundColor Green

# Step 5: Bootstrap CDK
Write-Host "`nStep 5/7: Bootstrapping CDK..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\cdk"
$accountId = $identity.Account
$region = "ap-southeast-1"

Write-Host "Bootstrapping AWS environment: $accountId/$region" -ForegroundColor Cyan
npx cdk bootstrap "aws://$accountId/$region"
Write-Host "✅ CDK Bootstrap complete" -ForegroundColor Green

# Step 6: Deploy Stack
Write-Host "`nStep 6/7: Deploying AWS resources..." -ForegroundColor Yellow
Write-Host "This might take a few minutes..." -ForegroundColor Cyan
npx cdk deploy --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ AWS resources deployment complete" -ForegroundColor Green

# Step 7: Migrate Data
Write-Host "`nStep 7/7: Migrating merchant data to DynamoDB..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\scripts"
node migrate-merchants.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Data migration may have failed, please check manually." -ForegroundColor Yellow
}
else {
    Write-Host "✅ Data migration complete" -ForegroundColor Green
}

# Wrap up
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check your AWS Console for resources" -ForegroundColor White
Write-Host "2. Copy the API URL from the CDK output" -ForegroundColor White
Write-Host "3. Update REACT_APP_MERCHANTS_API_URL in .env" -ForegroundColor White
Write-Host ""
Write-Host "API documentation is in aws\README.md" -ForegroundColor Cyan
