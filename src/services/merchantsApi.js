/**
 * Merchants API Service
 * 用於與 AWS API Gateway 交互獲取商戶資料
 * 
 * 環境變量配置:
 * - REACT_APP_MERCHANTS_API_URL: API Gateway 的基礎 URL
 * - REACT_APP_USE_API_FIRST: 是否優先使用 API (默認 true)
 * 
 * 使用方式:
 * 1. 優先使用 AWS API Gateway
 * 2. 如果 API 失敗，使用內存緩存
 * 3. 最後才使用本地 JSON fallback
 */

// 安全地獲取環境變量 (兼容瀏覽器環境)
const getEnv = (key, defaultValue = '') => {
    try {
        // Vite 優先使用 import.meta.env
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key] || defaultValue;
        }
        // 回退到 process.env
        // eslint-disable-next-line no-undef
        return (typeof process !== 'undefined' ? process.env[key] : null) || defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

// 優先從環境變量獲取配置 (支援 Vite 和 Create React App)
const API_BASE_URL = getEnv('VITE_MERCHANTS_API_URL') || getEnv('REACT_APP_MERCHANTS_API_URL') || 'https://api.bigfootws.com';
const USE_API_FIRST = getEnv('VITE_USE_API_FIRST', 'true') === 'true' || getEnv('REACT_APP_USE_API_FIRST', 'true') === 'true';
const LOGO_BASE_URL = getEnv('VITE_LOGO_BASE_URL') || getEnv('REACT_APP_LOGO_BASE_URL') || 'https://logo.bigfootws.com/logos/';

console.log('🐻 [Backend] API URL Configured:', API_BASE_URL);
console.log('🐻 [Backend] API Priority:', USE_API_FIRST ? 'API First' : 'Local First');
console.log('🐻 [Backend] Logo Base URL:', LOGO_BASE_URL);

class MerchantsApiService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 分鐘緩存
    }

    /**
     * 獲取所有商戶
     * @param {boolean} useCache - 是否使用緩存
     * @returns {Promise<Array>}
     */
    async getAllMerchants(useCache = true) {
        try {
            // 檢查緩存
            if (useCache && this.cache && this.cacheTimestamp) {
                const now = Date.now();
                if (now - this.cacheTimestamp < this.cacheDuration) {
                    console.log('使用緩存的商戶資料');
                    return this.cache;
                }
            }

            // 如果沒有配置 API URL，直接使用本地 fallback
            if (!API_BASE_URL) {
                console.warn('未配置 API URL，使用本地 JSON 作為數據源');
                return this.loadLocalFallback();
            }

            let url = `${API_BASE_URL}/merchants`;
            try {
                const userDump = localStorage.getItem('jetso_user');
                if (userDump) {
                    const u = JSON.parse(userDump);
                    if (u.isLoggedIn && u.userId) url += `?userId=${u.userId}`;
                }
            } catch (e) { }

            console.log('從 API 獲取商戶資料...', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Check if suspended
            if (result && (result.status === 'suspended' || result.message === 'suspended')) {
                return result; // Return raw result to handle suspension in UI
            }

            // 靈活處理不同的 API 回傳格式
            let merchantsData = null;
            if (result.merchants && Array.isArray(result.merchants)) {
                merchantsData = result.merchants;
            } else if (result.data && Array.isArray(result.data)) {
                merchantsData = result.data;
            } else if (Array.isArray(result)) {
                merchantsData = result;
            } else if (result.success && result.data) {
                merchantsData = result.data;
            }

            if (merchantsData) {
                // 處理 Logo 路徑
                merchantsData = merchantsData.map(m => ({
                    ...m,
                    logo: m.logo && !m.logo.startsWith('http') ? `${LOGO_BASE_URL}${m.logo}` : m.logo
                }));

                // 更新緩存
                this.cache = merchantsData;
                this.cacheTimestamp = Date.now();
                return merchantsData;
            } else {
                console.error('Unexpected API response structure:', result);
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('❌ AWS API 獲取失敗:', error);

            // 在開發環境中，讓我們看到錯誤而不是悄悄 fallback
            if (this.cache) {
                console.warn('⚠️ 使用緩存資料');
                return this.cache;
            }

            console.warn('⛔ API 完全不可用，正在嘗試本地數據作為最後手段...');
            return this.loadLocalFallback();
        }
    }

    /**
     * 根據 ID 獲取單個商戶
     * @param {string} merchantId - 商戶 ID
     * @returns {Promise<Object>}
     */
    async getMerchantById(merchantId) {
        try {
            let url = `${API_BASE_URL}/merchants/${merchantId}`;
            try {
                const userDump = localStorage.getItem('jetso_user');
                if (userDump) {
                    const u = JSON.parse(userDump);
                    if (u.isLoggedIn && u.userId) url += `?userId=${u.userId}`;
                }
            } catch (e) { }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // 靈活處理不同的回傳格式
            let merchantData = null;
            if (result.merchant) {
                merchantData = result.merchant;
            } else if (result.data) {
                merchantData = result.data;
            } else if (result.success && result.data) {
                merchantData = result.data;
            } else if (result.merchantId || result.name) {
                // 看起來直接回傳了商家對象
                merchantData = result;
            }

            if (merchantData) {
                // 處理 Logo 路徑
                if (merchantData.logo && !merchantData.logo.startsWith('http')) {
                    merchantData.logo = `${LOGO_BASE_URL}${merchantData.logo}`;
                }
                return merchantData;
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error(`獲取商戶 ${merchantId} 失敗:`, error);

            // Fallback: 從所有商戶中查找
            const merchants = await this.getAllMerchants();
            return merchants.find(m => m.merchantId === merchantId) || null;
        }
    }

    /**
     * 根據 Instagram ID 查找商戶
     * @param {string} instagramId - Instagram ID
     * @returns {Promise<Object|null>}
     */
    async getMerchantByInstagram(instagramId) {
        const merchants = await this.getAllMerchants();
        return merchants.find(m => m.instagram_id === instagramId) || null;
    }

    /**
     * 搜索商戶（根據名稱）
     * @param {string} query - 搜索關鍵字
     * @returns {Promise<Array>}
     */
    async searchMerchants(query) {
        const merchants = await this.getAllMerchants();
        const lowerQuery = query.toLowerCase();

        return merchants.filter(merchant =>
            merchant.name.toLowerCase().includes(lowerQuery) ||
            merchant.name_en.toLowerCase().includes(lowerQuery) ||
            merchant.instagram_id.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 載入本地 fallback 資料
     * @returns {Promise<Array>}
     */
    async loadLocalFallback() {
        try {
            console.warn('使用本地 JSON 作為 fallback');
            const merchantsData = await import('../data/merchants.json');

            // 轉換為 API 格式（添加 merchantId）
            return merchantsData.default.map(merchant => ({
                merchantId: this.generateMerchantId(merchant.name_en),
                ...merchant
            }));
        } catch (error) {
            console.error('載入本地 fallback 失敗:', error);
            return [];
        }
    }

    /**
     * 生成 merchantId
     * @param {string} nameEn - 英文名稱
     * @returns {string}
     */
    generateMerchantId(nameEn) {
        return nameEn
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }

    /**
     * 清除緩存
     */
    clearCache() {
        this.cache = null;
        this.cacheTimestamp = null;
        console.log('緩存已清除');
    }

    /**
     * 刷新資料（清除緩存並重新獲取）
     * @returns {Promise<Array>}
     */
    async refresh() {
        this.clearCache();
        return this.getAllMerchants(false);
    }
}

// 導出單例
const merchantsApi = new MerchantsApiService();
export default merchantsApi;
