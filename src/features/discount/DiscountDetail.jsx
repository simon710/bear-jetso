import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getStatus, checkIsExpired, checkIsSoonExpiring } from '../../utils/helpers';
import Icon from '../../components/common/Icon';
import DiagonalTag from '../../components/common/DiagonalTag';
import { useDiscountActions } from '../../hooks/useDiscountActions';

const DiscountDetail = () => {
    const {
        selectedItem, setSelectedItem,
        merchants, t, lang, theme,
        setIsEditing, setFormData,
        setZoomedImage, notify,
        likedPosts, setLikedPosts,
        discounts, user
    } = useApp();

    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const { handleDelete, handleMarkAsUsed, handleMarkAsUnused, handleShare, handleBookmark } = useDiscountActions();

    if (!selectedItem) return null;

    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';
    const isCommunity = !!selectedItem.isCommunity;
    const isLiked = likedPosts.includes(selectedItem.id);

    const handleCommunityLike = async () => {
        const id = selectedItem.id;
        const endpoint = isLiked ? 'unlike' : 'like';
        try {
            const response = await fetch(`${API_URL}/community/${id}/${endpoint}`, { method: 'POST' });
            if (response.ok) {
                setSelectedItem(prev => ({ ...prev, likes: (prev.likes || 0) + (isLiked ? -1 : 1) }));
                if (isLiked) {
                    setLikedPosts(prev => prev.filter(pId => pId !== id));
                } else {
                    setLikedPosts(prev => [...prev, id]);
                }
                notify(isLiked ? '已取消點讚' : '謝謝你的點讚！❤️');
            }
        } catch (e) { notify('操作失敗'); }
    };

    const handleCommunityReport = async () => {
        const id = selectedItem.id;
        if (!window.confirm(t('report') + '?')) return;
        try {
            const response = await fetch(`${API_URL}/community/${id}/report`, { method: 'POST' });
            if (response.ok) {
                const resData = await response.json();
                if (resData.reports >= 10) {
                    setSelectedItem(null);
                    notify(t('reportThreshNotice'));
                } else {
                    setSelectedItem(prev => ({ ...prev, reports: (prev.reports || 0) + 1 }));
                    notify('已收到您的舉報，我們會盡快處理。');
                }
            }
        } catch (e) { notify('操作失敗'); }
    };

    const status = getStatus(selectedItem);
    const isSoon = status === 'active' && checkIsSoonExpiring(selectedItem.expiryDate);
    const merchant = merchants.find(m => m.name === selectedItem.title || m.name_en === selectedItem.title);

    // 處理 URL 自動連結
    const renderContentWithLinks = (text) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline break-all font-bold"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className="h-full overflow-y-auto p-4 pb-24 space-y-4 bg-white animate-in slide-in-from-right duration-300 scrollbar-hide relative overflow-hidden">
            {status === 'expired' && <DiagonalTag text={t('tagExpired')} colorClass="bg-gray-400" />}
            {status === 'used' && <DiagonalTag text={t('tagUsed')} colorClass="bg-gray-500" />}
            {isSoon && <DiagonalTag text={t('tagSoon')} colorClass="bg-rose-500" />}

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className={`px-4 py-1 rounded-md text-[9px] font-black uppercase ${status === 'active' ? theme.primary + ' text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                        {t(status)}
                    </span>
                    <span className={`px-4 py-1 rounded-md text-[9px] font-black uppercase ${theme.secondary} ${theme.text} shadow-sm`}>
                        {selectedItem.category || t('catPoints')}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {merchant?.logo && (
                        <div className="w-12 h-12 bg-white rounded-md shadow-sm border border-gray-100 p-2 shrink-0">
                            <img src={merchant.logo} className="w-full h-full object-contain" alt={selectedItem.title} />
                        </div>
                    )}
                    <h2 className="text-3xl font-black text-gray-800 leading-tight">{selectedItem.title}</h2>
                </div>
            </div>

            {selectedItem.images?.length > 0 && (
                <div className="space-y-2">
                    <div className="rounded-md overflow-hidden shadow-md border-4 border-white aspect-video relative bg-gray-50">
                        <img
                            src={selectedItem.images[activeImgIdx] || selectedItem.images[0]}
                            className="w-full h-full object-cover animate-in fade-in duration-500"
                            onClick={() => setZoomedImage(selectedItem.images[activeImgIdx] || selectedItem.images[0])}
                            alt="Discount"
                        />
                        {selectedItem.images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-md font-black">
                                {activeImgIdx + 1} / {selectedItem.images.length}
                            </div>
                        )}
                    </div>
                    {selectedItem.images.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto p-2 pb-4 scrollbar-hide -mx-2">
                            {selectedItem.images.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setActiveImgIdx(idx)}
                                    className={`w-20 h-20 rounded-md shrink-0 border-2 transition-all duration-300 active:scale-95 relative ${activeImgIdx === idx ? 'border-pink-500 scale-110 shadow-lg z-10' : 'border-transparent opacity-50 grayscale'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover rounded-[4px]" alt={`Thumb ${idx}`} />
                                    {activeImgIdx === idx && (
                                        <div className="absolute inset-0 border-2 border-white/30 rounded-[4px] pointer-events-none" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isCommunity && (
                <div className="bg-gray-50/50 p-4 rounded-md border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-md border border-pink-100 flex items-center justify-center text-xl shadow-sm">
                            {selectedItem.avatar || '🐻'}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Shared By</p>
                            <p className="text-sm font-black text-gray-700">@{selectedItem.nickname || t('anonymous')}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 p-7 rounded-md space-y-5 border-2 border-white shadow-inner">
                {selectedItem.content && (
                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {renderContentWithLinks(selectedItem.content)}
                    </div>
                )}
                <div className={`grid grid-cols-2 gap-6 ${selectedItem.content ? 'pt-6 border-t border-gray-100' : ''}`}>
                    {selectedItem.startDate ? (
                        <>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('startDate')}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <p className="font-black text-sm text-gray-700">{selectedItem.startDate}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('expiry')}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    <p className="font-black text-sm text-gray-700">{selectedItem.expiryDate}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('expiry')}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <p className="font-black text-sm text-gray-700">{selectedItem.expiryDate}</p>
                            </div>
                        </div>
                    )}
                    {(selectedItem.discountCodes?.length > 0 && selectedItem.discountCodes[0]) && (
                        <div className="col-span-2">
                            <p className="text-[10px] font-black text-gray-300 uppercase mb-2">{t('discountCode')}</p>
                            <div className="flex flex-wrap gap-3">
                                {selectedItem.discountCodes.map((code, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            navigator.clipboard.writeText(code);
                                            notify(t('copied'));
                                        }}
                                        className="px-5 py-3 bg-white border-2 border-pink-100 rounded-md font-black text-pink-600 text-lg shadow-sm flex items-center gap-2 active:scale-90 transition-all cursor-pointer"
                                    >
                                        <Icon name="copy" size={18} />
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {selectedItem.link && (
                    <div className="pt-2">
                        <p className="text-[10px] font-black text-gray-300 uppercase mb-1">🔗 {t('detailsLink')}</p>
                        <a
                            href={selectedItem.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 underline break-all font-bold"
                        >
                            {selectedItem.link}
                        </a>
                    </div>
                )}
            </div>

            {isCommunity ? (
                <div className="flex gap-3">
                    <button
                        onClick={handleCommunityLike}
                        className={`flex-1 py-5 rounded-md font-black shadow-md active:scale-95 transition-all text-lg flex items-center justify-center gap-3 ${isLiked ? 'bg-rose-500 text-white' : 'bg-white border-2 border-rose-100 text-rose-500'}`}
                    >
                        <Icon name="thumbsUp" size={24} fill={isLiked ? "#ffffff" : "none"} className={isLiked ? '' : 'text-rose-500'} />
                        <span>{selectedItem.likes || 0}</span>
                    </button>
                    {selectedItem.userId !== user?.userId && (
                        <button
                            onClick={async () => {
                                await handleBookmark(selectedItem);
                                const exists = discounts.some(d => d.title === selectedItem.title && d.expiryDate === selectedItem.expiryDate);
                                setSelectedItem(prev => ({ ...prev, isSaved: !exists }));
                            }}
                            className={`px-8 py-5 rounded-md font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 border ${discounts.some(d => d.title === selectedItem.title && d.expiryDate === selectedItem.expiryDate) ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                            title={discounts.some(d => d.title === selectedItem.title && d.expiryDate === selectedItem.expiryDate) ? t('removeBookmark') : t('saveToPrivate')}
                        >
                            <Icon name="bookmark" size={24} fill={discounts.some(d => d.title === selectedItem.title && d.expiryDate === selectedItem.expiryDate) ? "currentColor" : "none"} />
                        </button>
                    )}
                    <button
                        onClick={handleCommunityReport}
                        className="px-8 py-5 bg-gray-50 text-gray-400 font-black rounded-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-gray-100"
                    >
                        <Icon name="alertTriangle" size={20} />
                        <span className="text-sm">{selectedItem.reports || 0}</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {selectedItem.is_community_shared === 1 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-md p-4 space-y-1">
                            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                                <Icon name="checkCircle" size={16} />
                                <span>{t('shared')}</span>
                            </div>
                            {selectedItem.sharedAt && (
                                <div className="text-[10px] text-emerald-500/70 font-bold ml-6">
                                    {t('sharedAtLabel')}: {selectedItem.sharedAt}
                                </div>
                            )}
                        </div>
                    )}
                    {selectedItem.status === 'used' ? (
                        <button
                            onClick={() => handleMarkAsUnused(selectedItem)}
                            className={`w-full py-5 rounded-md bg-gray-100 text-gray-600 font-black shadow-sm active:scale-95 transition-all text-lg flex items-center justify-center gap-2`}
                        >
                            ↩️ {t('markAsUnused')}
                        </button>
                    ) : (
                        !checkIsExpired(selectedItem.expiryDate) && (
                            <button
                                onClick={() => handleMarkAsUsed(selectedItem)}
                                className={`w-full py-5 rounded-md ${theme.primary} text-white font-black shadow-md active:scale-95 transition-all text-lg`}
                            >
                                ✨ {t('markAsUsed')}
                            </button>
                        )
                    )}
                    <div className="flex gap-3">
                        {!selectedItem.is_readonly ? (
                            <>
                                <button
                                    onClick={() => { setFormData(selectedItem); setIsEditing(true); }}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-md text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <Icon name="edit" size={16} /> {t('modify')}
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedItem.id)}
                                    className="px-6 py-4 bg-rose-50 text-rose-400 font-black rounded-md text-xs active:scale-95 transition-all"
                                >
                                    <Icon name="trash" size={18} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleBookmark(selectedItem)}
                                className="w-full py-4 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-md text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <Icon name="x" size={18} /> {t('removeBookmark')}
                            </button>
                        )}
                    </div>

                    {!selectedItem.is_readonly && selectedItem.is_community_shared !== 1 && (
                        <button
                            onClick={() => handleShare(selectedItem)}
                            className="w-full py-4 bg-pink-50 text-pink-500 font-black rounded-md text-xs flex items-center justify-center gap-2 active:scale-95 transition-all border border-pink-100"
                        >
                            <Icon name="share" size={16} /> {t('shareToCommunity')}
                        </button>
                    )}
                </div>
            )
            }
        </div >
    );
};

export default DiscountDetail;
