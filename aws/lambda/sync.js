const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const BACKUPS_TABLE = process.env.BACKUPS_TABLE;
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET;

async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (reject));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}

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

    const { httpMethod, path, queryStringParameters, body } = event;
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Content-Type": "application/json"
    };

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (httpMethod === 'POST' && path.includes('/backup')) {
            const data = JSON.parse(body);
            const { userId, discounts: incomingDiscounts, settings, isIncremental } = data;

            if (!userId) {
                return { statusCode: 400, headers, body: JSON.stringify({ message: "userId is required" }) };
            }

            let finalDiscounts = incomingDiscounts;
            const s3Key = `backups/${userId}.json`;

            // 🚩 ONLY perform merge if isIncremental is explicitly true
            if (isIncremental) {
                try {
                    const s3Response = await s3Client.send(new GetObjectCommand({
                        Bucket: UPLOAD_BUCKET,
                        Key: s3Key
                    }));
                    const bodyContents = await streamToString(s3Response.Body);
                    const cloudData = JSON.parse(bodyContents);
                    const cloudDiscounts = cloudData.discounts || [];

                    const getIdentifier = (d) => d.uid || `${d.title}_${d.expiryDate}`;
                    const cloudIdentifiers = new Set(cloudDiscounts.map(getIdentifier));

                    const mergedResult = [...cloudDiscounts];
                    incomingDiscounts.forEach(item => {
                        const id = getIdentifier(item);
                        if (!cloudIdentifiers.has(id)) {
                            mergedResult.push(item);
                        }
                    });

                    finalDiscounts = mergedResult;
                } catch (s3Err) {
                    console.log("No existing backup or merge failed. Using incoming.");
                    finalDiscounts = incomingDiscounts;
                }
            } else {
                // 🚩 Routine Auto-backup (isIncremental = false/undefined): Overwrite S3 with the current local state
                // This allows DELETIONS to sync correctly.
                finalDiscounts = incomingDiscounts;
            }

            // Save to S3
            const backupPayload = JSON.stringify({ discounts: finalDiscounts, settings });
            await s3Client.send(new PutObjectCommand({
                Bucket: UPLOAD_BUCKET,
                Key: s3Key,
                Body: backupPayload,
                ContentType: 'application/json'
            }));

            // Save metadata
            const metadata = {
                userId,
                s3Key,
                updatedAt: Date.now(),
                count: finalDiscounts.length
            };
            await docClient.send(new PutCommand({
                TableName: BACKUPS_TABLE,
                Item: metadata
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: "Sync successful",
                    isIncremental,
                    syncedCount: finalDiscounts.length,
                    discounts: finalDiscounts
                })
            };
        }

        if (httpMethod === 'GET' && path.includes('/restore')) {
            const userId = queryStringParameters?.userId;
            if (!userId) {
                return { statusCode: 400, headers, body: JSON.stringify({ message: "userId is required" }) };
            }

            const result = await docClient.send(new GetCommand({
                TableName: BACKUPS_TABLE,
                Key: { userId }
            }));

            if (!result.Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ message: "No backup found" }) };
            }

            const s3Response = await s3Client.send(new GetObjectCommand({
                Bucket: UPLOAD_BUCKET,
                Key: `backups/${userId}.json`
            }));
            const bodyContents = await streamToString(s3Response.Body);
            const payload = JSON.parse(bodyContents);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ ...result.Item, ...payload })
            };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message })
        };
    }
};
