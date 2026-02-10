/**
 * 本地測試腳本
 * 用於測試 merchantsApi 服務
 */

const merchantsApi = require('./src/services/merchantsApi');

async function testMerchantsApi() {
    console.log('🧪 開始測試 Merchants API...\n');

    try {
        // 測試 1: 獲取所有商家
        console.log('📋 測試 1: 獲取所有商家');
        const merchants = await merchantsApi.getAllMerchants();
        console.log(`✅ 成功獲取 ${merchants.length} 個商家`);
        console.log('前 3 個商家:', merchants.slice(0, 3).map(m => m.name_en));
        console.log('');

        // 測試 2: 根據 ID 獲取單個商家
        if (merchants.length > 0) {
            const firstMerchantId = merchants[0].merchantId || merchantsApi.generateMerchantId(merchants[0].name_en);
            console.log(`📱 測試 2: 獲取單個商家 (${firstMerchantId})`);
            const merchant = await merchantsApi.getMerchantById(firstMerchantId);
            console.log(`✅ 成功獲取商家:`, merchant);
            console.log('');
        }

        // 測試 3: 搜索商家
        console.log('🔍 測試 3: 搜索商家 (關鍵字: "佳")');
        const searchResult = await merchantsApi.searchMerchants('佳');
        console.log(`✅ 找到 ${searchResult.length} 個匹配的商家`);
        console.log('搜索結果:', searchResult.map(m => m.name));
        console.log('');

        // 測試 4: 緩存功能
        console.log('💾 測試 4: 緩存功能');
        const start = Date.now();
        await merchantsApi.getAllMerchants(true); // 使用緩存
        const cachedTime = Date.now() - start;
        console.log(`✅ 緩存加載時間: ${cachedTime}ms (應該很快)`);
        console.log('');

        // 測試 5: 刷新數據
        console.log('🔄 測試 5: 刷新數據 (清除緩存)');
        await merchantsApi.refresh();
        console.log('✅ 成功刷新數據');
        console.log('');

        console.log('🎉 所有測試完成！');

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        process.exit(1);
    }
}

// 執行測試
testMerchantsApi();
