const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const body = JSON.parse(event.body || '{}');

        // 驗證必填字段
        const requiredFields = ['merchantId', 'name', 'name_en', 'logo', 'instagram_id'];
        const missingFields = requiredFields.filter(field => !body[field]);

        if (missingFields.length > 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`
                })
            };
        }

        const now = new Date().toISOString();
        const item = {
            merchantId: body.merchantId,
            name: body.name,
            name_en: body.name_en,
            logo: body.logo,
            instagram_id: body.instagram_id,
            createdAt: now,
            updatedAt: now
        };

        const params = {
            TableName: process.env.TABLE_NAME || 'Merchants',
            Item: item,
            ConditionExpression: 'attribute_not_exists(merchantId)' // 防止覆蓋現有記錄
        };

        const command = new PutCommand(params);
        await docClient.send(command);

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                data: item
            })
        };
    } catch (error) {
        console.error('Error:', error);

        // 處理條件檢查失敗（重複的 merchantId）
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Merchant already exists'
                })
            };
        }

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
