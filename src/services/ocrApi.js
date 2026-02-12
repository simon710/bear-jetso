import axios from 'axios';

// 安全地獲取環境變量 (兼容 Vite 和 Create React App)
const getEnv = (key, defaultValue = '') => {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key] || defaultValue;
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || defaultValue;
        }
    } catch (e) { }
    return defaultValue;
};

// 優先使用 Vite 前綴，否則回退到 REACT_APP 或硬編碼域名
const API_URL = getEnv('VITE_MERCHANTS_API_URL') ||
    getEnv('REACT_APP_MERCHANTS_API_URL') ||
    'https://api.bigfootws.com';

const ocrApi = {
    /**
     * 使用 AI 識別圖片中的文字
     * @param {string} base64Image - 圖片的 base64 字串
     * @returns {Promise<Object>} 識別結果 { detectedLines, extractedDate }
     */
    detectText: async (base64Image) => {
        if (!API_URL) {
            console.error('🐻 [OCR] API URL 未配置，無法進行 AI 識別');
            throw new Error('API URL not configured');
        }

        try {
            console.log('🐻 [OCR] 正在準備發送請求到:', `${API_URL}/ocr`);

            // 使用 axios 以獲得更好的超時和錯誤處理
            const response = await axios.post(`${API_URL}/ocr`, {
                image: base64Image
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000, // 30 秒超時，AI 辨識有時較慢
                validateStatus: null // 允許獲取非 200 的響應以進行詳細錯誤分析
            });

            console.log('🐻 [OCR] 伺服器響應狀態碼:', response.status);

            if (response.status !== 200) {
                const errorMsg = response.data?.message || `HTTP ${response.status}`;
                console.error('🐻 [OCR Error] 伺服器返回錯誤:', errorMsg, response.data);
                throw new Error(`辨識失敗: ${errorMsg}`);
            }

            const data = response.data;
            console.log('🐻 [OCR] 辨識成功！結果:', {
                lines: data.detectedLines?.length || 0,
                date: data.extractedDate
            });

            return {
                detectedLines: data.detectedLines || [],
                extractedDate: data.extractedDate || null,
                success: true
            };
        } catch (error) {
            console.error('🐻 [OCR Network/Client Error]:', error.message);
            if (error.code === 'ECONNABORTED') {
                throw new Error('辨識請求超時，請檢查網路連線或稍後再試');
            }
            if (error.response) {
                // 伺服器返回了錯誤碼
                throw new Error(`伺服器錯誤: ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                // 請求已發送但沒收到回應
                throw new Error('無法連線到 AI 伺服器，請確保網路正常且伺服器正在運行');
            } else {
                throw error;
            }
        }
    }
};

export default ocrApi;
