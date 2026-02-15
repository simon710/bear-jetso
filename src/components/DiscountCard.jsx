import React from 'react';
import { useApp } from '../context/AppContext';
import { getStatus, checkIsSoonExpiring } from '../utils/helpers';
import DiagonalTag from './common/DiagonalTag';

const DiscountCard = ({ item }) => {
    const { setSelectedItem, merchants, t, lang, theme } = useApp();
    const status = getStatus(item);
    const isSoon = status === 'active' && checkIsSoonExpiring(item.expiryDate);
    const merchant = merchants.find(m => m.name === item.title || m.name_en === item.title);

    return (
        <div
            onClick={() => setSelectedItem(item)}
            className={`bg-white rounded-md p-3 shadow-sm flex gap-3 cursor-pointer active:scale-95 transition-all relative overflow-hidden border-2 border-transparent hover:border-pink-100 ${status !== 'active' ? 'grayscale opacity-70' : ''}`}
        >
            {status === 'expired' && <DiagonalTag text={t('tagExpired')} colorClass="bg-gray-400" />}
            {status === 'used' && <DiagonalTag text={t('tagUsed')} colorClass="bg-gray-500" />}
            {isSoon && <DiagonalTag text={t('tagSoon')} colorClass="bg-rose-500" />}

            <div className={`w-14 h-14 rounded-md flex items-center justify-center text-xl shadow-inner shrink-0 overflow-hidden ${status === 'active' ? theme.secondary : 'bg-gray-100'}`}>
                {merchant?.logo ? (
                    <img src={merchant.logo} className="w-full h-full object-contain p-2" alt={item.title} />
                ) : (
                    item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} className="w-full h-full object-cover" alt={item.title} />
                    ) : (
                        item.title.charAt(0)
                    )
                )}
            </div>
            <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-black text-gray-800 truncate text-sm mb-1">{item.title}</h3>
                {item.content && (
                    <p className="text-[10px] text-gray-400 font-bold line-clamp-1 mb-2 italic">{item.content}</p>
                )}
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-0.5 rounded-md text-[8px] font-black uppercase ${status === 'active' ? theme.primary + ' text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                        {t(status)}
                    </span>
                    <span className="text-[9px] font-black text-gray-400 flex items-center gap-1">
                        🗓️ {item.expiryDate}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DiscountCard;
