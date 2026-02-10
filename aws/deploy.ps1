# Bear Jetso Merchants API - 快速部署腳本
# 此腳本會自動完成所有部署步驟

Write-Host "🚀 Bear Jetso Merchants API - 自動部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 AWS CLI
Write-Host "步驟 1/7: 檢查 AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI 已安裝: $awsVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI 未安裝。請先安裝 AWS CLI。" -ForegroundColor Red
    Write-Host "下載: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# 檢查 AWS 憑證
Write-Host "`n步驟 2/7: 檢查 AWS 憑證..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ AWS 帳戶 ID: $($identity.Account)" -ForegroundColor Green
    Write-Host "✅ AWS 用戶: $($identity.Arn)" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS 憑證未配置。請運行: aws configure" -ForegroundColor Red
    exit 1
}

# 安裝 CDK 依賴
Write-Host "`n步驟 3/7: 安裝 CDK 依賴..." -ForegroundColor Yellow
Set-Location "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK 依賴安裝失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✅ CDK 依賴安裝完成" -ForegroundColor Green

# 安裝 Lambda 依賴
Write-Host "`n步驟 4/7: 安裝 Lambda 依賴..." -ForegroundColor Yellow
Set-Location "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\lambda"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lambda 依賴安裝失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Lambda 依賴安裝完成" -ForegroundColor Green

# Bootstrap CDK（如果需要）
Write-Host "`n步驟 5/7: Bootstrap CDK..." -ForegroundColor Yellow
Set-Location "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk"
$accountId = $identity.Account
$region = "ap-southeast-1"

Write-Host "正在 Bootstrap AWS 環境: $accountId/$region" -ForegroundColor Cyan
npx cdk bootstrap aws://$accountId/$region
Write-Host "✅ CDK Bootstrap 完成" -ForegroundColor Green

# 部署 Stack
Write-Host "`n步驟 6/7: 部署 AWS 資源..." -ForegroundColor Yellow
Write-Host "這可能需要幾分鐘時間..." -ForegroundColor Cyan
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 部署失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✅ AWS 資源部署完成" -ForegroundColor Green

# 遷移數據
Write-Host "`n步驟 7/7: 遷移商戶資料到 DynamoDB..." -ForegroundColor Yellow
Set-Location "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\scripts"
node migrate-merchants.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  數據遷移可能失敗，請手動檢查" -ForegroundColor Yellow
}
else {
    Write-Host "✅ 數據遷移完成" -ForegroundColor Green
}

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 在 AWS Console 查看部署的資源" -ForegroundColor White
Write-Host "2. 從 CDK 輸出中複製 API URL" -ForegroundColor White
Write-Host "3. 更新 .env 文件中的 REACT_APP_MERCHANTS_API_URL" -ForegroundColor White
Write-Host "4. 測試 API 端點" -ForegroundColor White
Write-Host ""
Write-Host "API 文檔: c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\README.md" -ForegroundColor Cyan
