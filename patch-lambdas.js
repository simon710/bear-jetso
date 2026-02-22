const fs = require('fs');

const filesToPatch = [
    'aws/lambda/community.js',
    'aws/lambda/profile.js',
    'aws/lambda/sync.js',
    'aws/lambda/createMerchant.js',
    'aws/lambda/updateMerchant.js',
    'aws/lambda/getMerchantById.js',
    'aws/lambda/getMerchants.js',
    'aws/lambda/ocr.js'
];

const checkLogic = `
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
    // New: Check if userId is explicitly passed in query or body
    if (!_callerUserId && event.queryStringParameters && event.queryStringParameters.userId) {
        _callerUserId = event.queryStringParameters.userId;
    }
    if (!_callerUserId && event.pathParameters && event.pathParameters.id) {
        // sometimes the id in path is the userId
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
                    statusCode: 403,
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
`;

for (let file of filesToPatch) {
    if (!fs.existsSync(file)) {
        console.log('Skipping ' + file);
        continue;
    }
    let content = fs.readFileSync(file, 'utf8');

    // Remove any previous global block logic if we added it
    if (content.includes('// Global Block Check') || content.includes('_callerUserId')) {
        console.log('File ' + file + ' already has check, overwriting with universal check logic');
        // But wait, our new files from aws_backup DON'T have the old check, except maybe some.
        if (content.includes('_callerUserId')) {
            continue; // Already ran this script on it
        }
    }

    // We want to insert the logic right after `exports.handler = async (event) => {`
    const handlerRegex = /(exports\.handler\s*=\s*async\s*\(event\)\s*=>\s*\{)([\s\S]*)/;
    const match = content.match(handlerRegex);
    if (match) {
        // match[1] is the function signature, match[2] is the body
        const newContent = content.substring(0, match.index) + match[1] + '\n' + checkLogic + match[2];
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Patched ' + file);
    } else {
        console.log('Could not find handler in ' + file);
    }
}
