# ⚠️ 當前配置狀態

## 🔧 已修復的問題

✅ **修復了 `process is not defined` 錯誤**

問題原因：在瀏覽器環境中直接訪問 `process.env` 會導致錯誤。

解決方案：添加了安全的環境變量訪問函數 `getEnv()`，使用 try-catch 處理。

## 📍 當前運行模式

由於沒有配置 API URL，應用目前以 **本地 JSON 模式** 運行：

```
應用啟動
  ↓
檢查環境變量 REACT_APP_MERCHANTS_API_URL
  ↓
未配置 (空字符串)
  ↓
自動使用本地 JSON fallback
  ↓
從 src/data/merchants.json 加載數據 ✅
```

### 控制台輸出
你應該會看到：
```
未配置 API URL，使用本地 JSON 作為數據源
✅ 成功加載 18 個商家
```

## 🚀 如何切換到 AWS API 模式

### 步驟 1: 創建 .env 文件

在項目根目錄創建 `.env` 文件：

```bash
# Windows PowerShell
Copy-Item .env.example .env

# 或手動創建
notepad .env
```

### 步驟 2: 配置 API URL

在 `.env` 文件中添加：

```env
# 開發環境 - 暫時禁用 API，使用本地 JSON
REACT_APP_MERCHANTS_API_URL=

# 或者，如果你已經部署了 AWS API：
# REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 步驟 3: 重啟開發服務器

```bash
# 停止當前服務器 (Ctrl+C)
# 重新啟動
npm start
```

## 📊 三種運行模式

### 模式 1: 本地 JSON (當前) ⭐ 推薦開始
```env
# .env 文件不存在，或
REACT_APP_MERCHANTS_API_URL=
```

✅ 優點：
- 無需 AWS 配置
- 立即可用
- 開發快速

❌ 缺點：
- 數據無法動態更新
- 需要重新部署才能修改商家

### 模式 2: AWS API (未部署)
```env
REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

需要先完成部署：
```bash
cd aws/cdk
cdk deploy
```

✅ 優點：
- 數據動態更新
- 支持 CRUD 操作
- 雲端存儲

❌ 缺點：
- 需要 AWS 賬號
- 需要部署時間
- 可能產生費用

### 模式 3: 混合模式 (API + Fallback)
```env
REACT_APP_MERCHANTS_API_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod
```

當 API 可用時使用 API，失敗時自動降級到本地 JSON。

✅ 優點：
- 最高可用性
- 最佳用戶體驗
- 自動容錯

## 🎯 建議

### 對於本地開發
👉 **保持當前配置** - 不設置 API URL，直接使用本地 JSON

優點：
- 無需等待 API 響應
- 無網絡依賴
- 開發速度快

### 對於生產部署
當你準備好時：
1. 運行 `.\setup-aws-api.ps1` 部署 AWS 資源
2. 更新 `.env` 文件中的 API URL
3. 重新構建應用：`npm run build`

## 🔍 驗證當前狀態

打開瀏覽器控制台 (F12)，你應該看到：

```
正在從 AWS API 加載商家數據...
未配置 API URL，使用本地 JSON 作為數據源
✅ 成功加載 18 個商家
```

如果沒有錯誤，說明一切正常！✅

## ❓ 常見問題

### Q: 我必須使用 AWS API 嗎？
**A:** 不必須！本地 JSON 模式完全可以正常工作。只有當你需要動態更新數據時才需要 AWS API。

### Q: 如何暫時禁用 API？
**A:** 在 `.env` 文件中設置空值：
```env
REACT_APP_MERCHANTS_API_URL=
```

### Q: 如何查看使用了哪個數據源？
**A:** 查看瀏覽器控制台的日誌：
- "從 API 獲取商戶資料..." → 使用 API
- "未配置 API URL，使用本地 JSON" → 使用本地 JSON
- "使用緩存的商戶資料" → 使用緩存

## 📚 相關文檔

- `SUMMARY.md` - 完整變更摘要
- `DEPLOYMENT_CHECKLIST.md` - AWS 部署指南
- `AWS_API_MIGRATION.md` - API 遷移詳細說明

---

**當前狀態**: ✅ 應用正常運行，使用本地 JSON 數據源  
**下一步**: 繼續開發，或按照 `DEPLOYMENT_CHECKLIST.md` 部署 AWS API
