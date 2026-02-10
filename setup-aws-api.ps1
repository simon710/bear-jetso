# AWS API 快速開始腳本
# 此腳本幫助你快速設置環境並部署 AWS 資源

Write-Host "🐻 小熊優惠助手 - AWS API 部署腳本" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 檢查是否已配置 AWS CLI
Write-Host "📋 步驟 1: 檢查 AWS CLI 配置..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    Write-Host "✅ AWS CLI 已配置" -ForegroundColor Green
    Write-Host "   賬號: $($awsIdentity.Account)" -ForegroundColor Gray
    Write-Host "   用戶: $($awsIdentity.Arn)`n" -ForegroundColor Gray
}
catch {
    Write-Host "❌ AWS CLI 未配置或配置錯誤" -ForegroundColor Red
    Write-Host "   請先運行: aws configure`n" -ForegroundColor Yellow
    exit 1
}

# 檢查 .env 文件
Write-Host "📋 步驟 2: 檢查環境變量文件..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env 文件不存在，從示例創建..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ 已創建 .env 文件`n" -ForegroundColor Green
}
else {
    Write-Host "✅ .env 文件已存在`n" -ForegroundColor Green
}

# 詢問是否部署 CDK
Write-Host "📋 步驟 3: 部署 AWS 基礎設施" -ForegroundColor Yellow
$deploy = Read-Host "是否要部署 CDK Stack? (y/n)"

if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "`n開始部署 CDK Stack...`n" -ForegroundColor Cyan
    
    # 進入 CDK 目錄
    Push-Location "aws\cdk"
    
    # 檢查是否已安裝依賴
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 安裝 CDK 依賴..." -ForegroundColor Yellow
        npm install
    }
    
    # 列出 Stacks
    Write-Host "`n可用的 Stacks:" -ForegroundColor Cyan
    cdk ls
    
    # 顯示將要創建的資源
    Write-Host "`n查看將要創建的資源..." -ForegroundColor Cyan
    cdk diff
    
    # 執行部署
    Write-Host "`n開始部署..." -ForegroundColor Cyan
    cdk deploy --require-approval never
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ CDK 部署成功！`n" -ForegroundColor Green
        
        # 獲取 API URL
        Write-Host "請從上面的輸出中找到 API Gateway URL" -ForegroundColor Yellow
        Write-Host "格式類似: MerchantsApiStack.MerchantsApiUrl = https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/`n" -ForegroundColor Gray
        
        $apiUrl = Read-Host "請輸入 API URL (或按 Enter 跳過)"
        
        if ($apiUrl) {
            # 更新 .env 文件
            Pop-Location
            $envContent = Get-Content ".env" -Raw
            $envContent = $envContent -replace 'REACT_APP_MERCHANTS_API_URL=.*', "REACT_APP_MERCHANTS_API_URL=$apiUrl"
            Set-Content ".env" $envContent
            Write-Host "✅ 已更新 .env 文件`n" -ForegroundColor Green
        }
    }
    else {
        Write-Host "`n❌ CDK 部署失敗`n" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

# 詢問是否遷移數據
Write-Host "`n📋 步驟 4: 遷移商家數據到 DynamoDB" -ForegroundColor Yellow
$migrate = Read-Host "是否要遷移數據? (y/n)"

if ($migrate -eq "y" -or $migrate -eq "Y") {
    Write-Host "`n開始遷移數據...`n" -ForegroundColor Cyan
    
    # 設置環境變量
    $env:AWS_REGION = "ap-southeast-1"
    $env:TABLE_NAME = "Merchants"
    
    # 執行遷移
    Push-Location "aws\scripts"
    node migrate-merchants.js
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ 數據遷移成功！`n" -ForegroundColor Green
    }
    else {
        Write-Host "`n❌ 數據遷移失敗`n" -ForegroundColor Red
    }
}

# 測試 API
Write-Host "`n📋 步驟 5: 測試 API" -ForegroundColor Yellow
$test = Read-Host "是否要測試 API? (需要已部署並遷移數據) (y/n)"

if ($test -eq "y" -or $test -eq "Y") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'REACT_APP_MERCHANTS_API_URL=(.+)') {
        $apiUrl = $matches[1].Trim()
        
        if ($apiUrl -notlike "*your-api-id*") {
            Write-Host "`n測試 API: $apiUrl/merchants`n" -ForegroundColor Cyan
            
            try {
                $response = Invoke-RestMethod -Uri "$apiUrl/merchants" -Method Get
                Write-Host "✅ API 測試成功！" -ForegroundColor Green
                Write-Host "   找到 $($response.count) 個商家`n" -ForegroundColor Gray
            }
            catch {
                Write-Host "❌ API 測試失敗: $($_.Exception.Message)`n" -ForegroundColor Red
            }
        }
        else {
            Write-Host "⚠️  請先更新 .env 文件中的 API URL`n" -ForegroundColor Yellow
        }
    }
}

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 設置完成！" -ForegroundColor Green
Write-Host "`n下一步:" -ForegroundColor Yellow
Write-Host "1. 運行 'npm start' 啟動應用" -ForegroundColor Gray
Write-Host "2. 檢查瀏覽器控制台確認 API 正常工作" -ForegroundColor Gray
Write-Host "3. 查看 DEPLOYMENT_CHECKLIST.md 了解更多細節`n" -ForegroundColor Gray
