# Fix API Gateway CORS Script (Ultimate Defense)
$API_ID = "dyk5fft8dd"
$REGION = "ap-southeast-1"

# 定義所有 JSON 配置
$RequestTemplate = '{"application/json": "{\"statusCode\": 200}"}'
$ResponseModels = '{"application/json": "Empty"}'
$MethodResponseParams = '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}'
$IntegrationResponseParams = '{"method.response.header.Access-Control-Allow-Headers": "''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token''", "method.response.header.Access-Control-Allow-Methods": "''GET,POST,PUT,DELETE,OPTIONS''", "method.response.header.Access-Control-Allow-Origin": "''*''"}'

# 寫入臨時文件 (使用 ASCII 編碼確保相容性)
$RequestTemplate | Out-File -FilePath "req_template.json" -Encoding ascii
$ResponseModels | Out-File -FilePath "res_models.json" -Encoding ascii
$MethodResponseParams | Out-File -FilePath "method_params.json" -Encoding ascii
$IntegrationResponseParams | Out-File -FilePath "integration_params.json" -Encoding ascii

$RESOURCES = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json

foreach ($item in $RESOURCES.items) {
    $resId = $item.id
    $path = $item.path
    Write-Host ">>> Processing route: $path" -ForegroundColor Cyan

    # 1. Put OPTIONS method
    aws apigateway put-method --rest-api-id $API_ID --resource-id $resId --http-method OPTIONS --authorization-type "NONE" --region $REGION 2>$null

    # 2. Put Integration (MOCK)
    aws apigateway put-integration --rest-api-id $API_ID --resource-id $resId --http-method OPTIONS --type MOCK --request-templates file://req_template.json --region $REGION

    # 3. Put Method Response
    aws apigateway put-method-response --rest-api-id $API_ID --resource-id $resId --http-method OPTIONS --status-code 200 --response-models file://res_models.json --response-parameters file://method_params.json --region $REGION

    # 4. Put Integration Response
    aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $resId --http-method OPTIONS --status-code 200 --response-parameters file://integration_params.json --region $REGION
}

# Final Step: Deploy API
Write-Host ">>> Deploying API to prod stage..." -ForegroundColor Yellow
aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION

# Clean up
Remove-Item req_template.json, res_models.json, method_params.json, integration_params.json -ErrorAction SilentlyContinue

Write-Host "✅ DONE! All paths updated with CORS. Please test in browser." -ForegroundColor Green
