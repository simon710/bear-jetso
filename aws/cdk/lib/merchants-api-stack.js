const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const path = require('path');

class MerchantsApiStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // 1. 創建 DynamoDB 表
        const merchantsTable = new dynamodb.Table(this, 'MerchantsTable', {
            tableName: 'Merchants',
            partitionKey: {
                name: 'merchantId',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // 按需付費模式
            removalPolicy: RemovalPolicy.RETAIN, // 刪除 Stack 時保留表
            pointInTimeRecovery: true, // 啟用時間點恢復
        });

        // 2. 創建 Lambda 函數的通用環境變量
        const lambdaEnvironment = {
            TABLE_NAME: merchantsTable.tableName,
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1' // 提升性能
        };

        // 3. 創建 Lambda 函數的通用配置
        const lambdaCommonProps = {
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: Duration.seconds(10),
            memorySize: 256,
            environment: lambdaEnvironment
        };

        // 4. 創建各個 Lambda 函數
        // Lambda 代碼路徑
        const lambdaPath = path.resolve(__dirname, '..', '..', 'lambda');

        const getMerchantsFunction = new lambda.Function(this, 'GetMerchantsFunction', {
            ...lambdaCommonProps,
            functionName: 'GetMerchants',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'getMerchants.handler',
            description: 'Get all merchants from DynamoDB'
        });

        const getMerchantByIdFunction = new lambda.Function(this, 'GetMerchantByIdFunction', {
            ...lambdaCommonProps,
            functionName: 'GetMerchantById',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'getMerchantById.handler',
            description: 'Get a single merchant by ID'
        });

        const createMerchantFunction = new lambda.Function(this, 'CreateMerchantFunction', {
            ...lambdaCommonProps,
            functionName: 'CreateMerchant',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'createMerchant.handler',
            description: 'Create a new merchant'
        });

        const updateMerchantFunction = new lambda.Function(this, 'UpdateMerchantFunction', {
            ...lambdaCommonProps,
            functionName: 'UpdateMerchant',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'updateMerchant.handler',
            description: 'Update an existing merchant'
        });

        // 5. 授予 Lambda 函數訪問 DynamoDB 的權限
        merchantsTable.grantReadData(getMerchantsFunction);
        merchantsTable.grantReadData(getMerchantByIdFunction);
        merchantsTable.grantWriteData(createMerchantFunction);
        merchantsTable.grantReadWriteData(updateMerchantFunction);

        // 6. 創建 API Gateway
        const api = new apigateway.RestApi(this, 'MerchantsApi', {
            restApiName: 'Merchants API',
            description: 'API for managing merchant data',
            deployOptions: {
                stageName: 'prod',
                throttlingRateLimit: 100,
                throttlingBurstLimit: 200
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token'
                ]
            }
        });

        // 7. 創建 API 資源和方法
        const merchants = api.root.addResource('merchants');

        // GET /merchants - 獲取所有商戶
        merchants.addMethod('GET', new apigateway.LambdaIntegration(getMerchantsFunction), {
            apiKeyRequired: false
        });

        // POST /merchants - 創建新商戶（未來可添加認證）
        merchants.addMethod('POST', new apigateway.LambdaIntegration(createMerchantFunction), {
            apiKeyRequired: false // 建議後續改為 true 並配置 API Key
        });

        // GET /merchants/{id} - 根據 ID 獲取商戶
        const merchant = merchants.addResource('{id}');
        merchant.addMethod('GET', new apigateway.LambdaIntegration(getMerchantByIdFunction), {
            apiKeyRequired: false
        });

        // PUT /merchants/{id} - 更新商戶
        merchant.addMethod('PUT', new apigateway.LambdaIntegration(updateMerchantFunction), {
            apiKeyRequired: false // 建議後續改為 true 並配置 API Key
        });

        // 8. 輸出重要信息
        const cdk = require('aws-cdk-lib');

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
            exportName: 'MerchantsApiUrl'
        });

        new cdk.CfnOutput(this, 'TableName', {
            value: merchantsTable.tableName,
            description: 'DynamoDB Table Name',
            exportName: 'MerchantsTableName'
        });

        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS Region',
            exportName: 'MerchantsApiRegion'
        });
    }
}

module.exports = { MerchantsApiStack };
