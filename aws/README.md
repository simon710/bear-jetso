# Bear Jetso Merchants API - AWS 部署指南

## 📋 目錄結構

```
aws/
├── cdk/                    # AWS CDK 基礎設施代碼
│   ├── bin/               # CDK 應用入口
│   ├── lib/               # CDK Stack 定義
│   ├── cdk.json          # CDK 配置
│   └── package.json      # CDK 依賴
├── lambda/                # Lambda 函數
│   ├── getMerchants.js   # 獲取所有商戶
│   ├── getMerchantById.js # 獲取單個商戶
│   ├── createMerchant.js  # 創建商戶
│   └── updateMerchant.js  # 更新商戶
├── scripts/               # 工具腳本
│   └── migrate-merchants.js # 數據遷移腳本
└── README.md             # 本文件
```

## 🚀 快速開始

### 前置要求

1. **安裝 AWS CLI**
   ```powershell
   # 使用 Chocolatey (推薦)
   choco install awscli
   
   # 或從官網下載
   # https://aws.amazon.com/cli/
   ```

2. **配置 AWS 憑證**
   ```powershell
   aws configure
   # 輸入：
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region: ap-southeast-1
   # - Default output format: json
   ```

3. **安裝 Node.js** (如果還沒安裝)
   - 下載：https://nodejs.org/

### 步驟 1: 安裝 CDK 依賴

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk
npm install
```

### 步驟 2: 安裝 Lambda 依賴

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\lambda
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### 步驟 3: Bootstrap CDK（首次使用）

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk
npx cdk bootstrap aws://ACCOUNT-ID/ap-southeast-1
# 將 ACCOUNT-ID 替換為您的 AWS 帳戶 ID
# 可以通過 aws sts get-caller-identity 查看
```

### 步驟 4: 預覽部署

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk
npm run diff
```

### 步驟 5: 部署到 AWS

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk
npm run deploy
```

部署完成後，會顯示：
- ✅ API Gateway URL
- ✅ DynamoDB 表名
- ✅ AWS 區域

**記下 API URL！** 例如：
```
https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod/
```

### 步驟 6: 遷移數據到 DynamoDB

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\scripts
node migrate-merchants.js
```

### 步驟 7: 測試 API

使用瀏覽器或 curl 測試：

```powershell
# 獲取所有商戶
curl https://YOUR-API-URL/prod/merchants

# 獲取單個商戶
curl https://YOUR-API-URL/prod/merchants/parknshop
```

### 步驟 8: 更新前端配置

在項目根目錄創建或更新 `.env` 文件：

```env
REACT_APP_MERCHANTS_API_URL=https://YOUR-API-URL/prod
```

記得將 `YOUR-API-URL` 替換為實際的 API URL！

## 🔧 常用命令

### CDK 命令

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk

# 查看將要部署的變更
npm run diff

# 部署
npm run deploy

# 查看生成的 CloudFormation 模板
npm run synth

# 銷毀所有資源（小心使用！）
npm run destroy
```

### 數據管理

```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\scripts

# 遷移數據
node migrate-merchants.js
```

## 📊 API 端點

部署完成後，您將獲得以下 API 端點：

### 公開端點（無需認證）

| 方法 | 路徑 | 描述 | 範例 |
|------|------|------|------|
| GET | `/merchants` | 獲取所有商戶 | `GET /merchants` |
| GET | `/merchants/{id}` | 獲取單個商戶 | `GET /merchants/parknshop` |

### 管理端點（建議添加認證）

| 方法 | 路徑 | 描述 | 範例 |
|------|------|------|------|
| POST | `/merchants` | 創建新商戶 | `POST /merchants` |
| PUT | `/merchants/{id}` | 更新商戶 | `PUT /merchants/parknshop` |

## 📝 API 響應格式

### 成功響應

```json
{
  "success": true,
  "data": [
    {
      "merchantId": "parknshop",
      "name": "百佳",
      "name_en": "PARKnSHOP",
      "logo": "https://logo.bigfootws.com/logos/parknshop.jpg",
      "instagram_id": "hkparknshop",
      "createdAt": "2026-02-10T09:34:16Z",
      "updatedAt": "2026-02-10T09:34:16Z"
    }
  ],
  "count": 18
}
```

### 錯誤響應

```json
{
  "success": false,
  "error": "Error message"
}
```

## 💰 成本估算

### 免費層（首 12 個月）
- DynamoDB: 25 GB 儲存，25 讀寫容量單位
- Lambda: 100 萬次請求/月，40 萬 GB-秒計算時間
- API Gateway: 100 萬次 API 調用

### 一般使用（超出免費層後）
假設每月 10 萬次 API 調用：
- DynamoDB: ~$1-3
- Lambda: ~$0.20
- API Gateway: ~$0.35

**總計: 每月約 $1.55-3.55**

## 🔒 安全建議

### 1. 添加 API Key 保護寫入操作

修改 `lib/merchants-api-stack.js`：

```javascript
// 在 Stack 中添加
const apiKey = api.addApiKey('MerchantsApiKey', {
  apiKeyName: 'merchants-management-key'
});

const plan = api.addUsagePlan('UsagePlan', {
  name: 'Basic',
  throttle: {
    rateLimit: 10,
    burstLimit: 20
  }
});

plan.addApiKey(apiKey);
```

### 2. 使用 AWS Cognito 進行用戶認證

對於更嚴格的安全要求，可以集成 Cognito。

### 3. 啟用 CloudWatch 日誌

Lambda 函數已自動配置 CloudWatch 日誌。

## 🐛 故障排查

### 問題 1: CDK Bootstrap 失敗

**解決方案**:
```powershell
# 確認 AWS 憑證
aws sts get-caller-identity

# 確認區域
aws configure get region
```

### 問題 2: Lambda 函數找不到模塊

**解決方案**:
```powershell
cd c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\lambda
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### 問題 3: CORS 錯誤

**解決方案**: CDK Stack 已配置 CORS，如果仍有問題，檢查 API Gateway 設置。

### 問題 4: 數據遷移失敗

**解決方案**:
```powershell
# 檢查環境變量
$env:TABLE_NAME = "Merchants"
$env:AWS_REGION = "ap-southeast-1"

# 重新運行
node migrate-merchants.js
```

## 📚 下一步

1. ✅ 部署基礎設施
2. ✅ 遷移數據
3. ✅ 更新前端代碼
4. 🔲 添加 API 認證（可選）
5. 🔲 設置 CloudWatch 告警
6. 🔲 配置自定義域名（可選）

## 🆘 需要幫助？

- AWS CDK 文檔: https://docs.aws.amazon.com/cdk/
- DynamoDB 文檔: https://docs.aws.amazon.com/dynamodb/
- API Gateway 文檔: https://docs.aws.amazon.com/apigateway/

## 📞 支援

如有問題，請查看 AWS CloudWatch 日誌或聯繫管理員。
