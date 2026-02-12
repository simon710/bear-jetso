const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testOcr() {
    const API_URL = 'https://api.bigfootws.com/ocr';
    const imagePath = path.join(__dirname, 'logo192.png');

    console.log('🐻 [Test] 正在測試 OCR API...');
    console.log('🐻 [Test] 目標地址:', API_URL);

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('❌ 找不到測試圖片 logo192.png');
            return;
        }

        // 讀取圖片並轉為 base64
        const fileBuffer = fs.readFileSync(imagePath);
        const base64Image = fileBuffer.toString('base64');

        console.log(`🐻 [Test] 圖片已讀取，大小: ${Math.round(fileBuffer.length / 1024)} KB`);

        const startTime = Date.now();
        const response = await axios.post(API_URL, {
            image: base64Image
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const duration = Date.now() - startTime;
        console.log(`✅ [Test] 請求成功！耗時: ${duration}ms`);
        console.log('📦 [Test] 響應數據:', JSON.stringify(response.data, null, 2));

        if (response.data.detectedLines && response.data.detectedLines.length > 0) {
            console.log('✨ [Test] 成功辨識出文字！');
        } else {
            console.log('⚠️ [Test] 請求成功，但未辨識出文字（這對 logo192.png 可能是正常的，取決於圖像內容）');
        }

    } catch (error) {
        console.error('❌ [Test] 請求失敗:');
        if (error.response) {
            console.error(`   狀態碼: ${error.response.status}`);
            console.error(`   消息:`, error.response.data);
        } else {
            console.error(`   錯誤詳情: ${error.message}`);
        }
    }
}

testOcr();
