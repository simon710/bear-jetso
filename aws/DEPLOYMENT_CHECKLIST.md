# 部署前檢查清單

在運行部署腳本之前，請確認以下事項：

## ✅ 必需項目

- [ ] 已安裝 Node.js (v16 或更高版本)
- [ ] 已安裝 AWS CLI
- [ ] 已配置 AWS 憑證 (`aws configure`)
- [ ] AWS 帳戶有足夠的權限（DynamoDB、Lambda、API Gateway、CloudFormation）
- [ ] 已確認要使用的 AWS 區域（預設：ap-southeast-1）

## 📝 部署步驟

### 方式 1: 自動部署（推薦）

在 PowerShell 中運行：
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```

### 方式 2: 手動部署

按照 `aws/README.md` 中的步驟逐步執行。

## ⚠️ 注意事項

1. **成本**: 雖然在免費層內使用成本極低，但請定期檢查 AWS 帳單
2. **安全性**: 部署後建議為寫入操作添加 API Key
3. **備份**: DynamoDB 表已設置為 RETAIN，刪除 Stack 時不會刪除數據
4. **測試**: 部署後務必測試 API 端點是否正常工作

## 🔧 部署後配置

1. 複製 CDK 輸出的 API URL
2. 在項目根目錄創建或更新 `.env`:
   ```
   REACT_APP_MERCHANTS_API_URL=https://YOUR-API-URL/prod
   ```
3. 重新啟動開發服務器以載入新的環境變量

## 🧪 測試部署

部署完成後，在瀏覽器中訪問：
```
https://YOUR-API-URL/prod/merchants
```

應該會看到類似這樣的 JSON 響應：
```json
{
  "success": true,
  "data": [...],
  "count": 18
}
```

## 📊 監控

部署後可以在 AWS Console 中監控：
- CloudWatch Logs: 查看 Lambda 函數日誌
- CloudWatch Metrics: 查看 API 調用次數、錯誤率等
- DynamoDB Console: 查看表數據

## 🆘 遇到問題？

查看 `aws/README.md` 中的「故障排查」章節。
