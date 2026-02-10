# 🎯 Merchants API 遷移到 AWS - 完整方案

## 📦 已創建的文件

### AWS 基礎設施 (CDK)
```
aws/cdk/
├── bin/app.js                    # CDK 應用入口
├── lib/merchants-api-stack.js    # Stack 定義（DynamoDB + Lambda + API Gateway）
├── package.json                   # CDK 依賴
├── cdk.json                      # CDK 配置
└── .gitignore                    # Git 忽略文件
```

### Lambda 函數
```
aws/lambda/
├── getMerchants.js        # 獲取所有商戶
├── getMerchantById.js     # 獲取單個商戶
├── createMerchant.js      # 創建新商戶
├── updateMerchant.js      # 更新商戶
└── package.json           # Lambda 依賴
```

### 工具腳本
```
aws/scripts/
└── migrate-merchants.js   # 數據遷移腳本
```

### 前端服務
```
src/
├── services/merchantsApi.js      # API 客戶端服務（含緩存和 fallback）
└── examples/MerchantsExample.js  # 使用範例組件
```

### 文檔
```
aws/
├── README.md                     # 詳細部署指南
├── DEPLOYMENT_CHECKLIST.md      # 部署檢查清單
└── deploy.ps1                   # 自動部署腳本

.docs/
└── aws-migration-plan.md        # 遷移計劃文檔
```

## 🏗️ 架構概覽

```
┌─────────────────┐
│   React App     │
│  (bear_jetso)   │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │ ← RESTful API
│   (Prod Stage)  │
└────────┬────────┘
         │
         │ Invoke
         ▼
┌─────────────────────────────────────┐
│          Lambda Functions           │
├─────────────────────────────────────┤
│ • getMerchants    - GET /merchants  │
│ • getMerchantById - GET /{id}       │
│ • createMerchant  - POST /merchants │
│ • updateMerchant  - PUT /{id}       │
└────────┬────────────────────────────┘
         │
         │ SDK
         ▼
┌─────────────────┐
│   DynamoDB      │
│  (Merchants)    │
│  - merchantId   │ ← Primary Key
│  - name         │
│  - name_en      │
│  - logo         │
│  - instagram_id │
│  - timestamps   │
└─────────────────┘
```

## 🚀 快速開始（3 種方式）

### 方式 1: 一鍵自動部署 ⭐ 推薦

```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```

這個腳本會自動：
1. ✅ 檢查 AWS CLI 和憑證
2. ✅ 安裝所有依賴
3. ✅ Bootstrap CDK
4. ✅ 部署所有 AWS 資源
5. ✅ 遷移數據到 DynamoDB

### 方式 2: 手動步驟（詳細控制）

查看 `aws/README.md` 並按步驟執行。

### 方式 3: AWS Console（手動配置）

不推薦，太耗時。

## 📋 部署前準備

1. **安裝 AWS CLI**
   ```powershell
   choco install awscli
   ```

2. **配置 AWS 憑證**
   ```powershell
   aws configure
   # 輸入 Access Key, Secret Key, Region (ap-southeast-1), Output (json)
   ```

3. **確認憑證**
   ```powershell
   aws sts get-caller-identity
   ```

## 🔑 關鍵特性

### 1. **DynamoDB 表設計**
- **表名**: `Merchants`
- **主鍵**: `merchantId` (String)
- **計費模式**: 按需付費（無需預配置容量）
- **備份**: 啟用時間點恢復
- **刪除保護**: Stack 刪除時保留表

### 2. **API 端點**

| 方法 | 端點 | 功能 | 認證 |
|------|------|------|------|
| GET | `/merchants` | 獲取所有商戶 | ❌ |
| GET | `/merchants/{id}` | 獲取單個商戶 | ❌ |
| POST | `/merchants` | 創建商戶 | ⚠️ 建議添加 |
| PUT | `/merchants/{id}` | 更新商戶 | ⚠️ 建議添加 |

### 3. **前端 API 服務特性**
- ✅ 自動緩存（5 分鐘）
- ✅ 本地 JSON fallback
- ✅ 錯誤處理和重試
- ✅ 搜索和篩選功能
- ✅ TypeScript 友好

### 4. **性能優化**
- Lambda 連接重用
- API 響應緩存
- DynamoDB 按需擴展
- CloudFront CDN（可選）

## 💰 成本估算

### 免費層（首 12 個月）
- ✅ DynamoDB: 25GB + 25 RCU/WCU
- ✅ Lambda: 100 萬次請求/月
- ✅ API Gateway: 100 萬次調用/月

### 超出免費層後（假設 10 萬次請求/月）
- DynamoDB: ~$1-3/月
- Lambda: ~$0.20/月
- API Gateway: ~$0.35/月
- **總計**: ~$1.55-3.55/月 💵

## 📝 部署後配置

### 1. 獲取 API URL

部署完成後，CDK 會輸出：
```
Outputs:
BearJetsoMerchantsApiStack.ApiUrl = https://abc123.execute-api.ap-southeast-1.amazonaws.com/prod/
```

### 2. 更新環境變量

創建或更新 `.env`:
```env
REACT_APP_MERCHANTS_API_URL=https://abc123.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 3. 在代碼中使用

```javascript
import merchantsApi from './services/merchantsApi';

// 獲取所有商戶
const merchants = await merchantsApi.getAllMerchants();

// 獲取單個商戶
const merchant = await merchantsApi.getMerchantById('parknshop');

// 搜索
const results = await merchantsApi.searchMerchants('百佳');
```

完整範例見：`src/examples/MerchantsExample.js`

## 🧪 測試 API

### 瀏覽器測試
```
https://YOUR-API-URL/prod/merchants
```

### PowerShell 測試
```powershell
# 獲取所有商戶
Invoke-RestMethod -Uri "https://YOUR-API-URL/prod/merchants" -Method GET

# 獲取單個商戶
Invoke-RestMethod -Uri "https://YOUR-API-URL/prod/merchants/parknshop" -Method GET
```

### curl 測試
```bash
curl https://YOUR-API-URL/prod/merchants
```

## 🔒 安全建議

### Phase 1: 基本安全 ✅ 已實施
- ✅ HTTPS 強制
- ✅ CORS 配置
- ✅ Input 驗證
- ✅ CloudWatch 日誌

### Phase 2: 強化安全 🔲 建議添加
- 🔲 API Key 保護寫入操作
- 🔲 AWS WAF 防護
- 🔲 Rate limiting
- 🔲 AWS Cognito 用戶認證

### Phase 3: 企業級 🔲 可選
- 🔲 自定義域名 + SSL
- 🔲 CloudFront CDN
- 🔲 多區域部署
- 🔲 災難恢復計劃

## 📊 監控和維護

### CloudWatch 指標
- API 調用次數
- Lambda 錯誤率
- DynamoDB 讀寫量
- 響應時間

### 日誌位置
```
CloudWatch Logs Groups:
- /aws/lambda/GetMerchants
- /aws/lambda/GetMerchantById
- /aws/lambda/CreateMerchant
- /aws/lambda/UpdateMerchant
```

## 🛠️ 常見操作

### 更新 Lambda 函數
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk"
npm run deploy
```

### 添加新商戶
```javascript
const response = await fetch('https://YOUR-API-URL/prod/merchants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        merchantId: 'new_merchant',
        name: '新商戶',
        name_en: 'New Merchant',
        logo: 'https://logo.bigfootws.com/logos/new.jpg',
        instagram_id: 'new_merchant_ig'
    })
});
```

### 更新商戶
```javascript
const response = await fetch('https://YOUR-API-URL/prod/merchants/parknshop', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        logo: 'https://new-logo-url.com/parknshop.jpg'
    })
});
```

### 查看日誌
```powershell
aws logs tail /aws/lambda/GetMerchants --follow
```

### 刪除所有資源
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk"
npm run destroy
# 注意: DynamoDB 表會保留（RETAIN 政策）
```

## 🎓 學習資源

- [AWS CDK 文檔](https://docs.aws.amazon.com/cdk/)
- [DynamoDB 最佳實踐](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway 教程](https://docs.aws.amazon.com/apigateway/)
- [Lambda 函數最佳實踐](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## ❓ 常見問題

### Q: 為什麼選擇 DynamoDB 而不是 RDS？
A: 對於這種簡單的 key-value 數據，DynamoDB 更便宜、更快、無需管理服務器。

### Q: 可以使用其他 AWS 區域嗎？
A: 可以，修改 `aws/cdk/bin/app.js` 中的 `region` 設置。

### Q: 如何添加認證？
A: 查看 `aws/README.md` 中的「安全建議」章節。

### Q: 成本會失控嗎？
A: 不會，DynamoDB 和 Lambda 都是按需計費，小型應用成本極低。可以設置 AWS Budget 告警。

### Q: 可以回滾到本地 JSON 嗎？
A: 可以！API 服務已包含 fallback 機制，會自動退回到本地 JSON。

## 🎉 下一步

1. ✅ 運行部署腳本: `.\deploy.ps1`
2. ✅ 複製 API URL
3. ✅ 更新 `.env` 文件
4. ✅ 測試 API
5. ✅ 在應用中集成
6. 🔲 添加 API 認證（可選）
7. 🔲 設置 CloudWatch 告警
8. 🔲 配置自定義域名（可選）

## 🆘 需要幫助？

- 📖 詳細部署指南: `aws/README.md`
- ✅ 部署檢查清單: `aws/DEPLOYMENT_CHECKLIST.md`
- 💡 使用範例: `src/examples/MerchantsExample.js`
- 📋 遷移計劃: `.docs/aws-migration-plan.md`

---

**準備好了嗎？運行部署腳本開始吧！** 🚀

```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```
