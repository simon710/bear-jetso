export const refreshData = async (currentDb, setDiscounts) => {
    if (!currentDb) return;
    if (currentDb.isFallback) {
        const saved = localStorage.getItem('sqlite_fallback_data');
        if (saved) setDiscounts(JSON.parse(saved));
        return;
    }
    const res = await currentDb.query("SELECT * FROM discounts;");
    setDiscounts(res.values.map(item => {
        let parsedImages = [];
        try { parsedImages = item.images ? JSON.parse(item.images) : []; } catch (e) { }

        let parsedCodes = [''];
        try { parsedCodes = item.discountCodes ? JSON.parse(item.discountCodes) : (item.discountCode ? [item.discountCode] : ['']); } catch (e) { }

        return {
            ...item,
            images: parsedImages,
            discountCodes: parsedCodes
        };
    }));
};
