# 🚀 手動部署 AWS API - 分步指南

## 前置條件檢查

✅ AWS CLI 已配置 (aws configure 正在運行)
✅ CDK 依賴已安裝
✅ .env 文件已創建

## 部署步驟

### 步驟 1: 打開新的 PowerShell 終端

在項目根目錄 `c:\Users\Simon\Desktop\AI Project\bear_jetso`

### 步驟 2: 進入 CDK 目錄

```powershell
cd aws\cdk
```

### 步驟 3: 檢查 AWS 憑證

```powershell
aws sts get-caller-identity
```

應該看到您的 AWS 賬號信息。

### 步驟 4: Bootstrap CDK (首次部署需要)

```powershell
cdk bootstrap aws://ACCOUNT-ID/ap-southeast-1
```

將 `ACCOUNT-ID` 替換為您的 AWS 賬號 ID (從步驟 3 獲得)

### 步驟 5: 查看將要創建的資源

```powershell
npm run synth
```

這會顯示 CloudFormation 模板。

### 步驟 6: 部署 Stack

```powershell
npm run deploy
```

或

```powershell
cdk deploy --require-approval never
```

### 步驟 7: 記錄輸出

部署成功後，您會看到類似這樣的輸出：

```
BearJetsoMerchantsApiStack.ApiUrl = https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/
BearJetsoMerchantsApiStack.Region = ap-southeast-1
BearJetsoMerchantsApiStack.TableName = Merchants
```

**重要**: 複製 ApiUrl 的值！

### 步驟 8: 更新 .env 文件

回到項目根目錄，編輯 `.env` 文件：

```env
REACT_APP_MERCHANTS_API_URL=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod
REACT_APP_USE_API_FIRST=true
```

將 `https://xxxxx...` 替換為步驟 7 中的 ApiUrl

### 步驟 9: 遷移數據到 DynamoDB

```powershell
cd ..\scripts
$env:AWS_REGION="ap-southeast-1"
$env:TABLE_NAME="Merchants"
node migrate-merchants.js
```

應該看到：
```
開始遷移商戶資料到 DynamoDB...
找到 18 個商戶
✅ 遷移完成！
```

### 步驟 10: 測試 API

```powershell
# 測試獲取所有商家
Invoke-RestMethod -Uri "https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/merchants"
```

應該返回商家數據的 JSON。

### 步驟 11: 重啟 React 應用

回到項目根目錄：

```powershell
cd ..\..
```

停止當前的 `npm run start` (Ctrl+C)，然後重新啟動：

```powershell
npm start
```

### 步驟 12: 驗證

打開瀏覽器控制台 (F12)，應該看到：

```
正在從 AWS API 加載商家數據...
從 API 獲取商戶資料... https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod
✅ 成功加載 18 個商家
```

## 🐛 故障排查

### CDK Bootstrap 失敗

如果 bootstrap 失敗，可能是權限問題。確保您的 AWS 用戶有以下權限：
- CloudFormation
- S3
- IAM (創建角色)
- Lambda
- API Gateway
- DynamoDB

### CDK Deploy 失敗

1. 檢查 AWS 區域是否可用
2. 檢查 AWS 賬號是否有足夠的服務配額
3. 查看錯誤信息並根據提示操作

### API 測試失敗 (403/404)

1. 確認 API URL 正確
2. 檢查 API Gateway 是否部署成功
3. 查看 CloudWatch Logs

### 數據遷移失敗

1. 確認 DynamoDB 表已創建
2. 檢查 AWS 憑證是否有 DynamoDB 寫入權限
3. 確認區域設置正確

## 📊 預期成本

使用 AWS Free Tier，前 12 個月的成本應該接近 $0：

- DynamoDB: 25 GB 免費存儲
- Lambda: 100 萬次免費請求/月
- API Gateway: 100 萬次免費調用/月

## ✅ 完成檢查清單

- [ ] AWS 憑證配置完成
- [ ] CDK Bootstrap 成功
- [ ] Stack 部署成功
- [ ] API URL 已記錄
- [ ] .env 文件已更新
- [ ] 數據遷移完成
- [ ] API 測試成功
- [ ] React 應用正確連接到 API

## 🎉 成功！

如果所有步驟都完成並且 React 應用從 API 加載數據，恭喜您！
您的應用現在已經連接到 AWS 雲端後端了！
