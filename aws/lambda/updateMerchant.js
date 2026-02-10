const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const merchantId = event.pathParameters?.id;
        const body = JSON.parse(event.body || '{}');

        if (!merchantId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'merchantId is required'
                })
            };
        }

        // 構建更新表達式
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        const allowedFields = ['name', 'name_en', 'logo', 'instagram_id'];

        allowedFields.forEach((field, index) => {
            if (body[field] !== undefined) {
                const nameKey = `#field${index}`;
                const valueKey = `:value${index}`;
                updateExpressions.push(`${nameKey} = ${valueKey}`);
                expressionAttributeNames[nameKey] = field;
                expressionAttributeValues[valueKey] = body[field];
            }
        });

        if (updateExpressions.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'No valid fields to update'
                })
            };
        }

        // 添加 updatedAt
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: process.env.TABLE_NAME || 'Merchants',
            Key: {
                merchantId: merchantId
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(merchantId)', // 確保記錄存在
            ReturnValues: 'ALL_NEW'
        };

        const command = new UpdateCommand(params);
        const result = await docClient.send(command);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                data: result.Attributes
            })
        };
    } catch (error) {
        console.error('Error:', error);

        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Merchant not found'
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
