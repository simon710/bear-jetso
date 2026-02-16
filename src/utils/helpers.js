export const checkIsExpired = (dateStr) => {
    if (!dateStr) return false;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr.replace(/-/g, '/'));
        return target < today;
    } catch (e) { return false; }
};

export const checkIsSoonExpiring = (dateStr) => {
    if (!dateStr) return false;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr.replace(/-/g, '/'));
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    } catch (e) { return false; }
};

export const getStatus = (item) => {
    if (!item) return 'active';
    if (item.status === 'used') return 'used';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (item.expiryDate) {
        const end = new Date(item.expiryDate.replace(/-/g, '/'));
        if (end < today) return 'expired';
    }

    if (item.startDate) {
        const start = new Date(item.startDate.replace(/-/g, '/'));
        if (start > today) return 'scheduled';
    }

    return 'active';
};

export const checkIsInRange = (dateStr, startDate, endDate) => {
    if (!dateStr || !endDate) return false;
    try {
        const normalize = (d) => {
            if (!d || typeof d !== 'string' || d.trim() === "") return null;
            const date = new Date(d.trim().replace(/-/g, '/'));
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        };

        const current = normalize(dateStr);
        const end = normalize(endDate);
        const start = normalize(startDate);

        if (!start) {
            // 規則 1：若無開始日期（null 或 ""），僅在到期日當天顯示
            return current === end;
        }

        // 規則 2：若有開始日期，在開始日期至到期日範圍內顯示
        return current >= start && current <= end;
    } catch (e) {
        console.error('Date Check Error:', e);
        return false;
    }
};

export const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
};

// 檢查是否為假期 (支援動取由 API 獲取的清單)
export const checkIsHKHoliday = (year, month, day, holidays = []) => {
    if (!holidays || !holidays.length) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.includes(dateStr);
};
