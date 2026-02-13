const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const USERS_TABLE = process.env.USERS_TABLE;
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET;

async function uploadToS3(base64Data, userId) {
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Image, 'base64');
    const key = `avatars/${userId}.jpg`;

    await s3Client.send(new PutObjectCommand({
        Bucket: UPLOAD_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
        // ACL: 'public-read' // Using bucket policy instead
    }));

    return `https://${UPLOAD_BUCKET}.s3.ap-southeast-1.amazonaws.com/${key}`;
}

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        // GET /profile/{userId}
        if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
            const userId = pathParameters.id;
            const data = await docClient.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { userId }
            }));

            if (!data.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: "User not found" })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data.Item)
            };
        }

        // POST /profile - Create or update profile
        if (httpMethod === 'POST') {
            const userData = JSON.parse(body);
            const { userId, avatarData, ...rest } = userData;
            if (!userId) {
                return { statusCode: 400, headers, body: JSON.stringify({ message: "userId is required" }) };
            }

            let avatarUrl = userData.avatar;
            if (avatarData) {
                console.log(`Attempting S3 upload for user ${userId}, data length: ${avatarData.length}`);
                try {
                    avatarUrl = await uploadToS3(avatarData, userId);
                    console.log(`S3 upload success: ${avatarUrl}`);
                } catch (s3Error) {
                    console.error("S3 Upload Error:", s3Error);
                    // Keep the previous avatar if upload fails, or log specifically
                }
            }

            const item = {
                ...rest,
                userId,
                avatar: avatarUrl,
                updatedAt: Date.now()
            };

            console.log(`Saving to DynamoDB: ${userId}`);
            await docClient.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: item
            }));
            console.log("DynamoDB save success");

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(item)
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
