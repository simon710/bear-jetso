import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import SocialPost from '../components/common/SocialPost';
import { useDiscountActions } from '../hooks/useDiscountActions';
import { checkIsSoonExpiring } from '../utils/helpers';

const Community = () => {
    const { theme, t, notify, setZoomedImage, likedPosts, setLikedPosts, setSelectedItem, user } = useApp();
    const { handleShare } = useDiscountActions();
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
        return [...posts].sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            if (communitySort === 'newest') return idB - idA;
            if (communitySort === 'oldest') return idA - idB;
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
                <div className="px-4 py-8 space-y-8 max-w-lg mx-auto animate-in fade-in duration-500">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-50 rounded w-1/3 animate-pulse" />
                                    <div className="h-2 bg-gray-50/50 rounded w-1/2 animate-pulse" />
                                </div>
                            </div>
                            <div className="aspect-square bg-gray-50 animate-pulse flex items-center justify-center">
                                <Icon name="image" size={48} className="text-gray-100" />
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="h-2 bg-gray-50 rounded w-full animate-pulse" />
                                <div className="h-2 bg-gray-50 rounded w-2/3 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : sortedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 space-y-4">
                    <Icon name="users" size={64} className="opacity-20" />
                    <p className="font-bold">{t('empty')}</p>
                </div>
            ) : (
                <div className="space-y-4 px-2 md:px-4">
                    {sortedPosts.map(post => (
                        <SocialPost
                            key={post.id}
                            item={{
                                ...post,
                                isCommunity: true,
                                isLiked: likedPosts.includes(post.id)
                            }}
                            isCommunity={true}
                            onLike={handleLike}
                            onShare={handlePostShare}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Community;
