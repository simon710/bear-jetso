const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const COMMUNITY_TABLE = process.env.COMMUNITY_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET || 'bear-jetso-profile-pics';
const ASSETS_DOMAIN = 'bigfootws.com';

function transformAvatarUrl(url) {
    if (!url) return url;
    if (typeof url === 'string' && url.includes('amazonaws.com')) {
        return url.replace(`${UPLOAD_BUCKET}.s3.ap-southeast-1.amazonaws.com`, ASSETS_DOMAIN);
    }
    return url;
}

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

            let items = (data.Items || []).sort((a, b) => b.createdAt - a.createdAt);

            // Fetch latest user profiles to ensure avatars/nicknames are up-to-date
            const userIds = [...new Set(items.map(i => i.userId).filter(id => !!id))];

            if (userIds.length > 0) {
                const profilesMap = {};

                for (let i = 0; i < userIds.length; i += 100) {
                    const batch = userIds.slice(i, i + 100);
                    const batchResponse = await docClient.send(new BatchGetCommand({
                        RequestItems: {
                            [USERS_TABLE]: {
                                Keys: batch.map(id => ({ userId: id }))
                            }
                        }
                    }));

                    const batchUsers = batchResponse.Responses[USERS_TABLE] || [];
                    batchUsers.forEach(u => {
                        profilesMap[u.userId] = u;
                    });
                }

                items = items.map(item => {
                    const avatar = transformAvatarUrl(item.avatar);
                    if (item.userId && profilesMap[item.userId]) {
                        const profile = profilesMap[item.userId];
                        return {
                            ...item,
                            nickname: profile.nickname || item.nickname,
                            avatar: transformAvatarUrl(profile.avatar) || avatar
                        };
                    }
                    return { ...item, avatar };
                });
            }

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
        if (httpMethod === 'POST' && path.endsWith('/like')) {
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

        // POST /community/{id}/unlike
        if (httpMethod === 'POST' && path.endsWith('/unlike')) {
            const id = pathParameters.id;
            await docClient.send(new UpdateCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id },
                UpdateExpression: "SET likes = likes - :inc",
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
