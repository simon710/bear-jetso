const fs = require('fs');

const filesToPatch = [
    //    { src: 'aws_backup/CommunityHandler/community.js', dest: 'aws/lambda/community.js' },
    { src: 'aws_backup/UserProfileHandler/profile.js', dest: 'aws/lambda/profile.js' },
    { src: 'aws_backup/CloudSyncHandler/sync.js', dest: 'aws/lambda/sync.js' },
    { src: 'aws_backup/CreateMerchant/createMerchant.js', dest: 'aws/lambda/createMerchant.js' },
    { src: 'aws_backup/UpdateMerchant/updateMerchant.js', dest: 'aws/lambda/updateMerchant.js' },
    { src: 'aws_backup/getMerchantById/getMerchantById.js', dest: 'aws/lambda/getMerchantById.js' },
    { src: 'aws_backup/getMerchants/getMerchants.js', dest: 'aws/lambda/getMerchants.js' },
    { src: 'aws_backup/OcrDetectText/ocr.js', dest: 'aws/lambda/ocr.js' }
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

for (let fileObj of filesToPatch) {
    if (!fs.existsSync(fileObj.src)) {
        console.log('Skipping ' + fileObj.src);
        continue;
    }
    let content = fs.readFileSync(fileObj.src, 'utf8');

    const handlerRegex = /(exports\.handler\s*=\s*async\s*\(event\)\s*=>\s*\{)([\s\S]*)/;
    const match = content.match(handlerRegex);
    if (match) {
        const newContent = content.substring(0, match.index) + match[1] + '\n' + checkLogic + match[2];
        fs.writeFileSync(fileObj.dest, newContent, 'utf8');
        console.log('Patched ' + fileObj.dest);
    } else {
        console.log('Could not find handler in ' + fileObj.src);
    }
}
