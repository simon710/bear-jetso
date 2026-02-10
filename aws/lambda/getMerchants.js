const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const params = {
            TableName: process.env.TABLE_NAME || 'Merchants'
        };

        const command = new ScanCommand(params);
        const result = await docClient.send(command);

        // 檢查是否需要回傳完整 ID 資訊 (merchantId, instagram_id)
        const showMid = event.queryStringParameters && (event.queryStringParameters.mid === 'true' || event.queryStringParameters.mid === '1');

        let items = result.Items || [];

        // 處理回傳欄位
        items = items.map(item => {
            // 1. 移除不必要的系統時間欄位
            const { updatedAt, createdAt, ...processedItem } = item;

            // 2. 處理 logo 路徑 (只保留檔名)
            if (processedItem.logo && typeof processedItem.logo === 'string' && processedItem.logo.startsWith('http')) {
                const parts = processedItem.logo.split('/');
                processedItem.logo = parts[parts.length - 1];
            }

            // 3. 根據 mid 參數決定是否返回 ID 欄位
            if (!showMid) {
                const { merchantId, instagram_id, ...rest } = processedItem;
                return rest;
            }

            return processedItem;
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                merchants: items,
                data: items,
                count: items.length
            })
        };
    } catch (error) {
        console.error('Error:', error);

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
