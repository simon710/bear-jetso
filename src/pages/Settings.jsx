import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/common/Icon';
import { refreshData } from '../utils/db';
import { rescheduleAllNotifications } from '../utils/notifications';
import { loginWithGoogle, logout as firebaseLogout } from '../services/firebase';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const Settings = ({ handleTestNotification }) => {
    const {
        lang, setLang,
        theme, setTheme, themes,
        notifTime, setNotifTime,
        testCooldown,
        db, setDiscounts, discounts,
        user, setUser,
        notify,
        t,
        setSelectedItem,
        setIsEditing,
        setActiveTab,
        checkSuspension
    } = useApp();

    const [tempUser, setTempUser] = useState(user);
    const [isSocialLoading, setIsSocialLoading] = useState(false);
    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    // Update tempUser when user changes
    useEffect(() => {
        setTempUser(user);
    }, [user]);

    // This function is likely intended to be called from a handleSave function,
    // but the instruction implies it should be added and called with updated discounts.
    // For now, it's placed here as a standalone helper based on the provided snippet.
    const autoBackup = async (updatedDiscounts) => {
        if (!user.isLoggedIn) {
            return; // Only backup if logged in
        }

        const apiBase = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

        const payload = {
            userId: user.userId,
            discounts: updatedDiscounts || [],
            settings: { lang, notifTime }
        };

        // If SQLite, handle fetching latest for backup
        if (!db.isFallback) {
            try {
                const res = await db.query("SELECT * FROM discounts;");
                payload.discounts = res.values.map(item => ({
                    ...item,
                    images: JSON.parse(item.images || '[]'),
                    discountCodes: item.discountCodes ? JSON.parse(item.discountCodes) : (item.discountCode ? [item.discountCode] : [''])
                }));
            } catch (error) {
                console.error('Error fetching SQLite data for auto-backup:', error);
                return;
            }
        }

        fetch(`${apiBase}/sync/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.warn('Auto-backup heartbeat failed:', err));
    };


    const handleSocialLogin = async (provider) => {
        setIsSocialLoading(true);
        try {
            let result;
            if (provider === 'google') result = await loginWithGoogle();
            else if (provider === 'facebook') result = await loginWithFacebook();

            const firebaseUser = result.user;

            // 🔍 [Fix] Fetch existing profile first to avoid overwriting with defaults
            let existingProfile = null;
            try {
                // Correct path is /profile/{id}
                const getProfileRes = await fetch(`${API_URL}/profile/${firebaseUser.uid}`);
                if (getProfileRes.ok) {
                    existingProfile = await getProfileRes.json();
                    console.log("Found existing cloud profile:", existingProfile);
                }
            } catch (e) {
                console.warn("Could not fetch existing profile, using defaults");
            }

            const newUser = {
                userId: firebaseUser.uid,
                nickname: existingProfile?.nickname || firebaseUser.displayName || tempUser.nickname || t('anonymous'),
                avatar: existingProfile?.avatar || tempUser.avatar || '🐻',
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
                const cloudUser = await response.json();
                if (checkSuspension(cloudUser)) return;
                console.log("Profile sync complete:", cloudUser);

                // Merge cloud user with loggedIn status
                const finalUser = { ...cloudUser, isLoggedIn: true };
                setUser(finalUser);
                setTempUser(finalUser); // 💡 [Fix] Directly update tempUser to reflect in UI

                notify('登入成功！🐻🎉');

                // ☁️ [Feature] Merge local data before restore/save (Two-Way Sync)
                if (true) { // Always sync/check upon login now for robustness
                    console.log('🐻 [Sync] Performing two-way sync after login...');
                    const mergePayload = {
                        userId: finalUser.userId,
                        discounts: discounts,
                        settings: { lang, notifTime },
                        isIncremental: true
                    };
                    const syncRes = await fetch(`${API_URL}/sync/backup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(mergePayload)
                    });

                    if (syncRes.ok) {
                        const syncData = await syncRes.json();
                        // If backend returned a merged list (Cloud + New Local)
                        if (syncData.discounts) {
                            console.log(`🐻 [Sync] Two-way sync complete. Merged count: ${syncData.discounts.length}`);
                            await performRestore(syncData); // Use performRestore to update DB/UI
                        }
                    } else {
                        // Fallback if sync check fails (maybe first time user)
                        if (discounts.length === 0) {
                            setTimeout(() => {
                                handleCheckAndPromptRestore(finalUser.userId);
                            }, 1500);
                        }
                    }
                }
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

            // 🚩 [Feature] Clear local data on logout
            if (db.isFallback) {
                localStorage.removeItem('sqlite_fallback_data');
            } else {
                await db.run("DELETE FROM discounts;");
            }
            setDiscounts([]);

            // Cancel all notifications
            if (Capacitor.isPluginAvailable('LocalNotifications')) {
                try {
                    const pending = await LocalNotifications.getPending();
                    if (pending && pending.notifications && pending.notifications.length > 0) {
                        await LocalNotifications.cancel({ notifications: pending.notifications });
                    }
                } catch (e) { console.warn('Notif clear failed', e); }
            }

            setUser({
                userId: 'user_' + Math.random().toString(36).substr(2, 9),
                nickname: '',
                avatar: '🐻',
                isLoggedIn: false
            });
            notify('已登出並清空本地資料');
        } catch (error) {
            console.error('Logout error:', error);
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

    const [isSaving, setIsSaving] = useState(false);
    const [isSyncingData, setIsSyncingData] = useState(false);

    const handleBackup = async () => {
        if (!user.isLoggedIn) {
            notify('請先登入後再備份');
            return;
        }
        if (discounts.length === 0) {
            notify('沒有資料可備份');
            return;
        }

        setIsSyncingData(true);
        try {
            // Include all essential local state
            const payload = {
                userId: user.userId,
                discounts: discounts,
                settings: {
                    lang,
                    notifTime
                }
            };

            const response = await fetch(`${API_URL}/sync/backup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                if (checkSuspension(data)) return;
                notify('雲端備份成功！🐻☁️');
            } else {
                throw new Error('備份失敗');
            }
        } catch (error) {
            console.error('Backup Error:', error);
            notify(`備份失敗: ${error.message}`);
        } finally {
            setIsSyncingData(false);
        }
    };

    const handleCheckAndPromptRestore = async (userId) => {
        setIsSyncingData(true);
        try {
            const response = await fetch(`${API_URL}/sync/restore?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                if (checkSuspension(data)) return;
                if (data.discounts && data.discounts.length > 0) {
                    const confirmRestore = window.confirm(
                        '在雲端找到您的備份資料 (共有 ' + data.discounts.length + ' 條記錄)。\n' +
                        '是否要恢復到此設備？\n\n' +
                        '⚠️ 注意：還原將會覆蓋目前手機上的所有私人貼子。'
                    );
                    if (confirmRestore) {
                        await performRestore(data);
                    }
                }
            }
        } catch (e) {
            console.error('Check backup error:', e);
        } finally {
            setIsSyncingData(false);
        }
    };

    const handleRestore = async () => {
        if (!user.isLoggedIn) {
            notify('請先登入後再還原');
            return;
        }
        if (!window.confirm('還原將會覆蓋目前手機上的所有私人優惠，確定繼續？')) return;

        setIsSyncingData(true);
        try {
            const response = await fetch(`${API_URL}/sync/restore?userId=${user.userId}`);
            if (response.ok) {
                const data = await response.json();
                if (checkSuspension(data)) return;
                await performRestore(data);
            } else {
                throw new Error('還原失敗');
            }
        } catch (error) {
            console.error('Restore Error:', error);
            notify(`還原失敗: ${error.message}`);
        } finally {
            setIsSyncingData(false);
        }
    };

    const performRestore = async (data) => {
        const restoredDiscounts = data.discounts;

        if (!Array.isArray(restoredDiscounts)) {
            notify('雲端沒有找到您的備份資料');
            return;
        }

        // Update Local Database
        if (db.isFallback) {
            localStorage.setItem('sqlite_fallback_data', JSON.stringify(restoredDiscounts));
            setDiscounts(restoredDiscounts);
        } else {
            // SQLite: Clear and rebuild
            await db.run("DELETE FROM discounts;");
            for (const item of restoredDiscounts) {
                await db.run(`
                    INSERT INTO discounts (
                        uid, title, content, startDate, expiryDate, images, discountCodes, link, status, usedAt, createdAt,
                        notify_1m_weekly, notify_last_7d_daily, is_notify_enabled, category, notif_hour, notif_min,
                        is_community_shared, sharedAt, is_readonly
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    item.uid || null,
                    item.title, item.content, item.startDate || null, item.expiryDate,
                    JSON.stringify(item.images || []),
                    JSON.stringify(item.discountCodes || ['']),
                    item.link || '', item.status || 'active', item.usedAt || null, item.createdAt || new Date().toISOString(),
                    item.notify_1m_weekly ?? 1,
                    item.notify_last_7d_daily ?? 1,
                    item.is_notify_enabled ?? 1,
                    item.category || '一般',
                    item.notif_hour || '09',
                    item.notif_min || '00',
                    item.is_community_shared || 0,
                    item.sharedAt || null,
                    item.is_readonly || 0
                ]);
            }
            await refreshData(db, setDiscounts);
        }

        // Restore Settings if available
        if (data.settings) {
            if (data.settings.lang) setLang(data.settings.lang);
            if (data.settings.notifTime) {
                setNotifTime(data.settings.notifTime);
                localStorage.setItem('jetso_notif_hr', data.settings.notifTime.hour);
                localStorage.setItem('jetso_notif_min', data.settings.notifTime.min);
            }
        }

        // Reschedule notifications
        await rescheduleAllNotifications(restoredDiscounts, data.settings?.notifTime || notifTime);

        notify('雲端資料已成功還原！🐻🎉');
    };

    const handleProfileSave = async () => {
        if (!tempUser.nickname) {
            notify('請輸入暱稱');
            return;
        }
        setIsSaving(true);
        try {
            // Optimization: Remove double payload
            const payload = { ...tempUser, isLoggedIn: user.isLoggedIn };

            // If we have new avatar data, don't send the preview base64 in the 'avatar' field too
            if (payload.avatarData && payload.avatar && payload.avatar.startsWith('data:')) {
                payload.avatar = 'UPLOADING';
            }

            console.log("Saving profile, payload size approx:", JSON.stringify(payload).length);

            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const savedUser = await response.json();
                if (checkSuspension(savedUser)) return;
                console.log("Profile saved successfully:", savedUser);
                setUser({ ...savedUser, isLoggedIn: user.isLoggedIn });
                setTempUser(prev => ({ ...prev, avatarData: null })); // Clear upload data
                notify('個人資料已儲存！🐻✨');
            } else {
                const errorData = await response.json();
                console.error('Failed to save profile:', errorData);
                throw new Error(errorData.error || 'Failed to save profile');
            }
        } catch (e) {
            console.error('Save profile error:', e);
            notify(`儲存失敗: ${e.message}`);
        } finally {
            setIsSaving(false);
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

                    {user.isLoggedIn && (
                        <div className="w-full space-y-6 pt-2 border-t border-gray-100 animate-in slide-in-from-top duration-300">
                            {/* Avatar Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('avatar')}</label>

                                {/* Current Avatar Display */}
                                <div className="flex justify-center mb-4">
                                    <div className={`w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-5xl bg-gray-50 bg-cover bg-center`}
                                        style={(tempUser.avatar && (tempUser.avatar.startsWith('http') || tempUser.avatar.startsWith('data:'))) ? { backgroundImage: `url(${tempUser.avatar})` } : {}}>
                                        {(!tempUser.avatar || (!tempUser.avatar.startsWith('http') && !tempUser.avatar.startsWith('data:'))) && (tempUser.avatar || '🐻')}
                                    </div>
                                </div>

                                {/* Preset Avatars */}
                                <div className="flex flex-wrap justify-center gap-3">
                                    {avatarList.map(a => (
                                        <button
                                            key={a}
                                            onClick={() => setTempUser(prev => ({ ...prev, avatar: a, avatarData: null }))}
                                            className={`w-10 h-10 rounded-md flex items-center justify-center text-xl transition-all shadow-sm ${tempUser.avatar === a ? `${theme.primary} scale-110 shadow-md ring-2 ring-offset-1 ring-pink-100` : 'bg-gray-50 hover:bg-gray-100'}`}
                                        >
                                            {a}
                                        </button>
                                    ))}

                                    {/* Upload Button */}
                                    <label className="w-10 h-10 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95">
                                        <Icon name="plus" size={18} className="text-gray-400" />
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setTempUser(prev => ({
                                                            ...prev,
                                                            avatar: reader.result, // Preview
                                                            avatarData: reader.result // For upload
                                                        }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
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
                                    disabled={isSaving}
                                    className={`w-full py-4 rounded-md font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400' : theme.primary}`}
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Icon name="check" size={20} />
                                    )}
                                    {isSaving ? '儲存中...' : t('saveProfile')}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-6 py-4 rounded-md bg-gray-100 text-gray-400 font-black text-sm active:scale-95 transition-all flex items-center justify-center"
                                >
                                    <Icon name="logOut" size={18} />
                                </button>
                            </div>

                            {/* ☁️ Cloud Sync Section */}
                            <div className="pt-6 border-t border-gray-100 animate-in fade-in duration-500 delay-150">
                                <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1 mb-4">雲端同步備份</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleBackup}
                                        disabled={isSyncingData}
                                        className="flex flex-col items-center gap-2 p-4 rounded-md bg-pink-50 border border-pink-100 active:scale-95 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            {isSyncingData ? (
                                                <div className="w-5 h-5 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                                            ) : (
                                                <Icon name="upload" size={20} className="text-pink-400" />
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600">上傳備份</span>
                                    </button>

                                    <button
                                        onClick={handleRestore}
                                        disabled={isSyncingData}
                                        className="flex flex-col items-center gap-2 p-4 rounded-md bg-blue-50 border border-blue-100 active:scale-95 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            {isSyncingData ? (
                                                <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                                            ) : (
                                                <Icon name="refresh" size={20} className="text-blue-400" />
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600">恢復資料</span>
                                    </button>
                                </div>
                                <p className="mt-3 text-[9px] text-gray-400 font-bold leading-relaxed px-1">
                                    將您的私人貼子及設定備份至雲端，更換手機後登入同一帳號即可恢復。
                                </p>
                            </div>
                        </div>
                    )}
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
