const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-southeast-1' // 使用新加坡區域，離香港最近
});
const docClient = DynamoDBDocumentClient.from(client);

// 生成 merchantId（從英文名稱轉換）
function generateMerchantId(nameEn) {
    return nameEn
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

async function migrateData() {
    try {
        console.log('開始遷移商戶資料到 DynamoDB...');

        // 讀取 merchants.json
        const merchantsPath = path.join(__dirname, '../../src/data/merchants.json');
        const merchantsData = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));

        console.log(`找到 ${merchantsData.length} 個商戶`);

        // 準備資料
        const now = new Date().toISOString();
        const items = merchantsData.map(merchant => ({
            merchantId: generateMerchantId(merchant.name_en),
            name: merchant.name,
            name_en: merchant.name_en,
            logo: merchant.logo,
            instagram_id: merchant.instagram_id,
            createdAt: now,
            updatedAt: now
        }));

        // DynamoDB BatchWrite 限制每次最多 25 個項目
        const batchSize = 25;
        const tableName = process.env.TABLE_NAME || 'Merchants';

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            const params = {
                RequestItems: {
                    [tableName]: batch.map(item => ({
                        PutRequest: {
                            Item: item
                        }
                    }))
                }
            };

            console.log(`寫入批次 ${Math.floor(i / batchSize) + 1}...`);
            const command = new BatchWriteCommand(params);
            const result = await docClient.send(command);

            // 處理未處理的項目（如果有的話）
            if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
                console.warn('有未處理的項目:', result.UnprocessedItems);
            }
        }

        console.log('✅ 遷移完成！');
        console.log('\n已遷移的商戶 ID:');
        items.forEach(item => {
            console.log(`  - ${item.merchantId} (${item.name_en})`);
        });

    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        process.exit(1);
    }
}

// 執行遷移
migrateData();
