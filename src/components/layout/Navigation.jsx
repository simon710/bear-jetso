import React from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

const Navigation = () => {
    const {
        activeTab, setActiveTab,
        setSelectedItem, setIsEditing,
        setShowNotifCenter,
        theme
    } = useApp();

    const navItems = [
        { id: 'home', icon: 'home' },
        { id: 'community', icon: 'users' },
        { id: 'calendar', icon: 'calendar' },
        { id: 'settings', icon: 'settings' }
    ];


    return (
        <nav className={`pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-4 shrink-0`}>
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id);
                        setSelectedItem(null);
                        setIsEditing(false);
                        setShowNotifCenter(false);
                    }}
                    className={`p-4 rounded-md transition-all relative ${activeTab === item.id ? theme.secondary + ' ' + theme.text + ' scale-110 shadow-sm' : 'text-gray-300'}`}
                >
                    <Icon name={item.icon} size={24} strokeWidth={activeTab === item.id ? 3 : 2} />
                </button>
            ))}
        </nav>
    );
};

export default Navigation;
