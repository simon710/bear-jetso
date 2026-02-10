# ✅ 已完成: merchants.json 改為 AWS API 方式請求

## 📊 修改摘要

### 1. **配置文件更新**

#### `cdk.json` ✅
- 添加了 AWS API 相關配置
- 啟用 `lookups: true` - CDK 通過 AWS API 查詢現有資源
- 設置 `requireApproval: never` - 自動部署
- 添加 `build.cacheable: true` - 提升性能
- 修復重複的配置項

#### `.env.example` ✅ 新建
```env
REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
REACT_APP_USE_API_FIRST=true
```

### 2. **代碼更新**

#### `src/services/merchantsApi.js` ✅
更新了服務配置:
- 從環境變量讀取 API URL
- 支持開發/生產環境不同配置
- 優化錯誤處理和 fallback 機制
- 實現三層數據獲取策略:
  1. AWS API Gateway (優先)
  2. 內存緩存 (5分鐘)
  3. 本地 JSON (最後備份)

#### `src/App.jsx` ✅
核心修改:
- ❌ 移除: `import merchants from './data/merchants.json'`
- ✅ 改為: `import merchantsApi from './services/merchantsApi'`
- 添加狀態管理: `const [merchants, setMerchants] = useState([])`
- 添加加載狀態: `const [isMerchantsLoading, setIsMerchantsLoading] = useState(true)`
- 添加數據加載邏輯:
```javascript
useEffect(() => {
  const loadMerchants = async () => {
    const data = await merchantsApi.getAllMerchants();
    setMerchants(data);
  };
  loadMerchants();
}, []);
```

### 3. **文檔和工具**

#### 📚 新建文件
1. **AWS_API_MIGRATION.md** - 詳細遷移指南
   - 架構變更說明
   - 配置步驟
   - API 端點文檔
   - 錯誤處理說明
   - 問題排查指南

2. **DEPLOYMENT_CHECKLIST.md** - 部署清單
   - 已完成工作列表
   - 待完成步驟
   - 驗證清單
   - 故障排查

3. **setup-aws-api.ps1** - 自動化部署腳本
   - AWS CLI 配置檢查
   - 自動創建 .env 文件
   - CDK 部署流程
   - 數據遷移
   - API 測試

4. **test-merchants-api.js** - API 測試腳本
   - 測試所有商家獲取
   - 測試單個商家查詢
   - 測試搜索功能
   - 測試緩存機制

## 🏗️ 現有基礎設施

以下文件已經存在並正常工作:

### Lambda 函數 ✅
- `aws/lambda/getMerchants.js` - 獲取所有商家
- `aws/lambda/getMerchantById.js` - 獲取單個商家
- `aws/lambda/createMerchant.js` - 創建商家
- `aws/lambda/updateMerchant.js` - 更新商家

### 數據遷移 ✅
- `aws/scripts/migrate-merchants.js` - DynamoDB 數據遷移腳本

### CDK 部署 ✅
- `aws/cdk/` - AWS 基礎設施定義

## 🚀 快速開始

### 方法 1: 使用自動化腳本 (推薦)

```powershell
# 運行自動化設置腳本
.\setup-aws-api.ps1
```

### 方法 2: 手動步驟

```bash
# 1. 創建環境變量文件
cp .env.example .env

# 2. 部署 AWS 資源
cd aws/cdk
npm install
cdk deploy

# 3. 更新 .env 文件中的 API URL
# REACT_APP_MERCHANTS_API_URL=https://[你的API ID].execute-api.ap-southeast-1.amazonaws.com/prod

# 4. 遷移數據
cd ../scripts
node migrate-merchants.js

# 5. 啟動應用
cd ../..
npm start
```

## 📈 數據流程

### 之前 (本地 JSON)
```
應用 → 本地 merchants.json → 顯示
```

### 現在 (AWS API)
```
應用 → merchantsApi.js → AWS API Gateway → Lambda → DynamoDB → 返回數據
     ↓ (如果失敗)
     → 緩存 (5分鐘)
     ↓ (如果沒有緩存)
     → 本地 merchants.json (fallback)
```

## 🎯 優勢

1. **動態數據**: 可以隨時更新商家信息,無需重新部署應用
2. **可擴展**: 輕鬆添加新的商家或修改現有商家
3. **高可用**: 多層 fallback 確保應用始終可用
4. **緩存優化**: 減少 API 調用,提升性能
5. **雲原生**: 利用 AWS 服務的可靠性和擴展性

## 🔧 配置選項

### 開發環境
```env
# 使用本地 API (需要本地運行 API 服務器)
REACT_APP_MERCHANTS_API_URL=http://localhost:3001

# 或暫時禁用 API,使用本地 JSON
REACT_APP_USE_API_FIRST=false
```

### 生產環境
```env
REACT_APP_MERCHANTS_API_URL=https://api.bigfootws.com/prod
REACT_APP_USE_API_FIRST=true
```

## 📊 監控和調試

### 瀏覽器控制台日誌
```javascript
// 成功從 API 加載
✅ 成功加載 18 個商家

// 使用緩存
使用緩存的商戶資料

// 使用 fallback
⚠️ 使用本地 JSON 作為 fallback
```

### CloudWatch 日誌
```bash
# 查看 Lambda 日誌
aws logs tail /aws/lambda/getMerchants --follow
```

## 🧪 測試

```bash
# 運行 API 測試腳本
node test-merchants-api.js

# 預期輸出:
🧪 開始測試 Merchants API...
📋 測試 1: 獲取所有商家
✅ 成功獲取 18 個商家
...
🎉 所有測試完成！
```

## 📝 注意事項

1. **首次部署**: 部署 CDK Stack 可能需要 5-10 分鐘
2. **數據遷移**: 確保在使用 API 之前完成數據遷移
3. **環境變量**: 生產構建前確認 API URL 正確
4. **CORS**: Lambda 函數已配置 CORS,如有問題檢查 API Gateway 設置
5. **成本**: 使用 AWS 服務可能產生費用,建議設置預算告警

## 📚 相關資源

- [AWS CDK 文檔](https://docs.aws.amazon.com/cdk/)
- [DynamoDB 文檔](https://docs.aws.amazon.com/dynamodb/)
- [API Gateway 文檔](https://docs.aws.amazon.com/apigateway/)
- [Lambda 文檔](https://docs.aws.amazon.com/lambda/)

## 🤝 需要幫助?

遇到問題? 檢查:
1. `DEPLOYMENT_CHECKLIST.md` - 部署清單和故障排查
2. `AWS_API_MIGRATION.md` - 詳細遷移指南
3. 瀏覽器控制台日誌
4. CloudWatch Logs

---

**狀態**: ✅ 代碼修改完成,等待部署到 AWS
**下一步**: 運行 `.\setup-aws-api.ps1` 開始部署
