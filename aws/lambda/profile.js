const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;

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
            if (!userData.userId) {
                return { statusCode: 400, headers, body: JSON.stringify({ message: "userId is required" }) };
            }

            const item = {
                ...userData,
                updatedAt: Date.now()
            };

            await docClient.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: item
            }));

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
