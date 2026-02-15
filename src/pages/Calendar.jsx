import React from 'react';
import { useApp } from '../context/AppContext';
import { getCalendarDays, checkIsSoonExpiring, getStatus, checkIsHKHoliday, checkIsInRange } from '../utils/helpers';
import Icon from '../components/common/Icon';
import DiscountCard from '../components/DiscountCard';

const Calendar = () => {
    const {
        viewDate, setViewDate,
        selectedDay, setSelectedDay,
        discounts, holidays, t, theme, lang
    } = useApp();

    const days = getCalendarDays(viewDate.getFullYear(), viewDate.getMonth());

    // 支援語言的月份名稱
    const monthNames = lang === 'zh'
        ? ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
        : ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const getSelectedDateStr = () => `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const selectedDateStr = getSelectedDateStr();
    const dayItems = discounts.filter(d => checkIsInRange(selectedDateStr, d.startDate, d.expiryDate));

    return (
        <div className="h-full flex flex-col pt-2">
            <div className="px-4 space-y-3 shrink-0 pb-4">
                {/* Month Picker */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}
                        className="p-2 bg-white rounded-md shadow-sm active:scale-90 transition-all"
                    >
                        <Icon name="chevronLeft" size={16} className={theme.text} />
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase leading-none">{monthNames[viewDate.getMonth()]}</h2>
                        <p className="text-[10px] font-black text-gray-400 tracking-widest">{viewDate.getFullYear()}</p>
                    </div>
                    <button
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}
                        className="p-2 bg-white rounded-md shadow-sm active:scale-90 transition-all"
                    >
                        <Icon name="chevronRight" size={16} className={theme.text} />
                    </button>
                </div>

                {/* Grid with White Background */}
                <div className="bg-white rounded-md p-2 shadow-sm">
                    <div className="grid grid-cols-7 gap-1">
                        {(lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => (
                            <div key={i} className={`text-center text-[10px] font-black py-2 ${i === 0 ? 'text-rose-500' : 'text-gray-300'}`}>{d}</div>
                        ))}
                        {days.map((day, i) => {
                            const dateStr = day ? `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                            const hasItems = day && discounts.some(d => checkIsInRange(dateStr, d.startDate, d.expiryDate));
                            const isExpiryDay = day && discounts.some(d => d.expiryDate === dateStr);
                            const isSelected = day === selectedDay;

                            // Check if Sunday or Holiday
                            const dayOfWeek = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay() : null;
                            const isRed = dayOfWeek === 0 || checkIsHKHoliday(viewDate.getFullYear(), viewDate.getMonth(), day, holidays);

                            return (
                                <div
                                    key={i}
                                    onClick={() => day && setSelectedDay(day)}
                                    className={`aspect-square rounded-md flex flex-col items-center justify-center relative transition-all active:scale-90 ${day ? 'cursor-pointer' : 'opacity-0'} ${isSelected ? theme.primary + ' text-white shadow-md scale-105 z-10' : 'bg-transparent text-gray-700'}`}
                                >
                                    <span className={`text-xs font-black ${isSelected ? 'text-white' : (isRed ? 'text-rose-500' : 'text-gray-700')}`}>{day}</span>
                                    {hasItems && !isSelected && (
                                        <div className={`absolute bottom-1 w-1 h-1 rounded-md ${isExpiryDay ? theme.primary : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Discount List for Selected Day */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2 scrollbar-hide">
                <div className="flex items-center justify-between mb-2 sticky top-0 bg-white/80 backdrop-blur-sm py-2 -mx-4 px-4 z-20">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                        {viewDate.getMonth() + 1}/{selectedDay} {t('active') || 'Active'}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-[9px] font-black text-gray-500">
                        {dayItems.length}
                    </span>
                </div>
                {dayItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                        <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center mb-4">
                            <Icon name="calendar" size={24} className="text-gray-300" />
                        </div>
                        <p className="text-xs font-bold text-gray-400">{t('empty')}</p>
                    </div>
                ) : (
                    dayItems.map(item => (
                        <DiscountCard key={item.id} item={item} />
                    ))
                )}
            </div>
        </div>
    );
};

export default Calendar;
