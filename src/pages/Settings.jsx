import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import { refreshData } from '../utils/db';
import { rescheduleAllNotifications } from '../utils/notifications';
import { loginWithGoogle, logout as firebaseLogout } from '../services/firebase';

const Settings = ({ handleTestNotification }) => {
    const {
        lang, setLang,
        theme, setTheme, themes,
        notifTime, setNotifTime,
        testCooldown,
        db, setDiscounts, discounts,
        user, setUser,
        notify,
        t
    } = useApp();

    const [tempUser, setTempUser] = useState(user);
    const [isSocialLoading, setIsSocialLoading] = useState(false);
    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    // Update tempUser when user changes
    useEffect(() => {
        setTempUser(user);
    }, [user]);

    const handleSocialLogin = async (provider) => {
        setIsSocialLoading(true);
        try {
            let result;
            if (provider === 'google') result = await loginWithGoogle();
            else if (provider === 'facebook') result = await loginWithFacebook();

            const firebaseUser = result.user;
            const newUser = {
                userId: firebaseUser.uid,
                nickname: firebaseUser.displayName || tempUser.nickname || t('anonymous'),
                avatar: tempUser.avatar || '🐻',
                email: firebaseUser.email,
                isLoggedIn: true,
                provider: provider
            };

            // Sync with backend
            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (response.ok) {
                setUser(newUser);
                notify('登入成功！🐻🎉');
            }
        } catch (error) {
            console.error('Social Login Error:', error);
            notify('登入失敗: ' + (error.message || '未知錯誤'));
        } finally {
            setIsSocialLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!window.confirm(t('logout') + '?')) return;
        try {
            await firebaseLogout();
            setUser({
                userId: 'user_' + Math.random().toString(36).substr(2, 9),
                nickname: '',
                avatar: '🐻',
                isLoggedIn: false
            });
            notify('已登出帳戶');
        } catch (error) {
            notify('登出失敗');
        }
    };

    const handleTimeChange = async (type, value) => {
        const newTime = { ...notifTime, [type]: value };
        setNotifTime(newTime);
        localStorage.setItem(`jetso_notif_${type === 'hour' ? 'hr' : 'min'}`, value);

        // 重新排程所有通知
        await rescheduleAllNotifications(discounts, newTime);
        notify('已更新所有通知時間！⏰');
    };

    const handleProfileSave = async () => {
        if (!tempUser.nickname) {
            notify('請輸入暱稱');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tempUser, isLoggedIn: user.isLoggedIn })
            });
            if (response.ok) {
                setUser({ ...tempUser, isLoggedIn: user.isLoggedIn });
                notify('個人資料已儲存！🐻✨');
            } else {
                throw new Error('Failed to save profile');
            }
        } catch (e) {
            notify('儲存失敗，請檢查網路連接');
        }
    };

    const avatarList = ['🐻', '🐼', '🐨', '🦊', '🦁', '🐯', '🐱', '🐰'];

    return (
        <div className="p-4 space-y-6 overflow-y-auto h-full pb-32 scrollbar-hide">
            {/* 👤 會員中心 */}
            <div className="bg-white rounded-md p-7 shadow-sm space-y-6 border-2 border-white relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-32 h-32 ${theme.name === 'Pink' ? 'bg-pink-50' : 'bg-blue-50'} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform`} />

                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-sm relative">
                    <Icon name="user" size={18} className={theme.text} /> {t('memberCenter')}
                </h3>

                <div className="flex flex-col items-center gap-6 relative">
                    {!user.isLoggedIn ? (
                        <div className="w-full space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 text-center mb-4">登入以同步您的優惠資訊及分享內容</p>
                            <button
                                onClick={() => handleSocialLogin('google')}
                                disabled={isSocialLoading}
                                className="w-full py-4 rounded-md bg-white border-2 border-gray-100 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm hover:border-pink-200"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-sm font-black text-gray-600">{t('loginWithGoogle')}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-100 mb-2">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <Icon name="link" size={14} className="text-pink-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase leading-none">{t('linkedAccount')}</p>
                                    <p className="text-xs font-black text-gray-700">{user.email || user.provider}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profile Customization */}
                    <div className="w-full space-y-6 pt-2 border-t border-gray-100">
                        {/* Avatar Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('avatar')}</label>
                            <div className="flex flex-wrap justify-center gap-4">
                                {avatarList.map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setTempUser(prev => ({ ...prev, avatar: a }))}
                                        className={`w-12 h-12 rounded-md flex items-center justify-center text-2xl transition-all shadow-sm ${tempUser.avatar === a ? `${theme.primary} scale-110 shadow-md ring-2 ring-offset-2 ring-pink-200` : 'bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('nickname')}</label>
                            <input
                                type="text"
                                value={tempUser.nickname}
                                onChange={(e) => setTempUser(prev => ({ ...prev, nickname: e.target.value }))}
                                className="w-full p-4 rounded-md bg-gray-50 font-black text-gray-700 outline-none border-2 border-transparent focus:border-pink-200 focus:bg-white transition-all shadow-inner"
                                placeholder={t('anonymous')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleProfileSave}
                                className={`flex-1 py-4 rounded-md ${theme.primary} text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2`}
                            >
                                <Icon name="check" size={16} /> {t('saveProfile')}
                            </button>
                            {user.isLoggedIn && (
                                <button
                                    onClick={handleLogout}
                                    className="px-6 py-4 rounded-md bg-gray-100 text-gray-400 font-black text-sm active:scale-95 transition-all flex items-center justify-center"
                                >
                                    <Icon name="logOut" size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-md p-7 shadow-sm space-y-5 border-2 border-white">
                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Icon name="clock" size={18} className={theme.text} /> {t('notifTimeSet')}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-gray-300">{t('hour')}</span>
                        <select
                            value={notifTime.hour}
                            onChange={(e) => handleTimeChange('hour', e.target.value)}
                            className="w-full p-3 rounded-md bg-gray-50 font-black text-center outline-none"
                        >
                            {Array.from({ length: 24 }).map((_, i) => {
                                const val = i.toString().padStart(2, '0');
                                return <option key={val} value={val}>{val}</option>;
                            })}
                        </select>
                    </div>
                    <span className="text-xl font-black text-gray-200 pt-5">:</span>
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-gray-300">{t('minute')}</span>
                        <select
                            value={notifTime.min}
                            onChange={(e) => handleTimeChange('min', e.target.value)}
                            className="w-full p-3 rounded-md bg-gray-50 font-black text-center outline-none"
                        >
                            {Array.from({ length: 60 }).map((_, i) => {
                                const val = i.toString().padStart(2, '0');
                                return <option key={val} value={val}>{val}</option>;
                            })}
                        </select>
                    </div>
                </div>
                <button
                    disabled={testCooldown > 0}
                    onClick={handleTestNotification}
                    className={`w-full py-4 rounded-md ${theme.secondary} ${theme.text} font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${testCooldown > 0 ? 'opacity-50 grayscale' : ''}`}
                >
                    <Icon name="bell" size={14} /> {t('testNotice')} {testCooldown > 0 && `(${testCooldown}s)`}
                </button>
            </div>

            <div className="bg-white rounded-md p-7 shadow-sm space-y-5 border-2 border-white">
                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Icon name="settings" size={18} className={theme.text} /> {t('themeSelection')}
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    {Object.entries(themes).map(([k, v]) => (
                        <button
                            key={k}
                            onClick={() => setTheme(v)}
                            className={`w-full aspect-square rounded-md ${v.primary} border-4 transition-all shadow-sm ${theme.name === v.name ? 'border-gray-800 scale-110 shadow-md' : 'border-white'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-md p-4 shadow-sm border-2 border-white">
                <button
                    onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                    className="w-full p-4 flex items-center justify-between font-black text-gray-600 hover:bg-gray-50 rounded-md transition-all"
                >
                    <div className="flex items-center gap-3">
                        <Icon name="copy" size={18} className={theme.text} /> {t('changeLang')}
                    </div>
                    <span className="text-[10px] px-3 py-1 bg-gray-100 rounded-md">
                        {lang === 'zh' ? '中文' : 'English'}
                    </span>
                </button>
                <button
                    onClick={() => {
                        if (window.confirm('確定清空所有資料？')) {
                            if (db.isFallback) {
                                localStorage.removeItem('sqlite_fallback_data');
                                setDiscounts([]);
                            } else {
                                db.run("DELETE FROM discounts");
                                refreshData(db, setDiscounts);
                            }
                        }
                    }}
                    className="w-full p-4 flex items-center gap-3 font-black text-rose-400 hover:bg-rose-50 rounded-md transition-all"
                >
                    <Icon name="trash" size={18} /> {t('resetData')}
                </button>
            </div>
        </div>
    );
};

export default Settings;
