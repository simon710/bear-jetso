import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import SocialPost from '../components/common/SocialPost';
import { useDiscountActions } from '../hooks/useDiscountActions';
import { checkIsSoonExpiring } from '../utils/helpers';

const Community = () => {
    const { theme, t, notify, setZoomedImage, likedPosts, setLikedPosts, setSelectedItem, user, discounts, checkSuspension, setActiveTab } = useApp();
    const { handleShare, handleBookmark } = useDiscountActions();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [communitySort, setCommunitySort] = useState('newest');
    const [lastKey, setLastKey] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullThreshold = 80;
    const startY = useRef(0);
    const containerRef = useRef(null);

    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    const fetchPosts = async (isManualRefresh = false, loadingMore = false) => {
        if (loadingMore && (isFetchingMore || !hasMore)) return;

        if (isManualRefresh) {
            setIsRefreshing(true);
            setLastKey(null);
        } else if (loadingMore) {
            setIsFetchingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const currentLastKey = isManualRefresh ? null : (loadingMore ? lastKey : null);
            let url = `${API_URL}/community?limit=10${currentLastKey ? `&lastKey=${currentLastKey}` : ''}`;
            if (user && user.isLoggedIn && user.userId) {
                url += `&userId=${user.userId}`;
            }

            const response = await fetch(url);
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                console.error('JSON parse error:', e);
            }

            if (checkSuspension(data, response.status)) return;

            if (response.ok && data) {
                // Backward compatibility: check if data is an array or an object with items
                const newItems = Array.isArray(data) ? data : (data.items || []);
                const nextKey = Array.isArray(data) ? null : data.lastKey;

                if (isManualRefresh || !loadingMore) {
                    setPosts(newItems);
                } else {
                    setPosts(prev => [...prev, ...newItems]);
                }

                setLastKey(nextKey);
                setHasMore(!!nextKey);
            } else if (!response.ok) {
                notify('無法載入社群內容');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            notify('無法載入社群內容');
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
            if (isManualRefresh) setIsRefreshing(false);
            setPullDistance(0);
        }
    };

    useEffect(() => {
        fetchPosts(false);
    }, []);

    // Scroll listener for infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current || isLoading || isFetchingMore || !hasMore) return;

            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight - scrollTop - clientHeight < 100) {
                fetchPosts(false, true);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [isLoading, isFetchingMore, hasMore, lastKey]);

    const getSortedPosts = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return [...posts].sort((a, b) => {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;

            if (communitySort === 'newest') return timeB - timeA;
            if (communitySort === 'oldest') return timeA - timeB;

            // Date-based sorting with range priority
            if (communitySort === 'expirySoon' || communitySort === 'expiryLate') {
                const aStartDate = a.startDate ? new Date(a.startDate.replace(/-/g, '/')) : null;
                const bStartDate = b.startDate ? new Date(b.startDate.replace(/-/g, '/')) : null;
                const aInRange = aStartDate && aStartDate <= today;
                const bInRange = bStartDate && bStartDate <= today;

                const sortDir = communitySort === 'expirySoon' ? 1 : -1;

                if (aInRange && !bInRange) return -1;
                if (!aInRange && bInRange) return 1;

                const dateA = new Date(a.expiryDate?.replace(/-/g, '/'));
                const dateB = new Date(b.expiryDate?.replace(/-/g, '/'));
                return (dateA - dateB) * sortDir;
            }
            return 0;
        });
    };

    const sortedPosts = getSortedPosts();

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
            fetchPosts(true);
        } else {
            setPullDistance(0);
        }
    };

    const handleLike = async (post) => {
        const isLiked = likedPosts.includes(post.id);
        const endpoint = isLiked ? 'unlike' : 'like';

        try {
            let url = `${API_URL}/community/${post.id}/${endpoint}`;
            if (user && user.isLoggedIn && user.userId) {
                url += `?userId=${user.userId}`;
            }
            const response = await fetch(url, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                if (checkSuspension(data)) return;
                setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: (p.likes || 0) + (isLiked ? -1 : 1) } : p));
                if (isLiked) {
                    setLikedPosts(prev => prev.filter(id => id !== post.id));
                } else {
                    setLikedPosts(prev => [...prev, post.id]);
                }
                notify(isLiked ? '已取消點讚' : '謝謝你的點讚！❤️');
            }
        } catch (e) {
            notify('操作失敗');
        }
    };

    const handlePostShare = (item) => {
        handleShare(item);
    };

    if (!user || !user.isLoggedIn) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 pb-24 px-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-pink-50 mb-6">
                    <Icon name="users" size={40} className="text-pink-300" />
                </div>
                <h2 className={`text-xl font-black mb-3 ${theme.text}`}>專屬社群廣場</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-[260px] font-medium">
                    請先登入帳戶，探索其他熊友分享的最新即時優惠情報！🐻✨
                </p>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-8 py-3.5 rounded-2xl font-bold shadow-lg active:scale-95 transition-all text-white w-full max-w-[200px] flex items-center justify-center gap-2 ${theme.primary}`}
                >
                    <Icon name="users" size={18} />
                    前往登入 / 註冊
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto bg-gray-50/50 pb-24 scrollbar-hide relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull to refresh indicator */}
            <div
                className="absolute left-0 right-0 z-50 flex justify-center items-center pointer-events-none transition-all duration-200"
                style={{
                    top: 10 + pullDistance,
                    opacity: pullDistance / pullThreshold,
                    transform: `translateY(${pullDistance > pullThreshold ? '0' : '-20px'})`
                }}
            >
                <div className={`p-3 bg-white rounded-full shadow-lg border border-pink-100 flex items-center justify-center`}>
                    <Icon
                        name="refresh"
                        size={20}
                        className={`${isRefreshing ? 'animate-spin text-pink-400' : 'text-gray-300'} ${pullDistance > pullThreshold ? 'rotate-180 text-pink-50' : ''}`}
                    />
                </div>
            </div>

            <div className="px-4 pt-4 mb-4 flex gap-2">
                <div className="relative flex-1">
                    <select
                        value={communitySort}
                        onChange={(e) => setCommunitySort(e.target.value)}
                        className="w-full appearance-none bg-white border-b-2 border-gray-100 px-4 py-3 text-[11px] font-black text-gray-500 shadow-sm focus:outline-none focus:border-pink-200"
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
            </div>

            {isLoading && !isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500">
                    <div className="relative mb-6">
                        <div className={`w-20 h-20 border-4 border-gray-100 border-t-pink-400 rounded-full animate-spin`} style={{ borderColor: `${theme.primary}20`, borderTopColor: theme.primary.replace('bg-', '') }} />
                        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
                            🐻
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className={`text-sm font-black uppercase tracking-widest ${theme.text} animate-pulse`}>
                            {t('loading')}
                        </p>
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${theme.primary} animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>

                    {/* Background Skeletons for depth */}
                    <div className="w-full flex gap-2 px-2 mt-12 opacity-30 grayscale pointer-events-none">
                        <div className="w-1/2 flex flex-col gap-2">
                            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
                            <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                        <div className="w-1/2 flex flex-col gap-2">
                            <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            ) : sortedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 space-y-4">
                    <Icon name="users" size={64} className="opacity-20" />
                    <p className="font-bold">{t('empty')}</p>
                </div>
            ) : (
                <div className="flex gap-2 px-2 pb-4">
                    <div className="w-1/2 flex flex-col gap-2">
                        {sortedPosts.filter((_, i) => i % 2 === 0).map(post => (
                            <div key={post.id} className="w-full">
                                <SocialPost
                                    item={{
                                        ...post,
                                        isCommunity: true,
                                        isLiked: likedPosts.includes(post.id),
                                        isSaved: discounts.some(d => d.title === post.title && d.expiryDate === post.expiryDate)
                                    }}
                                    isCommunity={true}
                                    onLike={handleLike}
                                    onShare={handlePostShare}
                                    onBookmark={handleBookmark}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="w-1/2 flex flex-col gap-2">
                        {sortedPosts.filter((_, i) => i % 2 !== 0).map(post => (
                            <div key={post.id} className="w-full">
                                <SocialPost
                                    item={{
                                        ...post,
                                        isCommunity: true,
                                        isLiked: likedPosts.includes(post.id),
                                        isSaved: discounts.some(d => d.title === post.title && d.expiryDate === post.expiryDate)
                                    }}
                                    isCommunity={true}
                                    onLike={handleLike}
                                    onShare={handlePostShare}
                                    onBookmark={handleBookmark}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom loading indicator for pagination */}
            {isFetchingMore && (
                <div className="flex justify-center py-6">
                    <div className="w-8 h-8 border-4 border-gray-100 border-t-pink-400 rounded-full animate-spin" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="text-center py-8 opacity-20 text-[10px] font-black uppercase tracking-widest">
                    已經到底了 🐻
                </div>
            )}
        </div>
    );
};

export default Community;
