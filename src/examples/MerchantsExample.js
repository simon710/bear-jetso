import React, { useEffect, useState } from 'react';
import merchantsApi from '../services/merchantsApi';

/**
 * 使用範例：如何在組件中使用 Merchants API
 */
function MerchantsExample() {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadMerchants();
    }, []);

    const loadMerchants = async () => {
        try {
            setLoading(true);
            const data = await merchantsApi.getAllMerchants();
            setMerchants(data);
            setError(null);
        } catch (err) {
            console.error('載入商戶失敗:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        try {
            setLoading(true);
            const data = await merchantsApi.refresh();
            setMerchants(data);
            setError(null);
        } catch (err) {
            console.error('刷新失敗:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>載入中...</div>;
    }

    if (error) {
        return (
            <div>
                <p>錯誤: {error}</p>
                <button onClick={loadMerchants}>重試</button>
            </div>
        );
    }

    return (
        <div>
            <h1>商戶列表</h1>
            <button onClick={refreshData}>刷新資料</button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {merchants.map((merchant) => (
                    <div key={merchant.merchantId} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                        <img
                            src={merchant.logo}
                            alt={merchant.name_en}
                            style={{ width: '100%', height: '120px', objectFit: 'contain', marginBottom: '10px' }}
                        />
                        <h3>{merchant.name}</h3>
                        <p>{merchant.name_en}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>
                            @{merchant.instagram_id}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MerchantsExample;

/**
 * 其他使用範例
 */

// 範例 1: 根據 ID 獲取單個商戶
export async function getMerchantExample() {
    const merchant = await merchantsApi.getMerchantById('parknshop');
    console.log('商戶資料:', merchant);
    return merchant;
}

// 範例 2: 根據 Instagram ID 查找
export async function findByInstagramExample() {
    const merchant = await merchantsApi.getMerchantByInstagram('hkparknshop');
    console.log('找到的商戶:', merchant);
    return merchant;
}

// 範例 3: 搜索商戶
export async function searchExample() {
    const results = await merchantsApi.searchMerchants('百佳');
    console.log('搜索結果:', results);
    return results;
}

// 範例 4: 清除緩存
export function clearCacheExample() {
    merchantsApi.clearCache();
    console.log('緩存已清除');
}
