# AWS CLI 快速配置指南

## 🎯 目標
配置 AWS CLI 以部署 Bear Jetso Merchants API

## 📋 步驟 1: 安裝 AWS CLI

### 方式 A: 使用 Chocolatey（推薦）
如果已安裝 Chocolatey：
```powershell
choco install awscli -y
```

### 方式 B: 官方安裝程式
1. 下載: https://awscli.amazonaws.com/AWSCLIV2.msi
2. 雙擊安裝
3. 安裝後**重啟 PowerShell**

### 驗證安裝
```powershell
aws --version
# 應該顯示類似: aws-cli/2.x.x ...
```

## 🔑 步驟 2: 取得 AWS 憑證

### 2.1 登入 AWS Console
訪問: https://console.aws.amazon.com/

### 2.2 創建 Access Key
1. 點擊右上角您的帳戶名稱
2. 選擇 **Security credentials**（安全憑證）
3. 滾動到 **Access keys** 區域
4. 點擊 **Create access key**（創建訪問密鑰）
5. 選擇用途：**Command Line Interface (CLI)**
6. 勾選確認框，點擊 **Next**
7. （可選）添加描述標籤：`Bear Jetso CDK Deployment`
8. 點擊 **Create access key**

### ⚠️ 重要！
- **立即複製** Access Key ID 和 Secret Access Key
- Secret Key **只會顯示一次**，請妥善保存
- 建議下載 .csv 文件備份

## ⚙️ 步驟 3: 配置 AWS CLI

在 PowerShell 中運行：
```powershell
aws configure
```

按提示輸入：
```
AWS Access Key ID [None]: 你的-ACCESS-KEY-ID
AWS Secret Access Key [None]: 你的-SECRET-ACCESS-KEY
Default region name [None]: ap-southeast-1
Default output format [None]: json
```

## ✅ 步驟 4: 驗證配置

```powershell
# 檢查身份
aws sts get-caller-identity

# 應該看到類似輸出：
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-username"
# }
```

## 🚀 步驟 5: 開始部署

配置完成後，運行部署腳本：
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```

---

## 🛠️ 故障排查

### 問題 1: "aws 不是已識別的命令"
**解決方案**: 
- 重啟 PowerShell 或 Terminal
- 或手動添加到 PATH（通常安裝時已自動添加）

### 問題 2: "The security token included in the request is invalid"
**解決方案**:
- 檢查 Access Key 是否正確
- 重新運行 `aws configure` 確認憑證

### 問題 3: 權限不足
**解決方案**:
您的 IAM 用戶需要以下權限：
- DynamoDB: 完整訪問
- Lambda: 完整訪問
- API Gateway: 完整訪問
- CloudFormation: 完整訪問
- IAM: 創建角色權限
- CloudWatch: Logs 訪問

如果是管理員帳戶，應該已有所有權限。

### 問題 4: 區域問題
**解決方案**:
確保使用 `ap-southeast-1`，這個區域默認啟用。

---

## 📞 需要幫助？

完成配置後，回到對話告訴我，我會協助您繼續部署！
