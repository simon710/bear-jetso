# 🚀 快速部署指令參考

## 安裝完 AWS CLI 後，按順序執行這些命令：

### 1️⃣ 驗證 AWS CLI
```powershell
aws --version
```

### 2️⃣ 配置憑證
```powershell
aws configure
# 輸入：Access Key, Secret Key, ap-southeast-1, json
```

### 3️⃣ 驗證配置
```powershell
aws sts get-caller-identity
```

### 4️⃣ 部署（一鍵完成）
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws"
.\deploy.ps1
```

---

## 📝 或者手動逐步執行：

### Bootstrap CDK（首次）
```powershell
cd "c:\Users\Simon\Desktop\AI Project\bear_jetso\aws\cdk"
npx cdk bootstrap
```

### 部署資源
```powershell
npm run deploy
```

### 遷移資料
```powershell
cd ..\scripts
node migrate-merchants.js
```

---

## 🔗 有用的鏈接

- AWS CLI 下載：https://awscli.amazonaws.com/AWSCLIV2.msi
- AWS Console：https://console.aws.amazon.com/
- 安全憑證頁面：https://console.aws.amazon.com/iam/home#/security_credentials

---

## ✅ 完成標記

安裝完成後，在對話中告訴我，我會協助您繼續！
