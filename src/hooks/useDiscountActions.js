import { useApp } from '../context/AppContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { refreshData } from '../utils/db';
import { scheduleNotifications } from '../utils/notifications';

export const useDiscountActions = () => {
    const {
        db, discounts, setDiscounts,
        setSelectedItem,
        notify, t, lang,
        setIsEditing, setActiveTab,
        notifTime, user
    } = useApp();

    const handleDelete = async (id) => {
        if (!window.confirm(t('delete') + '?')) return;
        try {
            if (db.isFallback) {
                const newList = discounts.filter(d => d.id !== id);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`DELETE FROM discounts WHERE id=?`, [id]);
                await refreshData(db, setDiscounts);
            }
            if (LocalNotifications) await LocalNotifications.cancel({ notifications: [{ id: (id % 20000) * 100 }] });
            setSelectedItem(null);
            notify('已刪除！');
        } catch (e) {
            notify('刪除失敗');
        }
    };

    const handleMarkAsUsed = async (item) => {
        if (!window.confirm(t('confirmUsed'))) return;
        const now = new Date().toLocaleString();
        try {
            if (db.isFallback) {
                const newList = discounts.map(d => d.id === item.id ? { ...d, status: 'used', usedAt: now } : d);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`UPDATE discounts SET status='used', usedAt=? WHERE id=?`, [now, item.id]);
                await refreshData(db, setDiscounts);
            }
            // Cancel notifications for this item
            const baseId = (item.id % 20000) * 100;
            const idsToCancel = [];
            for (let i = 0; i < 100; i++) idsToCancel.push({ id: baseId + i });
            if (LocalNotifications) await LocalNotifications.cancel({ notifications: idsToCancel });

            setSelectedItem({ ...item, status: 'used', usedAt: now });
            notify('標記成功！✅');
        } catch (e) {
            console.error(e);
            notify('更新失敗');
        }
    };

    const handleMarkAsUnused = async (item) => {
        try {
            if (db.isFallback) {
                const newList = discounts.map(d => d.id === item.id ? { ...d, status: 'active', usedAt: null } : d);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`UPDATE discounts SET status='active', usedAt=NULL WHERE id=?`, [item.id]);
                await refreshData(db, setDiscounts);
            }
            // Reschedule notifications
            scheduleNotifications({ ...item, status: 'active' }, notifTime);

            setSelectedItem({ ...item, status: 'active', usedAt: null });
            notify('已恢復為未使用！✨');
        } catch (e) {
            console.error(e);
            notify('更新失敗');
        }
    };

    const handleShare = async (item) => {
        if (!user.isLoggedIn) {
            notify(t('loginRequired'));
            setActiveTab('settings');
            return;
        }

        const warning = "⚠️ " + t('shareToCommunity') + "?\n\n一經分享，不能收回，請小心不要將個人資料及私人優惠 Code 分享！";
        if (!window.confirm(warning)) return;

        try {
            const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';
            const response = await fetch(`${API_URL}/community`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id.toString(),
                    title: item.title,
                    content: item.content,
                    expiryDate: item.expiryDate,
                    images: item.images,
                    category: item.category || '積分到期',
                    link: item.link,
                    discountCodes: item.discountCodes, // Include codes when sharing
                    userId: user.userId,
                    nickname: user.nickname,
                    avatar: user.avatar
                })
            });

            if (response.ok) {
                const now = new Date().toLocaleString();
                // If sharing was successful, update the local DB flag
                if (db.isFallback) {
                    const newList = discounts.map(d => d.id === item.id ? { ...d, is_community_shared: 1, sharedAt: now } : d);
                    localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                    setDiscounts(newList);
                } else {
                    await db.run(`UPDATE discounts SET is_community_shared=1, sharedAt=? WHERE id=?`, [now, item.id]);
                    await refreshData(db, setDiscounts);
                }
                setSelectedItem({ ...item, is_community_shared: 1, sharedAt: now });
                notify('已成功分享到社群廣場！🚀');
            } else {
                throw new Error('Failed to share');
            }
        } catch (e) {
            console.error(e);
            notify('分享失敗，請稍後再試');
        }
    };

    return { handleDelete, handleMarkAsUsed, handleMarkAsUnused, handleShare };

};
