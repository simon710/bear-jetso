const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function run() {
    const data = await docClient.send(new ScanCommand({
        TableName: 'BearJetsoUsers'
    }));

    console.log(data.Items.filter(i => i.suspended === true));
}

run();
