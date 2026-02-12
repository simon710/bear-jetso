import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import DiagonalTag from '../components/common/DiagonalTag';
import { getStatus, checkIsSoonExpiring } from '../utils/helpers';

const Community = () => {
    const { theme, t, notify, setZoomedImage, likedPosts, setLikedPosts, setSelectedItem } = useApp();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [communitySort, setCommunitySort] = useState('newest'); // newest, oldest, expirySoon, expiryLate

    // Pull-to-refresh states
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullThreshold = 80;
    const startY = useRef(0);
    const containerRef = useRef(null);

    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    const fetchPosts = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`${API_URL}/community`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            notify('無法載入社群內容');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setPullDistance(0);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const getSortedPosts = () => {
        return [...posts].sort((a, b) => {
            if (communitySort === 'newest') {
                return (b.id || 0) - (a.id || 0); // Assuming higher ID is newer
            }
            if (communitySort === 'oldest') {
                return (a.id || 0) - (b.id || 0);
            }
            if (communitySort === 'expirySoon') {
                const dateA = new Date(a.expiryDate?.replace(/-/g, '/'));
                const dateB = new Date(b.expiryDate?.replace(/-/g, '/'));
                return dateA - dateB;
            }
            if (communitySort === 'expiryLate') {
                const dateA = new Date(a.expiryDate?.replace(/-/g, '/'));
                const dateB = new Date(b.expiryDate?.replace(/-/g, '/'));
                return dateB - dateA;
            }
            return 0;
        });
    };

    const sortedPosts = getSortedPosts();

    // Pull to refresh logic
    const handleTouchStart = (e) => {
        if (containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = 0;
        }
    };

    const handleTouchMove = (e) => {
        if (startY.current === 0 || isRefreshing) return;
        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;
        if (diff > 0) {
            setPullDistance(Math.min(diff * 0.4, 120));
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > pullThreshold && !isRefreshing) {
            fetchPosts();
        } else {
            setPullDistance(0);
        }
    };

    const handleLike = async (e, id) => {
        if (e) e.stopPropagation();
        if (likedPosts.includes(id)) {
            notify('你已經點過讚了喔！❤️');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/community/${id}/like`, { method: 'POST' });
            if (response.ok) {
                setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p));
                setLikedPosts(prev => [...prev, id]);
                notify('謝謝你的點讚！❤️');
            }
        } catch (e) {
            notify('操作失敗');
        }
    };

    const handleReport = async (e, id) => {
        if (e) e.stopPropagation();
        if (!window.confirm(t('report') + '?')) return;
        try {
            const response = await fetch(`${API_URL}/community/${id}/report`, { method: 'POST' });
            if (response.ok) {
                const resData = await response.json();
                if (resData.reports >= 10) {
                    setPosts(prev => prev.filter(p => p.id !== id));
                    notify(t('reportThreshNotice'));
                    setSelectedItem(null); // Close detail if reported enough
                } else {
                    setPosts(prev => prev.map(p => p.id === id ? { ...p, reports: (p.reports || 0) + 1 } : p));
                    notify('已收到您的舉報，我們會盡快處理。');
                }
            }
        } catch (e) {
            notify('操作失敗');
        }
    };

    const goToDetail = (post) => {
        const codes = typeof post.discountCodes === 'string' ? JSON.parse(post.discountCodes) : (post.discountCodes || []);
        // Pass the functions as well if we want DiscountDetail to use them, 
        // OR just have DiscountDetail call the API itself since it has API_URL access.
        // Better: add isCommunity flag.
        setSelectedItem({
            ...post,
            discountCodes: codes,
            isCommunity: true
        });
    };

    const copyToClipboard = async (e, text) => {
        if (e) e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            notify(t('copied'));
        } catch (err) {
            notify('複製失敗');
        }
    };

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto bg-gray-50/50 p-4 pb-24 scrollbar-hide relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull to refresh indicator */}
            <div
                className="absolute left-0 right-0 flex justify-center items-center pointer-events-none transition-all duration-200"
                style={{
                    top: -50 + pullDistance,
                    opacity: pullDistance / pullThreshold
                }}
            >
                <div className={`p-3 bg-white rounded-md shadow-lg border border-pink-100 flex items-center gap-2`}>
                    <Icon
                        name="refresh"
                        size={20}
                        className={`${isRefreshing ? 'animate-spin text-pink-400' : 'text-gray-300'} ${pullDistance > pullThreshold ? 'rotate-180 text-pink-500' : ''}`}
                    />
                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">
                        {pullDistance > pullThreshold ? 'Release to Refresh' : 'Pull to Refresh'}
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="relative flex-1">
                    <select
                        value={communitySort}
                        onChange={(e) => setCommunitySort(e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-100 px-4 py-3 rounded-md text-[11px] font-black text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-100"
                    >
                        <option value="newest">{t('sortNewest')}</option>
                        <option value="oldest">{t('sortOldest')}</option>
                        <option value="expirySoon">{t('sortSoon')}</option>
                        <option value="expiryLate">{t('sortLate')}</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                        <Icon name="chevronDown" size={12} />
                    </div>
                </div>
                <button
                    onClick={fetchPosts}
                    disabled={isRefreshing}
                    className={`p-3 bg-white shadow-sm rounded-md active:rotate-180 transition-all duration-500 border border-gray-100 ${isRefreshing ? 'opacity-50' : ''}`}
                >
                    <Icon name="refresh" size={20} className={isRefreshing ? 'animate-spin text-pink-400' : 'text-gray-400'} />
                </button>
            </div>

            {isLoading && !isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className={`w-10 h-10 border-4 border-gray-200 border-t-pink-400 rounded-md animate-spin`} />
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">{t('loading')}</p>
                </div>
            ) : sortedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 space-y-4">
                    <Icon name="users" size={64} className="opacity-20" />
                    <p className="font-bold">{t('empty')}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedPosts.map(post => {
                        const isSoon = checkIsSoonExpiring(post.expiryDate);
                        const isLiked = likedPosts.includes(post.id);
                        const codes = typeof post.discountCodes === 'string' ? JSON.parse(post.discountCodes) : (post.discountCodes || []);

                        return (
                            <div
                                key={post.id}
                                onClick={() => goToDetail(post)}
                                className="bg-white rounded-md shadow-sm border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative active:scale-[0.98] transition-transform cursor-pointer"
                            >
                                {isSoon && <DiagonalTag text={t('tagSoon')} colorClass="bg-rose-500" />}

                                {/* Header */}
                                <div className="p-4 border-b border-gray-50 bg-white/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shadow-sm`}>
                                                {post.avatar || '🐻'}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-800 text-sm leading-tight">{post.title}</h3>
                                                <p className="text-[10px] font-black text-pink-400 uppercase tracking-tight">
                                                    @{post.nickname || t('anonymous')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{post.category || '積分到期'}</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{post.expiryDate}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Images */}
                                {post.images?.length > 0 && (
                                    <div className="aspect-video relative bg-gray-100 overflow-hidden group">
                                        <img
                                            src={post.images[0]}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            alt="Shared"
                                        />
                                        {post.images.length > 1 && (
                                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white text-[8px] px-2 py-1 rounded-md font-black">
                                                +{post.images.length - 1} photos
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setZoomedImage(post.images[0]); }}
                                            className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-md p-2 rounded-md shadow-md active:scale-90 transition-all"
                                        >
                                            <Icon name="maximize" size={14} className="text-gray-600" />
                                        </button>
                                    </div>
                                )}

                                {/* Content Summary */}
                                <div className="p-4 space-y-3">
                                    <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-2">
                                        {post.content}
                                    </p>

                                    <div className="flex items-center justify-between text-pink-400 font-bold text-[10px] mt-2">
                                        <span>查看詳情及優惠碼</span>
                                        <Icon name="chevronRight" size={12} />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-2 bg-gray-50/80 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleLike(e, post.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 hover:bg-rose-50 rounded-md transition-all group"
                                        >
                                            <Icon name="heart" size={16} className={`group-active:scale-150 transition-all ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-gray-300'}`} />
                                            <span className={`text-[11px] font-black ${isLiked ? 'text-rose-500' : 'text-gray-400'}`}>{post.likes || 0}</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => handleReport(e, post.id)}
                                        className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-rose-400 transition-all"
                                        title={t('report')}
                                    >
                                        <Icon name="alertTriangle" size={14} />
                                        <span className="text-[10px] font-bold">{post.reports || 0}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Community;
