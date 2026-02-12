export const refreshData = async (currentDb, setDiscounts) => {
    if (!currentDb) return;
    if (currentDb.isFallback) {
        const saved = localStorage.getItem('sqlite_fallback_data');
        if (saved) setDiscounts(JSON.parse(saved));
        return;
    }
    const res = await currentDb.query("SELECT * FROM discounts;");
    setDiscounts(res.values.map(item => ({
        ...item,
        images: JSON.parse(item.images || '[]'),
        discountCodes: item.discountCodes ? JSON.parse(item.discountCodes) : (item.discountCode ? [item.discountCode] : [''])
    })));
};
