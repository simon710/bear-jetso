# ✅ AWS CLI 安裝後檢查清單

## 📥 第 1 步：安裝 AWS CLI

- [ ] 下載：https://awscli.amazonaws.com/AWSCLIV2.msi
- [ ] 雙擊安裝
- [ ] **重要**：安裝完成後，關閉並重新打開 PowerShell/Terminal

---

## 🔍 第 2 步：驗證安裝

打開**新的** PowerShell 視窗，運行：
```powershell
aws --version
```

✅ **期望輸出**：類似 `aws-cli/2.x.x Python/3.x.x Windows/...`  
❌ **如果出錯**：重啟電腦，或手動添加到 PATH

---

## 🔑 第 3 步：取得 AWS Access Keys

### 3.1 登入 AWS Console
🔗 https://console.aws.amazon.com/

### 3.2 創建 Access Key
1. 點擊右上角您的帳戶名稱
2. 選擇 **"Security credentials"**（安全憑證）
3. 滾動到 **"Access keys"** 區域
4. 點擊 **"Create access key"**（創建訪問密鑰）
5. 選擇用途：**"Command Line Interface (CLI)"**
6. 勾選確認，點擊 **"Next"**
7. （可選）描述：`Bear Jetso Deployment`
8. 點擊 **"Create access key"**

### 3.3 保存憑證 ⚠️ 重要！
```
✅ 複製 Access Key ID：AKIA...
✅ 複製 Secret Access Key：（只會顯示一次！）
✅ 或點擊 "Download .csv file" 下載備份
```

---

## ⚙️ 第 4 步：配置 AWS CLI

在 PowerShell 中運行：
```powershell
aws configure
```

按提示輸入（請替換為您的實際值）：
```
AWS Access Key ID [None]: AKIA您的AccessKeyID
AWS Secret Access Key [None]: 您的SecretAccessKey
Default region name [None]: ap-southeast-1
Default output format [None]: json
```

---

## ✅ 第 5 步：驗證配置

運行以下命令確認一切正常：
```powershell
aws sts get-caller-identity
```

✅ **期望輸出**：
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-name"
}
```

如果看到這個，恭喜！配置成功！🎉

---

## 🚀 第 6 步：開始部署

配置完成後，在 PowerShell 運行：
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```

這個腳本會自動：
1. ✅ 檢查 AWS CLI 和憑證
2. ✅ Bootstrap CDK 環境
3. ✅ 部署 DynamoDB、Lambda 和 API Gateway
4. ✅ 遷移商戶資料到 DynamoDB
5. ✅ 輸出 API URL

預計需要 **5-10 分鐘**。

---

## 🆘 遇到問題？

### 問題 1: "aws 不是已識別的命令"
**解決方案**：
1. 完全關閉所有 PowerShell/Terminal 視窗
2. 重新打開一個新的 PowerShell
3. 重試 `aws --version`
4. 如果還是不行，重啟電腦

### 問題 2: Access Key 創建失敗
**可能原因**：
- 您的帳戶可能沒有權限創建 Access Key
- 已達到 Access Key 上限（每個用戶最多 2 個）

**解決方案**：
- 使用管理員帳戶
- 或刪除舊的未使用的 Access Key

### 問題 3: "The security token is invalid"
**解決方案**：
- 檢查是否正確複製了 Access Key（沒有多餘空格）
- 重新運行 `aws configure` 重新輸入

### 問題 4: 權限不足
**需要的權限**：
- DynamoDB (完整訪問)
- Lambda (完整訪問)
- API Gateway (完整訪問)
- CloudFormation (完整訪問)
- IAM (創建角色)
- CloudWatch Logs

如果您是帳戶擁有者/管理員，應該已有所有權限。

---

## 📋 完成後告訴我！

當您完成以上步驟後，回到對話告訴我：
- ✅ "已安裝並配置完成" - 我會協助您運行部署
- ❓ "遇到問題..." - 告訴我具體錯誤，我會幫您解決

---

**祝安裝順利！我在這裡等您回來。** 😊
