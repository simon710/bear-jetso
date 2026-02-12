import React from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

const Header = () => {
    const {
        theme, lang, t,
        selectedItem, setSelectedItem,
        isEditing, setIsEditing,
        showNotifCenter, setShowNotifCenter,
        activeTab,
        notifHistory
    } = useApp();

    const hasUnread = notifHistory.some(n => !n.isRead);

    const getTitle = () => {
        if (isEditing) return t('edit');
        if (selectedItem) return t('detail');
        if (showNotifCenter) return t('notifHistory');
        return t(activeTab);
    };

    return (
        <header className={`pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 px-4 flex items-center justify-between ${theme.bg} shrink-0 border-b border-black/5`}>
            <div className="flex items-center gap-3">
                {(selectedItem || isEditing || showNotifCenter) && (
                    <button
                        onClick={() => {
                            if (showNotifCenter) setShowNotifCenter(false);
                            else { setIsEditing(false); setSelectedItem(null); }
                        }}
                        className="p-2 rounded-md bg-white shadow-sm active:scale-90 transition-all"
                    >
                        <Icon name="chevronLeft" size={18} className={theme.text} />
                    </button>
                )}
                <h1 className={`text-xl font-black ${theme.text} uppercase tracking-tight`}>
                    {getTitle()}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowNotifCenter(!showNotifCenter)}
                    className={`w-9 h-9 rounded-md bg-white shadow-sm flex items-center justify-center relative ${theme.text} active:scale-90 transition-all`}
                >
                    <Icon name="bell" size={18} />
                    {hasUnread && <div className={`absolute top-2 right-2 w-2 h-2 rounded-md ${theme.accent} border-2 border-white`} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
