$lambdas = @(
    @{ FuncName = "CommunityHandler"; File = "community.js" },
    @{ FuncName = "UserProfileHandler"; File = "profile.js" },
    @{ FuncName = "CloudSyncHandler"; File = "sync.js" },
    @{ FuncName = "CreateMerchant"; File = "createMerchant.js" },
    @{ FuncName = "UpdateMerchant"; File = "updateMerchant.js" },
    @{ FuncName = "GetMerchantById"; File = "getMerchantById.js" },
    @{ FuncName = "GetMerchants"; File = "getMerchants.js" },
    @{ FuncName = "OcrDetectText"; File = "ocr.js" }
)

$REGION = "ap-southeast-1"
cd aws/lambda

foreach ($l in $lambdas) {
    $func = $l.FuncName
    $file = $l.File
    Write-Host "Zipping and Deploying $func from $file ..."
    Compress-Archive -Path $file -DestinationPath "$func.zip" -Force
    aws lambda update-function-code --function-name $func --zip-file "fileb://$func.zip" --region $REGION | Out-Null
    Write-Host "Deployed $func"
}

cd ../../
