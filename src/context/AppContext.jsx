import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from '../data/translations.json';
import themes from '../data/themes.json';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [lang, setLang] = useState(localStorage.getItem('jetso_lang') || 'zh');
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('jetso_theme');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure the theme exists in current themes definition
                const matchedTheme = Object.values(themes).find(t => t.name === parsed.name);
                return matchedTheme || themes.pink;
            } catch (e) { return themes.pink; }
        }
        return themes.pink;
    });
    const [discounts, setDiscounts] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [isMerchantsLoading, setIsMerchantsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [homeFilter, setHomeFilter] = useState('active');
    const [sortOrder, setSortOrder] = useState('asc');
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [showToast, setShowToast] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [testCooldown, setTestCooldown] = useState(0);
    const [holidays, setHolidays] = useState([]);
    const [likedPosts, setLikedPosts] = useState(() => {
        try {
            const saved = localStorage.getItem('jetso_liked_posts');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('jetso_user');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return {
            userId: 'user_' + Math.random().toString(36).substr(2, 9),
            nickname: '',
            avatar: '🐻',
            isLoggedIn: false
        };
    });

    const logOut = () => {
        const newUser = {
            userId: 'user_' + Math.random().toString(36).substr(2, 9),
            nickname: '',
            avatar: '🐻',
            isLoggedIn: false
        };
        setUser(newUser);
        localStorage.removeItem('jetso_user');
        setLikedPosts([]);
        localStorage.removeItem('jetso_liked_posts');
        notify('已登出帳戶 🐻');
    };

    const checkSuspension = (data, status) => {
        const isSuspended = (status === 403) ||
            (data && (data.status === 'suspended' || data.message === 'suspended' || data.error === 'USER_BLOCKED'));

        if (isSuspended) {
            const msg = (data && data.error === 'USER_BLOCKED' && data.message) ? data.message : '您的帳戶已被停用 (Suspended)。如有疑問請聯絡管理員。';
            window.alert(msg);
            logOut();
            return true;
        }
        return false;
    };

    const [notifTime, setNotifTime] = useState({
        hour: localStorage.getItem('jetso_notif_hr') || '09',
        min: localStorage.getItem('jetso_notif_min') || '00'
    });

    const t = (key) => translations[lang][key] || key;

    const notify = (msg) => {
        setShowToast(msg);
        if (msg) setTimeout(() => setShowToast(null), 3000);
    };

    const [formData, setFormData] = useState({
        title: '', content: '', startDate: '', expiryDate: '', images: [], discountCodes: [''], link: '',
        notify_1m_weekly: 1, notify_last_7d_daily: 1,
        is_notify_enabled: 1, category: t('catPoints'),
        notif_hour: '09', notif_min: '00',
        is_community_shared: 0
    });


    const [notifHistory, setNotifHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('jetso_notifs_v1');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [showNotifCenter, setShowNotifCenter] = useState(false);

    // 日曆相關狀態
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());

    // Persistence for notifications
    useEffect(() => {
        localStorage.setItem('jetso_notifs_v1', JSON.stringify(notifHistory));
    }, [notifHistory]);

    useEffect(() => {
        localStorage.setItem('jetso_liked_posts', JSON.stringify(likedPosts));
    }, [likedPosts]);

    useEffect(() => {
        localStorage.setItem('jetso_theme', JSON.stringify(theme));
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('jetso_lang', lang);
    }, [lang]);

    useEffect(() => {
        localStorage.setItem('jetso_user', JSON.stringify(user));
    }, [user]);

    const value = {
        db, setDb,
        lang, setLang,
        theme, setTheme,
        discounts, setDiscounts,
        merchants, setMerchants,
        isMerchantsLoading, setIsMerchantsLoading,
        activeTab, setActiveTab,
        homeFilter, setHomeFilter,
        sortOrder, setSortOrder,
        isEditing, setIsEditing,
        selectedItem, setSelectedItem,
        zoomedImage, setZoomedImage,
        showToast, setShowToast,
        isSyncing, setIsSyncing,
        formErrors, setFormErrors,
        testCooldown, setTestCooldown,
        notifTime, setNotifTime,
        formData, setFormData,
        notifHistory, setNotifHistory,
        showNotifCenter, setShowNotifCenter,
        viewDate, setViewDate,
        selectedDay, setSelectedDay,
        holidays, setHolidays,
        likedPosts, setLikedPosts,
        user, setUser,
        logOut, checkSuspension,
        t, notify,
        themes
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
