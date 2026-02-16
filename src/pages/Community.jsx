import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import SocialPost from '../components/common/SocialPost';
import { useDiscountActions } from '../hooks/useDiscountActions';
import { checkIsSoonExpiring } from '../utils/helpers';

const Community = () => {
    const { theme, t, notify, setZoomedImage, likedPosts, setLikedPosts, setSelectedItem, user, discounts } = useApp();
    const { handleShare, handleBookmark } = useDiscountActions();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [communitySort, setCommunitySort] = useState('newest');

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullThreshold = 80;
    const startY = useRef(0);
    const containerRef = useRef(null);

    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    const fetchPosts = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        else setIsLoading(true);

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
            if (isManualRefresh) setIsRefreshing(false);
            setPullDistance(0);
        }
    };

    useEffect(() => {
        fetchPosts(false);
    }, []);

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
            const response = await fetch(`${API_URL}/community/${post.id}/${endpoint}`, { method: 'POST' });
            if (response.ok) {
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
        </div>
    );
};

export default Community;
