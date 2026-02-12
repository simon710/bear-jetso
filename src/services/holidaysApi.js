/**
 * Holidays API Service
 * 負責從外部 API 獲取香港公眾假期
 */

class HolidaysApiService {
    constructor() {
        this.cache = {};
    }

    /**
     * 獲取指定年份的香港公眾假期
     * @param {number} year 
     * @returns {Promise<Array>} 返回格式如 ['2026-01-01', '2026-02-17', ...]
     */
    async getHolidays(year) {
        if (this.cache[year]) return this.cache[year];

        try {
            console.log(`🐻 [Holidays] Fetching holidays for ${year}...`);

            // 使用 Nager.Date API，這是一個穩定且開源的公眾假期 API
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/HK`);

            if (!response.ok) throw new Error('Failed to fetch holidays');

            const data = await response.json();

            // 下載回來的格式是對象陣列，我們簡化為字串陣列方便比對
            const holidayDates = data.map(holiday => holiday.date);

            this.cache[year] = holidayDates;
            return holidayDates;
        } catch (error) {
            console.error(`❌ [Holidays] Error fetching holidays for ${year}:`, error);

            // Fallback: 如果 API 失敗，返回一個空陣列或基本的 Hardcode 備用
            // 但既然用戶要求 API，我們這裡僅記錄錯誤
            return [];
        }
    }
}

const holidaysApi = new HolidaysApiService();
export default holidaysApi;
