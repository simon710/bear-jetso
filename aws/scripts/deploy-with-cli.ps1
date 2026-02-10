# Bear Jetso AWS CLI 部署腳本 v2.0 (完全修正)
$REGION = "ap-southeast-1"
$ROLE_NAME = "BearJetsoLambdaRoleCli"
$TABLE_NAME = "Merchants"
$API_NAME = "BearJetsoAPI-CLI"

Write-Host "--- 1. 獲取 AWS 賬號信息 ---" -ForegroundColor Cyan
$ACCOUNT_ID = (aws sts get-caller-identity --query "Account" --output text)
if (!$ACCOUNT_ID) { Write-Error "無法獲取 AWS 賬號，請檢查 aws configure"; exit }

Write-Host "--- 2. 創建 DynamoDB 表 ---" -ForegroundColor Cyan
aws dynamodb create-table --table-name $TABLE_NAME --attribute-definitions AttributeName=merchantId, AttributeType=S --key-schema AttributeName=merchantId, KeyType=HASH --billing-mode PAY_PER_REQUEST --region $REGION 2>$null

Write-Host "--- 3. 創建 IAM 角色 ---" -ForegroundColor Cyan
$TRUST_POLICY = @{
    Version   = "2012-10-17"
    Statement = @(
        @{
            Effect    = "Allow"
            Principal = @{ Service = "lambda.amazonaws.com" }
            Action    = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10
$TRUST_POLICY | Out-File -FilePath "trust-policy.json" -Encoding UTF8
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://trust-policy.json 2>$null
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess 2>$null
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>$null

Start-Sleep -Seconds 10

Write-Host "--- 4. 部署 Lambda 函數 ---" -ForegroundColor Cyan
$LAMBDA_DIR = "..\lambda"
$FUNCTIONS = @("getMerchants", "getMerchantById", "createMerchant", "updateMerchant")

foreach ($FUNC in $FUNCTIONS) {
    Write-Host "部署 $FUNC..." -ForegroundColor Yellow
    Compress-Archive -Path "$LAMBDA_DIR\$FUNC.js" -DestinationPath "$FUNC.zip" -Force 2>$null
    
    aws lambda create-function --function-name $FUNC --runtime nodejs18.x --role "arn:aws:iam::${ACCOUNT_ID}:role/$ROLE_NAME" --handler "$FUNC.handler" --zip-file "fileb://$FUNC.zip" --region $REGION 2>$null
    
    aws lambda update-function-code --function-name $FUNC --zip-file "fileb://$FUNC.zip" --region $REGION 2>$null
}

Write-Host "--- 5. 創建 API Gateway ---" -ForegroundColor Cyan
$API_ID = aws apigateway create-rest-api --name $API_NAME --region $REGION --query "id" --output text
$ROOT_ID = aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/'].id" --output text
$RESOURCE_ID = aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_ID --path-part "merchants" --region $REGION --query "id" --output text

$INTEGRATION_URI = "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:getMerchants/invocations"
aws apigateway put-method --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method GET --authorization-type "NONE" --region $REGION 2>$null
aws apigateway put-integration --rest-api-id $API_ID --resource-id $RESOURCE_ID --http-method GET --type AWS_PROXY --integration-http-method POST --uri $INTEGRATION_URI --region $REGION 2>$null

aws lambda add-permission --function-name getMerchants --statement-id apigateway-get --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" --region $REGION 2>$null

aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION 2>$null

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "部署完成！API URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/merchants" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Green

Remove-Item *.zip -ErrorAction SilentlyContinue
Remove-Item trust-policy.json -ErrorAction SilentlyContinue
