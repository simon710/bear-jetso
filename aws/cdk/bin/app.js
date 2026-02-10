#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { MerchantsApiStack } = require('../lib/merchants-api-stack');

const app = new cdk.App();

new MerchantsApiStack(app, 'BearJetsoMerchantsApiStack', {
    env: {
        // 使用新加坡區域（離香港最近且默認可用）
        region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-1',
        account: process.env.CDK_DEFAULT_ACCOUNT
    },
    description: 'Bear Jetso Merchants API - DynamoDB, Lambda, and API Gateway'
});

app.synth();
