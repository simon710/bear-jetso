# 🐻 Bear Jetso - AWS Console 手動部署詳細指南

這份指南將幫助您避開 CDK 工具的問題，直接透過 AWS 網頁界面完成後端部署。

## 1. DynamoDB (數據庫)
1. 登入 [AWS Console](https://console.aws.amazon.com/)
2. 搜尋 **DynamoDB**
3. 點擊 **Create table**
4. 配置：
   - **Table name**: `Merchants`
   - **Partition key**: `merchantId` (類型: **String**)
5. 其他保持預設，點擊 **Create table**

## 2. IAM (權限管理)
1. 搜尋 **IAM**
2. 點擊 **Roles** -> **Create role**
3. 選擇 **AWS service**，選擇 **Lambda**，點擊 **Next**
4. 搜尋並勾選 `AmazonDynamoDBFullAccess`
5. 搜尋並勾選 `AWSLambdaBasicExecutionRole`
6. 點擊 **Next**，Role name 輸入 `BearJetsoLambdaRole`
7. 點擊 **Create role**

## 3. Lambda (業務邏輯)
您需要創建 4 個 Lambda 函數。

### 步驟 (以 GetMerchants 為例)：
1. 搜尋 **Lambda**，點擊 **Create function**
2. 填寫：
   - **Name**: `GetMerchants`
   - **Runtime**: `Node.js 18.x`
   - **Role**: `Use an existing role` -> 選擇 `BearJetsoLambdaRole`
3. 點擊 **Create**
4. 在 Code 區域，複製 `aws/lambda/getMerchants.js` 的內容替換預設代碼
5. 點擊 **Deploy**

**請對其餘函數重複此操作：**
- `GetMerchantById` -> 代碼使用 `aws/lambda/getMerchantById.js`
- `CreateMerchant` -> 代碼使用 `aws/lambda/createMerchant.js`
- `UpdateMerchant` -> 代碼使用 `aws/lambda/updateMerchant.js`

## 4. API Gateway (接口服務)
1. 搜尋 **API Gateway**
2. 點擊 **Create API**，在 **REST API** 處點擊 **Build**
3. 名稱輸入 `BearJetsoAPI`，點擊 **Create**
4. **創建 /merchants 資源**:
   - Actions -> Create Resource -> Name: `merchants`
   - 選中 `/merchants` -> Actions -> Create Method -> **GET** -> 選擇 `GetMerchants` 函數
   - 選中 `/merchants` -> Actions -> Create Method -> **POST** -> 選擇 `CreateMerchant` 函數
5. **創建 /{id} 資源**:
   - 選中 `/merchants` -> Actions -> Create Resource -> Name: `{id}`
   - 選中 `/{id}` -> Actions -> Create Method -> **GET** -> 選擇 `GetMerchantById` 函數
   - 選中 `/{id}` -> Actions -> Create Method -> **PUT** -> 選擇 `UpdateMerchant` 函數
6. **啟用 CORS (關鍵步驟)**:
   - 分別選中 `/merchants` 和 `/{id}`，點擊 Actions -> **Enable CORS**，點擊確認
7. **部署**:
   - Actions -> **Deploy API** -> Stage: `prod`
8. **複製網址**: 複製頂部的 **Invoke URL**

## 5. 前端對接
1. 打開 `.env` 文件
2. 填入：`REACT_APP_MERCHANTS_API_URL=[您的網址]`
3. 執行數據遷移腳本：
   ```powershell
   cd aws/scripts
   $env:AWS_REGION="[您的區域]"
   $env:TABLE_NAME="Merchants"
   node migrate-merchants.js
   ```
4. 啟動 React：`npm start`
