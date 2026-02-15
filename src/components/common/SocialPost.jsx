import React from 'react';
import { useApp } from '../../context/AppContext';
import Icon from './Icon';
import DiagonalTag from './DiagonalTag';
import { getStatus, checkIsSoonExpiring } from '../../utils/helpers';

const SocialPost = ({ item, isCommunity = false, onLike, onShare, onBookmark }) => {
    const { setSelectedItem, theme, t, user, merchants, notify } = useApp();
    const [isImgLoading, setIsImgLoading] = React.useState(true);
    const status = getStatus(item);
    const isSoon = status === 'active' && checkIsSoonExpiring(item.expiryDate);
    const merchant = merchants.find(m => m.name === item.title || m.name_en === item.title);

    // Header Info
    const avatar = isCommunity ? (item.avatar || '🐻') : (merchant?.logo || '🐻');
    const nickname = isCommunity ? (item.nickname || t('anonymous')) : item.title;
    const subTitle = isCommunity ? item.title : '';

    const mainImage = (item.images && item.images.length > 0) ? item.images[0] : (merchant?.logo || null);

    return (
        <div className={`bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all relative ${status !== 'active' ? 'grayscale opacity-70' : ''}`}>
            {isSoon && <DiagonalTag text={t('tagSoon')} colorClass="bg-rose-500" />}
            {status === 'scheduled' && <DiagonalTag text={t('scheduled')} colorClass="bg-amber-500" />}
            {status === 'expired' && <DiagonalTag text={t('tagExpired')} colorClass="bg-gray-600" />}
            {status === 'used' && <DiagonalTag text={t('tagUsed')} colorClass="bg-gray-400" />}
            {item.is_community_shared === 1 && status === 'active' && !isSoon && <DiagonalTag text={t('shared')} colorClass="bg-blue-500" />}

            {/* Header */}
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden bg-gray-50 shadow-sm">
                        {typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('data:')) ? (
                            <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                            <span className="text-xl">{avatar}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800 leading-tight">
                            {isCommunity ? subTitle : item.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                            {isCommunity ? '@' + nickname : (item.merchant || t('myCollection'))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Media Area */}
            <div
                className="relative bg-gray-50 flex items-start justify-center cursor-pointer overflow-hidden group"
                onClick={() => setSelectedItem(item)}
            >
                {mainImage ? (
                    <div className="w-full flex items-center justify-center bg-gray-50 overflow-hidden" style={{ minHeight: '150px' }}>
                        <img
                            src={mainImage}
                            onLoad={() => setIsImgLoading(false)}
                            className={`max-w-full h-auto max-h-[350px] object-contain transition-all duration-500 group-hover:scale-105 ${isImgLoading ? 'opacity-0' : 'opacity-100'}`}
                            alt="post"
                        />
                    </div>
                ) : (
                    <div className="aspect-square flex flex-col items-center justify-center gap-2 text-gray-200">
                        <Icon name="image" size={48} />
                        <span className="font-black text-sm uppercase tracking-tighter">No Image</span>
                    </div>
                )}

                {/* Category Tag */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase backdrop-blur-md shadow-sm border-2 ${status === 'active' ? 'bg-white/90 text-gray-800 border-pink-200' : 'bg-gray-100/90 text-gray-400 border-gray-200'}`}>
                        {item.category || 'General'}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center">
                    {isCommunity && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLike?.(item); }}
                            className={`transition-all active:scale-125 flex items-center gap-2 ${item.isLiked ? 'text-pink-500 animate-heart-pulse' : 'text-gray-400'}`}
                        >
                            <Icon name="thumbsUp" size={24} fill={item.isLiked ? "currentColor" : "none"} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {!isCommunity && onShare && !item.is_readonly && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (item.is_community_shared === 1) return;
                                onShare?.(item);
                            }}
                            className={`active:scale-110 transition-all p-1 ${item.is_community_shared === 1 ? 'text-blue-500 cursor-default' : 'text-gray-400 hover:text-gray-600'}`}
                            title={item.is_community_shared === 1 ? t('alreadyShared') : (t('shareToCommunity') || 'Share')}
                        >
                            <Icon name="share" size={24} fill={item.is_community_shared === 1 ? "currentColor" : "none"} />
                        </button>
                    )}
                    {((isCommunity && item.userId !== user?.userId) || item.is_readonly) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onBookmark?.(item);
                            }}
                            className={`active:scale-125 transition-all p-1 ${(item.is_readonly || item.isSaved) ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                            title={item.is_readonly ? (t('removeBookmark') || 'Remove') : (item.isSaved ? t('removeBookmark') : t('saveToPrivate'))}
                        >
                            <Icon name="bookmark" size={24} fill={(item.is_readonly || item.isSaved) ? "currentColor" : "none"} />
                        </button>
                    )}
                </div>
            </div>

            {/* Caption & Content */}
            <div className="px-3 pb-4 space-y-1.5">
                {isCommunity && item.likes > 0 && (
                    <p className="text-xs font-black text-gray-800">
                        {item.likes} {t('likes_count') || 'likes'}
                    </p>
                )}

                {item.content && (
                    <div className="text-xs leading-relaxed text-gray-600 font-bold line-clamp-3">
                        {item.content}
                    </div>
                )}

                {/* Expiry Badge */}
                <div className="flex items-center gap-1.5 mt-2">
                    <div className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1 rounded border-2 ${isSoon ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        <Icon name="clock" size={12} />
                        {item.startDate ? `${item.startDate.split('-').slice(1).join('/')} - ${item.expiryDate.split('-').slice(1).join('/')}` : `${t('expires')}: ${item.expiryDate}`}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialPost;
