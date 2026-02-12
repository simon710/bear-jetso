const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const COMMUNITY_TABLE = process.env.COMMUNITY_TABLE;

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        // GET /community - List shared discounts
        if (httpMethod === 'GET' && path === '/community') {
            const today = new Date().toISOString().split('T')[0];
            const data = await docClient.send(new ScanCommand({
                TableName: COMMUNITY_TABLE,
                FilterExpression: "reports < :val AND expiryDate >= :today",
                ExpressionAttributeValues: {
                    ":val": 10,
                    ":today": today
                }
            }));

            // Sort by createdAt desc
            const items = (data.Items || []).sort((a, b) => b.createdAt - a.createdAt);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(items)
            };
        }

        // POST /community - Share a discount
        if (httpMethod === 'POST' && path === '/community') {
            const bodyData = JSON.parse(body);
            const newItem = {
                ...bodyData,
                id: bodyData.id || Date.now().toString(),
                userId: bodyData.userId,
                nickname: bodyData.nickname || '神秘小熊',
                avatar: bodyData.avatar || '🐻',
                likes: 0,
                reports: 0,
                createdAt: Date.now()
            };

            await docClient.send(new PutCommand({
                TableName: COMMUNITY_TABLE,
                Item: newItem
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newItem)
            };
        }

        // POST /community/{id}/like
        if (httpMethod === 'POST' && path.includes('/like')) {
            const id = pathParameters.id;
            await docClient.send(new UpdateCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id },
                UpdateExpression: "SET likes = likes + :inc",
                ExpressionAttributeValues: { ":inc": 1 },
                ReturnValues: "ALL_NEW"
            }));
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // POST /community/{id}/report
        if (httpMethod === 'POST' && path.includes('/report')) {
            const id = pathParameters.id;
            const res = await docClient.send(new UpdateCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id },
                UpdateExpression: "SET reports = reports + :inc",
                ExpressionAttributeValues: { ":inc": 1 },
                ReturnValues: "ALL_NEW"
            }));
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, reports: res.Attributes.reports }) };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: "Not Found" })
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message })
        };
    }
};
