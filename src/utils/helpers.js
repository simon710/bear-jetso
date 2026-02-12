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
    if (checkIsExpired(item.expiryDate)) return 'expired';
    return 'active';
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
