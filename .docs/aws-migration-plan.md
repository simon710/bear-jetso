# Merchants API - AWS 遷移計劃

## 目標
將 `merchants.json` 遷移到 AWS，並通過 API 方式讀取，方便日後配置和管理。

## 架構設計

### 選項 1: Serverless 架構（推薦）
- **數據庫**: DynamoDB
- **API**: API Gateway + Lambda
- **優點**: 
  - 無需管理服務器
  - 自動擴展
  - 按使用付費
  - 低延遲

### 選項 2: 傳統架構
- **數據庫**: RDS (PostgreSQL/MySQL)
- **應用**: EC2 + Express.js
- **優點**:
  - SQL 查詢能力
  - 更多數據類型
  - 熟悉的開發模式

## 推薦方案：Serverless 架構詳細步驟

### 階段 1: 設置 DynamoDB

#### 1.1 創建 DynamoDB 表
```bash
# 表名: Merchants
# 主鍵: merchantId (String)
# 屬性:
# - name (String) - 中文名稱
# - name_en (String) - 英文名稱  
# - logo (String) - Logo URL
# - instagram_id (String) - Instagram ID
```

#### 1.2 數據模型
```json
{
  "merchantId": "parknshop",
  "name": "百佳",
  "name_en": "PARKnSHOP",
  "logo": "https://logo.bigfootws.com/logos/parknshop.jpg",
  "instagram_id": "hkparknshop",
  "createdAt": "2026-02-10T09:34:16Z",
  "updatedAt": "2026-02-10T09:34:16Z"
}
```

### 階段 2: 創建 Lambda 函數

#### 2.1 Lambda 函數列表
1. **getMerchants** - 獲取所有商戶
2. **getMerchantById** - 獲取單個商戶
3. **createMerchant** - 創建新商戶（管理用）
4. **updateMerchant** - 更新商戶（管理用）
5. **deleteMerchant** - 刪除商戶（管理用）

### 階段 3: 設置 API Gateway

#### 3.1 API 端點
```
GET    /merchants          - 獲取所有商戶
GET    /merchants/{id}     - 獲取單個商戶
POST   /merchants          - 創建商戶（需要認證）
PUT    /merchants/{id}     - 更新商戶（需要認證）
DELETE /merchants/{id}     - 刪除商戶（需要認證）
```

#### 3.2 CORS 配置
```json
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["GET", "POST", "PUT", "DELETE"],
  "AllowHeaders": ["Content-Type", "Authorization"]
}
```

### 階段 4: 數據遷移

#### 4.1 創建遷移腳本
- 讀取現有 merchants.json
- 為每個商戶生成 merchantId
- 批量寫入 DynamoDB

### 階段 5: 前端集成

#### 5.1 更新應用代碼
- 創建 API 客戶端服務
- 替換本地 JSON 讀取為 API 調用
- 添加錯誤處理和重試邏輯

## 成本估算（每月）

### Serverless 方案
- DynamoDB: ~$1-5 (根據讀寫量)
- Lambda: 免費層足夠使用
- API Gateway: ~$3.50/百萬次請求
- **估計總成本**: $5-10/月

### 傳統方案  
- RDS: ~$15-30/月（最小實例）
- EC2: ~$10-20/月（最小實例）
- **估計總成本**: $25-50/月

## 時間表

1. **設置 AWS 資源**: 1-2 小時
2. **開發 Lambda 函數**: 2-3 小時
3. **數據遷移**: 30 分鐘
4. **前端集成**: 1-2 小時
5. **測試和部署**: 1 小時

**總計**: 約 6-9 小時

## 安全考慮

1. **API 認證**: 使用 AWS Cognito 或 API Keys
2. **數據驗證**: 在 Lambda 中驗證輸入
3. **訪問控制**: IAM 角色權限最小化
4. **HTTPS**: API Gateway 強制使用 HTTPS

## 下一步

選擇以下其中一個選項開始：

### A. 快速開始（使用 AWS CDK）
我可以幫您創建 Infrastructure as Code，一次性部署所有資源。

### B. 手動配置
逐步在 AWS Console 中配置每個服務。

### C. 使用 Amplify
使用 AWS Amplify CLI 自動化整個過程。

請告訴我您想使用哪種方式，我會提供詳細的實施步驟和代碼。
