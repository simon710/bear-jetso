import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getStatus } from '../utils/helpers';
import Icon from '../components/common/Icon';
import SocialPost from '../components/common/SocialPost';
import { useDiscountActions } from '../hooks/useDiscountActions';

const Home = () => {
    const {
        discounts, setDiscounts, homeFilter, setHomeFilter,
        sortOrder, setSortOrder,
        t, theme, lang
    } = useApp();
    const { handleShare, handleDelete, handleBookmark } = useDiscountActions();

    const filteredAndSorted = useMemo(() => {
        return [...discounts]
            .filter(d => getStatus(d) === homeFilter)
            .sort((a, b) => {
                const dateA = new Date(a.expiryDate.replace(/-/g, '/'));
                const dateB = new Date(b.expiryDate.replace(/-/g, '/'));
                if (dateA - dateB !== 0) {
                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                }
                return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
            });
    }, [discounts, homeFilter, sortOrder]);

    const handleLocalLike = (item) => {
        setDiscounts(prev => prev.map(d => d.id === item.id ? { ...d, isLiked: !d.isLiked } : d));
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/30">
            <div className="px-4 py-3 flex flex-col gap-3 shrink-0 bg-white shadow-sm z-10">
                <div className="flex gap-2 h-12 overflow-x-auto scrollbar-hide">
                    {['active', 'scheduled', 'used', 'expired'].map(f => (
                        <button
                            key={f}
                            onClick={() => setHomeFilter(f)}
                            className={`min-w-[70px] flex-1 rounded-md text-[10px] uppercase font-black transition-all ${homeFilter === f ? theme.primary + ' text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}
                        >
                            {t(f)}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-white border border-gray-100 rounded-md py-2.5 px-4 flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 shadow-sm"
                >
                    <Icon name="sort" size={14} className={theme.text} />
                    {sortOrder === 'asc' ? t('sortSoon') : t('sortLate')}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pt-4 pb-24 scrollbar-hide">
                {filteredAndSorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic">
                        <p>{t('empty')}</p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="w-1/2 flex flex-col gap-2">
                            {filteredAndSorted.filter((_, i) => i % 2 === 0).map(item => (
                                <div key={item.id}>
                                    <SocialPost
                                        item={item}
                                        onLike={handleLocalLike}
                                        onShare={handleShare}
                                        onBookmark={handleBookmark}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="w-1/2 flex flex-col gap-2">
                            {filteredAndSorted.filter((_, i) => i % 2 !== 0).map(item => (
                                <div key={item.id}>
                                    <SocialPost
                                        item={item}
                                        onLike={handleLocalLike}
                                        onShare={handleShare}
                                        onBookmark={handleBookmark}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
