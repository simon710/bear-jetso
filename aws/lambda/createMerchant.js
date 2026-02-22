const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {

    let _callerUserId = null;
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        _callerUserId = event.requestContext.authorizer.claims.sub || event.requestContext.authorizer.claims['cognito:username'];
    }
    if (!_callerUserId && event.headers) {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const payloadBase64 = authHeader.split('.')[1];
                if (payloadBase64) {
                    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
                    _callerUserId = payload.sub || payload['cognito:username'] || payload.username;
                }
            } catch (e) {}
        }
    }
    if (!_callerUserId && event.queryStringParameters && event.queryStringParameters.userId) {
        _callerUserId = event.queryStringParameters.userId;
    }
    if (!_callerUserId && event.pathParameters && event.pathParameters.id) {
        if (event.resource && event.resource.includes('/profile/{id}')) {
             _callerUserId = event.pathParameters.id;
        } else if (event.path && event.path.includes('/profile/')) {
             _callerUserId = event.pathParameters.id;
        }
    }
    if (!_callerUserId && event.body) {
        try {
            const bodyObj = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            if (bodyObj && bodyObj.userId) {
                _callerUserId = bodyObj.userId;
            }
        } catch (e) {}
    }

    if (_callerUserId) {
        try {
            const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
            const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
            const _tmpClient = new DynamoDBClient({ region: 'ap-southeast-1' });
            const _docClient = DynamoDBDocumentClient.from(_tmpClient);
            const userTable = process.env.USERS_TABLE || 'BearJetsoUsers';
            const userRes = await _docClient.send(new GetCommand({
                TableName: userTable,
                Key: { userId: _callerUserId }
            }));
            if (userRes.Item && userRes.Item.suspended === true) {
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: 'suspended', 
                        message: '您的帳戶已被封鎖 / Your account has been blocked.', 
                        error: 'USER_BLOCKED' 
                    })
                };
            }
        } catch(e) { console.error('Block check error:', e); }
    }

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
