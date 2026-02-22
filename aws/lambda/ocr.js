const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");

const textract = new TextractClient();

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

    try {
        let body;
        if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }

        if (!body || !body.image) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify({ message: 'Missing image data' })
            };
        }

        let base64Image = body.image;
        if (base64Image.includes(',')) {
            base64Image = base64Image.split(',')[1];
        }

        const buffer = Buffer.from(base64Image, 'base64');
        console.log('🐻 [OCR] Image Received (Textract). Buffer Size:', buffer.length);

        const command = new DetectDocumentTextCommand({
            Document: {
                Bytes: buffer
            }
        });

        const response = await textract.send(command);
        const blocks = response.Blocks || [];

        console.log('� [OCR] Textract Blocks Count:', blocks.length);

        // Filter and map to text (Extraction lines)
        const detectedLines = blocks
            .filter(b => b.BlockType === 'LINE')
            .map(b => b.Text);

        console.log('🐻 [OCR] Detected Text:', detectedLines.slice(0, 5).join(' | '));

        // Date Extraction
        const dateRegex = /\b(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})|(\d{4}年\d{1,2}月\d{1,2}日)\b/g;
        let extractedDate = null;

        for (const text of detectedLines) {
            const matches = text.match(dateRegex);
            if (matches) {
                let dateStr = matches[0].replace(/[年月]/g, '-').replace(/日/g, '');
                const parts = dateStr.split('-');
                if (parts[0].length === 4) {
                    extractedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2] && parts[2].length === 4) {
                    extractedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                break;
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                detectedLines,
                extractedDate,
                success: true
            })
        };

    } catch (error) {
        console.error('🐻 [OCR Error]:', error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
                message: 'AI 辨識故障 (Textract)',
                error: error.message,
                success: false
            })
        };
    }
};
