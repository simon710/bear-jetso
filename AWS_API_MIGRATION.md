# 從本地 JSON 遷移到 AWS API

## 概述

商家數據 (`merchants.json`) 現在已改為從 AWS API Gateway 獲取,而不是使用本地 JSON 文件。

## 架構變更

### 之前 ❌
```javascript
import merchants from './data/merchants.json';
```

### 現在 ✅
```javascript
import merchantsApi from './services/merchantsApi';

// 在組件中
useEffect(() => {
  const loadMerchants = async () => {
    const data = await merchantsApi.getAllMerchants();
    setMerchants(data);
  };
  loadMerchants();
}, []);
```

## 配置步驟

### 1. 設置環境變量

複製 `.env.example` 為 `.env`:
```bash
cp .env.example .env
```

編輯 `.env` 文件,設置你的 API Gateway URL:
```env
REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 2. 部署 AWS 基礎設施

使用 CDK 部署 API Gateway 和 Lambda:
```bash
cd aws/cdk
npm install
cdk deploy
```

部署完成後,你會獲得 API Gateway 的 URL,將其添加到 `.env` 文件中。

### 3. 遷移數據到 DynamoDB

```bash
cd aws/scripts
node migrate-merchants.js
```

### 4. 測試 API

```bash
# 測試獲取所有商家
curl https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod/merchants

# 測試獲取單個商家
curl https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod/merchants/parknshop
```

## API 端點

### GET /merchants
獲取所有商家列表

**響應格式:**
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
      "createdAt": "2026-02-10T12:00:00.000Z",
      "updatedAt": "2026-02-10T12:00:00.000Z"
    }
  ],
  "count": 18
}
```

### GET /merchants/:merchantId
獲取單個商家詳情

**響應格式:**
```json
{
  "success": true,
  "data": {
    "merchantId": "parknshop",
    "name": "百佳",
    "name_en": "PARKnSHOP",
    "logo": "https://logo.bigfootws.com/logos/parknshop.jpg",
    "instagram_id": "hkparknshop"
  }
}
```

## 錯誤處理

`merchantsApi` 服務實現了多層 fallback 機制:

1. **優先**: 從 AWS API Gateway 獲取數據
2. **次選**: 使用內存緩存 (5 分鐘有效期)
3. **最後**: 使用本地 `merchants.json` 作為 fallback

## 開發環境

在開發環境中,你可以:

### 選項 1: 使用 AWS API
```env
REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 選項 2: 使用本地 API 服務器
```env
REACT_APP_MERCHANTS_API_URL=http://localhost:3001
```

### 選項 3: 禁用 API,使用本地 JSON
```env
REACT_APP_USE_API_FIRST=false
```

## 緩存機制

- **緩存時長**: 5 分鐘
- **手動刷新**: 
  ```javascript
  await merchantsApi.refresh();
  ```
- **清除緩存**:
  ```javascript
  merchantsApi.clearCache();
  ```

## 監控和調試

查看瀏覽器控制台獲取詳細日誌:
- ✅ 成功加載會顯示綠色勾號
- ⚠️ 使用緩存會顯示警告
- ❌ API 失敗會顯示紅色錯誤

## 生產環境部署

確保在生產環境的構建配置中設置正確的環境變量:

```bash
REACT_APP_MERCHANTS_API_URL=https://production-api.execute-api.ap-southeast-1.amazonaws.com/prod npm run build
```

或在 CI/CD 管道中配置環境變量。

## 問題排查

### API 返回 CORS 錯誤
確保 API Gateway 已配置 CORS。在 Lambda 函數中:
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
};
```

### API 返回 403 Forbidden
檢查 API Gateway 的認證設置和 IAM 權限。

### 數據不更新
清除緩存:
```javascript
merchantsApi.clearCache();
await merchantsApi.getAllMerchants(false);
```

## 相關文件

- `src/services/merchantsApi.js` - API 服務類
- `src/data/merchants.json` - Fallback 數據
- `aws/scripts/migrate-merchants.js` - 數據遷移腳本
- `aws/cdk/` - AWS 基礎設施代碼
