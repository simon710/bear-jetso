import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getStatus } from '../utils/helpers';
import DiscountCard from '../components/DiscountCard';
import Icon from '../components/common/Icon';

const Home = () => {
    const {
        discounts, homeFilter, setHomeFilter,
        sortOrder, setSortOrder,
        t, theme, lang
    } = useApp();

    const filteredAndSorted = useMemo(() => {
        return [...discounts]
            .filter(d => getStatus(d) === homeFilter)
            .sort((a, b) => {
                const dateA = new Date(a.expiryDate.replace(/-/g, '/'));
                const dateB = new Date(b.expiryDate.replace(/-/g, '/'));
                if (dateA - dateB !== 0) {
                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                }
                // Same date: sort by ID to maintain consistent relative order
                return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
            });
    }, [discounts, homeFilter, sortOrder]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 flex flex-col gap-3 shrink-0">
                <div className="flex gap-3 h-14">
                    {['active', 'used', 'expired'].map(f => (
                        <button
                            key={f}
                            onClick={() => setHomeFilter(f)}
                            className={`flex-1 rounded-md text-xs font-black transition-all shadow-sm ${homeFilter === f ? theme.primary + ' text-white scale-105 shadow-md' : 'bg-white text-gray-400'}`}
                        >
                            {t(f)}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-white/80 backdrop-blur-sm border-2 border-white rounded-md py-3 px-4 flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 shadow-sm"
                >
                    <Icon name="sort" size={14} className={theme.text} />
                    {sortOrder === 'asc' ? t('sortSoon') : t('sortLate')}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-24 scrollbar-hide">
                {filteredAndSorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic">
                        <p>{t('empty')}</p>
                    </div>
                ) : (
                    filteredAndSorted.map(item => (
                        <DiscountCard key={item.id} item={item} />
                    ))
                )}
            </div>
        </div>
    );
};

export default Home;
