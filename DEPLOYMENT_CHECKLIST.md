# 🚀 AWS API 遷移部署清單

## ✅ 完成的工作

- [x] 更新 `cdk.json` 配置為 AWS API 模式
- [x] 更新 `merchantsApi.js` 服務使用環境變量
- [x] 修改 `App.jsx` 從 API 加載商家數據
- [x] 創建 `.env.example` 環境變量示例
- [x] 編寫 AWS API 遷移文檔
- [x] Lambda 函數已就緒 (getMerchants, getMerchantById等)
- [x] 數據遷移腳本已就緒 (migrate-merchants.js)

## 📋 待完成的部署步驟

### 步驟 1: 配置環境變量 🔧

```bash
# 1. 複製環境變量示例文件
cp .env.example .env

# 2. 編輯 .env 文件 (暫時可以保留默認值，等部署後再更新)
```

### 步驟 2: 部署 AWS 基礎設施 ☁️

```bash
# 進入 CDK 目錄
cd aws/cdk

# 安裝依賴 (如果還沒安裝)
npm install

# 檢查 CDK 配置
cdk ls

# (可選) 查看將要創建的資源
cdk diff

# 部署到 AWS
cdk deploy

# 部署完成後，會顯示 API Gateway 的 URL，類似:
# MerchantsApiStack.MerchantsApiUrl = https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/
```

### 步驟 3: 更新環境變量 📝

部署完成後，更新 `.env` 文件中的 API URL:

```env
REACT_APP_MERCHANTS_API_URL=https://[你的API ID].execute-api.ap-southeast-1.amazonaws.com/prod
```

### 步驟 4: 遷移數據到 DynamoDB 📦

```bash
# 返回項目根目錄
cd ../..

# 設置 AWS 區域和表名環境變量
$env:AWS_REGION="ap-southeast-1"
$env:TABLE_NAME="Merchants"

# 執行數據遷移
cd aws/scripts
node migrate-merchants.js

# 預期輸出:
# 開始遷移商戶資料到 DynamoDB...
# 找到 18 個商戶
# 寫入批次 1...
# ✅ 遷移完成！
```

### 步驟 5: 測試 API 🧪

```bash
# 返回項目根目錄
cd ../..

# 測試 API (替換為你的實際 URL)
curl https://[你的API ID].execute-api.ap-southeast-1.amazonaws.com/prod/merchants

# 或使用 PowerShell:
Invoke-RestMethod -Uri "https://[你的API ID].execute-api.ap-southeast-1.amazonaws.com/prod/merchants"
```

### 步驟 6: 測試前端應用 🎨

```bash
# 啟動開發服務器
npm start

# 打開瀏覽器控制台,應該看到:
# 正在從 AWS API 加載商家數據...
# ✅ 成功加載 18 個商家
```

### 步驟 7: 構建生產版本 🏗️

```bash
# 構建應用
npm run build

# 部署到你的託管服務 (例如 Netlify, Vercel, S3等)
```

## 🔍 驗證清單

完成部署後，請確認:

- [ ] CDK Stack 成功部署
- [ ] API Gateway URL 可以訪問
- [ ] DynamoDB 表包含所有商家數據
- [ ] 前端應用可以從 API 加載商家
- [ ] 緩存功能正常工作
- [ ] Fallback 機制在 API 失敗時生效

## 🐛 故障排查

### API Gateway 返回 403
```bash
# 檢查 IAM 權限和 API Gateway 設置
aws apigateway get-rest-apis --region ap-southeast-1
```

### DynamoDB 表不存在
```bash
# 檢查表是否已創建
aws dynamodb list-tables --region ap-southeast-1
```

### CORS 錯誤
Lambda 函數已配置 CORS headers,如果仍有問題:
1. 檢查 API Gateway 的 CORS 設置
2. 確認 OPTIONS 方法已配置

### 本地開發問題
如果 API 在開發時失敗,可以暫時使用本地 JSON:
```env
REACT_APP_USE_API_FIRST=false
```

## 📚 相關文檔

- [AWS_API_MIGRATION.md](./AWS_API_MIGRATION.md) - 詳細遷移指南
- [aws/lambda/](./aws/lambda/) - Lambda 函數代碼
- [aws/scripts/migrate-merchants.js](./aws/scripts/migrate-merchants.js) - 數據遷移腳本
- [src/services/merchantsApi.js](./src/services/merchantsApi.js) - API 客戶端

## 💡 下一步

完成遷移後,考慮:
1. 添加 API 認證 (API Key 或 Cognito)
2. 設置 CloudWatch 監控和告警
3. 實現 API 緩存策略 (CloudFront)
4. 添加更多 CRUD 操作
5. 實現數據更新通知機制
