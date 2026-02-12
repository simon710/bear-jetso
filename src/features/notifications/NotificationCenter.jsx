import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../../components/common/Icon';

const SwipeableNotification = ({ n, onClick, onDelete, theme }) => {
    const [offset, setOffset] = useState(0);
    const startX = useRef(null);
    const MAX_OFFSET = -120; // 2 buttons x 60px

    const onTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
    };

    const onTouchMove = (e) => {
        if (startX.current === null) return;
        const current = e.touches[0].clientX;
        const diff = current - startX.current;
        // Limit swipe to left only
        if (diff < 0) {
            setOffset(Math.max(diff, MAX_OFFSET));
        } else {
            setOffset(0);
        }
    };

    const onTouchEnd = () => {
        if (offset < MAX_OFFSET / 2) setOffset(MAX_OFFSET); // Snap open
        else setOffset(0); // Snap close
        startX.current = null;
    };

    return (
        <div className="relative overflow-hidden mb-3 select-none touch-pan-y">
            {/* Buttons (Behind) */}
            <div
                className="absolute right-0 top-0 bottom-0 flex z-0"
                style={{ visibility: offset === 0 ? 'hidden' : 'visible' }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setOffset(0);
                    }}
                    className="w-[60px] bg-gray-200 text-gray-500 flex flex-col items-center justify-center active:bg-gray-300 transition-colors"
                >
                    <Icon name="x" size={20} />
                    <span className="text-[10px] font-bold">取消</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                    }}
                    className="w-[60px] bg-rose-500 text-white flex flex-col items-center justify-center rounded-r-md active:bg-rose-600 transition-colors"
                >
                    <Icon name="trash" size={20} />
                    <span className="text-[10px] font-bold">刪除</span>
                </button>
            </div>

            {/* Notification Content (Front) */}
            <div
                className={`relative z-10 p-4 rounded-md border-2 transition-transform duration-200 ease-out bg-white ${n.isRead ? 'border-transparent bg-gray-50' : 'border-pink-100 shadow-sm'}`}
                style={{ transform: `translateX(${offset}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={() => {
                    if (offset < -10) setOffset(0);
                    else onClick(n);
                }}
            >
                <div className="flex justify-between items-start mb-1 pointer-events-none">
                    <h4 className={`font-black text-xs ${n.isRead ? 'text-gray-500' : theme.text}`}>
                        {n.title}
                    </h4>
                    <span className="text-[8px] font-bold text-gray-300">{n.time}</span>
                </div>
                <p className={`text-[10px] leading-relaxed font-bold pointer-events-none ${n.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                    {n.body}
                </p>
            </div>
        </div>
    );
};

const NotificationCenter = ({ onNotifClick }) => {
    const {
        notifHistory, setNotifHistory,
        setShowNotifCenter,
        t, theme, lang
    } = useApp();

    const handleDelete = (id) => {
        setNotifHistory(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="absolute inset-0 z-[200] flex flex-col bg-white animate-in slide-in-from-right duration-300">
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
                {notifHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic">
                        <Icon name="bell" size={48} className="mb-4 opacity-20" />
                        <p>{t('noNotif')}</p>
                    </div>
                ) : (
                    notifHistory.map(n => (
                        <SwipeableNotification
                            key={n.id}
                            n={n}
                            onClick={onNotifClick}
                            onDelete={handleDelete}
                            theme={theme}
                        />
                    ))
                )}
            </div>
            {notifHistory.length > 0 && (
                <button
                    onClick={() => setNotifHistory([])}
                    className="m-4 p-4 rounded-md bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                    {t('resetData')}
                </button>
            )}
        </div>
    );
};

export default NotificationCenter;
