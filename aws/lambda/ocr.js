const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");

const textract = new TextractClient();

exports.handler = async (event) => {
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
