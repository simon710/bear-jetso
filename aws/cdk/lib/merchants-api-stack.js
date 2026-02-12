const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const path = require('path');
const iam = require('aws-cdk-lib/aws-iam');

class MerchantsApiStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // 1. Merchants Table
        const merchantsTable = new dynamodb.Table(this, 'MerchantsTable', {
            tableName: 'Merchants',
            partitionKey: {
                name: 'merchantId',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
        });

        // 2. Community Table
        const communityTable = new dynamodb.Table(this, 'CommunityTable', {
            tableName: 'CommunityDiscounts',
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // 3. Users Table
        const usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'BearJetsoUsers',
            partitionKey: {
                name: 'userId',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        const lambdaEnvironment = {
            TABLE_NAME: merchantsTable.tableName,
            COMMUNITY_TABLE: communityTable.tableName,
            USERS_TABLE: usersTable.tableName,
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
        };

        const lambdaCommonProps = {
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: Duration.seconds(10),
            memorySize: 256,
            environment: lambdaEnvironment
        };

        const lambdaPath = path.join(__dirname, '..', '..', 'lambda');

        // Functions
        const communityFunction = new lambda.Function(this, 'CommunityFunction', {
            ...lambdaCommonProps,
            functionName: 'CommunityHandler',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'community.handler',
            description: 'Handle community sharing, likes, and reports'
        });

        const profileFunction = new lambda.Function(this, 'ProfileFunction', {
            ...lambdaCommonProps,
            functionName: 'UserProfileHandler',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'profile.handler',
            description: 'Handle user profiles'
        });

        const getMerchantsFunction = new lambda.Function(this, 'GetMerchantsFunction', {
            ...lambdaCommonProps,
            functionName: 'GetMerchants',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'getMerchants.handler',
        });

        const getMerchantByIdFunction = new lambda.Function(this, 'GetMerchantByIdFunction', {
            ...lambdaCommonProps,
            functionName: 'GetMerchantById',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'getMerchantById.handler',
        });

        const createMerchantFunction = new lambda.Function(this, 'CreateMerchantFunction', {
            ...lambdaCommonProps,
            functionName: 'CreateMerchant',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'createMerchant.handler',
        });

        const updateMerchantFunction = new lambda.Function(this, 'UpdateMerchantFunction', {
            ...lambdaCommonProps,
            functionName: 'UpdateMerchant',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'updateMerchant.handler',
        });

        const ocrFunction = new lambda.Function(this, 'OcrFunction', {
            ...lambdaCommonProps,
            functionName: 'OcrDetectText',
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'ocr.handler',
            timeout: Duration.seconds(30),
            memorySize: 512
        });

        // Permissions
        merchantsTable.grantReadData(getMerchantsFunction);
        merchantsTable.grantReadData(getMerchantByIdFunction);
        merchantsTable.grantWriteData(createMerchantFunction);
        merchantsTable.grantReadWriteData(updateMerchantFunction);
        communityTable.grantReadWriteData(communityFunction);
        usersTable.grantReadWriteData(profileFunction);

        ocrFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['textract:DetectDocumentText'],
            resources: ['*'],
        }));

        // API Gateway
        const api = new apigateway.RestApi(this, 'MerchantsApi', {
            restApiName: 'Merchants API',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
            }
        });

        // Custom Domain
        try {
            const domainName = apigateway.DomainName.fromDomainNameAttributes(this, 'ExistingDomainName', {
                domainName: 'api.bigfootws.com',
                domainNameAliasHostedZoneId: '',
                domainNameAliasTarget: 'd-k2zttjdsb4.execute-api.ap-southeast-1.amazonaws.com'
            });
            new apigateway.BasePathMapping(this, 'ApiMapping', {
                domainName: domainName,
                restApi: api,
                stage: api.deploymentStage
            });
        } catch (e) { }

        // Resources
        const merchants = api.root.addResource('merchants');
        merchants.addMethod('GET', new apigateway.LambdaIntegration(getMerchantsFunction));
        merchants.addMethod('POST', new apigateway.LambdaIntegration(createMerchantFunction));

        const merchant = merchants.addResource('{id}');
        merchant.addMethod('GET', new apigateway.LambdaIntegration(getMerchantByIdFunction));
        merchant.addMethod('PUT', new apigateway.LambdaIntegration(updateMerchantFunction));

        api.root.addResource('ocr').addMethod('POST', new apigateway.LambdaIntegration(ocrFunction));

        const community = api.root.addResource('community');
        community.addMethod('GET', new apigateway.LambdaIntegration(communityFunction));
        community.addMethod('POST', new apigateway.LambdaIntegration(communityFunction));

        const communityItem = community.addResource('{id}');
        communityItem.addResource('like').addMethod('POST', new apigateway.LambdaIntegration(communityFunction));
        communityItem.addResource('report').addMethod('POST', new apigateway.LambdaIntegration(communityFunction));

        const profile = api.root.addResource('profile');
        profile.addMethod('POST', new apigateway.LambdaIntegration(profileFunction));
        profile.addResource('{id}').addMethod('GET', new apigateway.LambdaIntegration(profileFunction));

        // Outputs
        new CfnOutput(this, 'ApiUrl', { value: api.url });
        new CfnOutput(this, 'TableName', { value: merchantsTable.tableName });
        new CfnOutput(this, 'CommunityTableName', { value: communityTable.tableName });
    }
}

module.exports = { MerchantsApiStack };
