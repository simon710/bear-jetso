const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand, BatchGetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const COMMUNITY_TABLE = process.env.COMMUNITY_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET || 'bear-jetso-profile-pics';
const ASSETS_DOMAIN = 'assets.bigfootws.com';

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
        const actualPath = path ? path.replace('/prod', '') : '';

        // GET /community - List shared discounts with pagination
        if (httpMethod === 'GET' && (actualPath === '/community' || event.resource === '/community')) {
            const isAdmin = event.queryStringParameters?.admin === 'true';
            const today = new Date().toISOString().split('T')[0];
            const limit = parseInt(event.queryStringParameters?.limit) || 10;
            const lastKey = event.queryStringParameters?.lastKey ?
                JSON.parse(Buffer.from(event.queryStringParameters.lastKey, 'base64').toString()) : null;

            let items = [];
            let currentLastKey = lastKey;

            // Use a larger window to ensure we get a better pool of "latest" items
            const scanDepth = Math.max(limit * 10, 200);

            // Keep scanning until we have enough items or we've reached the end
            let scanCount = 0;
            while (items.length < scanDepth && scanCount < 5) {
                const params = {
                    TableName: COMMUNITY_TABLE,
                    Limit: scanDepth
                };

                // Admin sees everything, normal users only see low reports and non-expired
                if (!isAdmin) {
                    params.FilterExpression = "reports < :val AND (attribute_not_exists(expiryDate) OR expiryDate >= :today) AND (attribute_not_exists(suspended) OR suspended <> :true)";
                    params.ExpressionAttributeValues = {
                        ":val": 10,
                        ":today": today,
                        ":true": true
                    };
                }

                if (currentLastKey) {
                    params.ExclusiveStartKey = currentLastKey;
                }

                const data = await docClient.send(new ScanCommand(params));
                items = [...items, ...(data.Items || [])];
                currentLastKey = data.LastEvaluatedKey;
                scanCount++;

                if (!currentLastKey) break;
            }

            items = items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit);

            // ... (rest of user profile fetching)
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
                    batchUsers.forEach(u => { profilesMap[u.userId] = u; });
                }

                items = items.map(item => {
                    const avatar = transformAvatarUrl(item.avatar);
                    const image = transformAvatarUrl(item.image);
                    const images = (item.images || []).map(img => transformAvatarUrl(img));

                    if (item.userId && profilesMap[item.userId]) {
                        const profile = profilesMap[item.userId];
                        return {
                            ...item,
                            image,
                            images,
                            nickname: profile.nickname || item.nickname,
                            avatar: transformAvatarUrl(profile.avatar) || avatar
                        };
                    }
                    return { ...item, avatar, image, images };
                });
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    items,
                    lastKey: currentLastKey ? Buffer.from(JSON.stringify(currentLastKey)).toString('base64') : null
                })
            };
        }

        // GET /community/{id} - Get a single post
        if (httpMethod === 'GET' && (actualPath.startsWith('/community/') || event.resource === '/community/{id}')) {
            const id = pathParameters.id;
            const res = await docClient.send(new GetCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id }
            }));

            if (!res.Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ message: "Post not found" }) };
            }

            const item = res.Item;
            // Optionally join user profile here if needed, but keeping it simple for now
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ...item,
                    avatar: transformAvatarUrl(item.avatar),
                    image: transformAvatarUrl(item.image),
                    images: (item.images || []).map(img => transformAvatarUrl(img))
                })
            };
        }

        // DELETE /community/{id}
        if (httpMethod === 'DELETE' && (actualPath.startsWith('/community/') || event.resource === '/community/{id}')) {
            const id = pathParameters.id;
            // const isAdmin = event.requestContext?.authorizer?.claims?.['cognito:groups']?.includes('Admin') || true; // Force true for now if needed, but usually checked via API GW

            await docClient.send(new DeleteCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id }
            }));

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Post deleted" }) };
        }

        // POST /community/{id}/suspend
        if (httpMethod === 'POST' && (actualPath.endsWith('/suspend') || event.resource?.endsWith('/suspend'))) {
            const id = pathParameters.id;
            const bodyData = JSON.parse(body || '{}');
            const suspended = bodyData.suspended !== false;

            await docClient.send(new UpdateCommand({
                TableName: COMMUNITY_TABLE,
                Key: { id },
                UpdateExpression: "SET suspended = :s",
                ExpressionAttributeValues: { ":s": suspended },
                ReturnValues: "ALL_NEW"
            }));
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, suspended }) };
        }


        // POST /community - Share a discount
        if (httpMethod === 'POST' && (actualPath === '/community' || event.resource === '/community')) {
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
        if (httpMethod === 'POST' && (actualPath.endsWith('/like') || event.resource?.endsWith('/like'))) {
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
        if (httpMethod === 'POST' && (actualPath.endsWith('/unlike') || event.resource?.endsWith('/unlike'))) {
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
        if (httpMethod === 'POST' && (actualPath.includes('/report') || event.resource?.includes('/report'))) {
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
            body: JSON.stringify({
                message: "Not Found",
                path,
                method: httpMethod,
                resource: event.resource
            })
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: error.message,
                stack: error.stack
            })
        };
    }
};
