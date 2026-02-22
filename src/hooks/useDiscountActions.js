import { useApp } from '../context/AppContext';
import { LocalNotifications } from '@capacitor/local-notifications';
import { refreshData } from '../utils/db';
import { scheduleNotifications } from '../utils/notifications';

export const useDiscountActions = () => {
    const {
        db, discounts, setDiscounts,
        setSelectedItem,
        setIsEditing, setActiveTab,
        notifTime, user, notify, t, lang,
        checkSuspension
    } = useApp();

    const API_URL = import.meta.env.VITE_MERCHANTS_API_URL || 'https://api.bigfootws.com';

    const autoBackup = async (currentDiscounts) => {
        if (!user || !user.isLoggedIn) return;
        try {
            let finalDiscounts = currentDiscounts;

            // If SQLite and no discounts passed, query the DB
            if (!db.isFallback && !finalDiscounts) {
                const res = await db.query("SELECT * FROM discounts;");
                finalDiscounts = res.values.map(item => ({
                    ...item,
                    images: JSON.parse(item.images || '[]'),
                    discountCodes: item.discountCodes ? JSON.parse(item.discountCodes) : (item.discountCode ? [item.discountCode] : [''])
                }));
            } else if (!finalDiscounts) {
                finalDiscounts = discounts;
            }

            const payload = {
                userId: user.userId,
                discounts: finalDiscounts,
                settings: { lang, notifTime }
            };

            fetch(`${API_URL}/sync/backup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(data => checkSuspension(data))
                .catch(e => console.warn('Silent auto-backup heartbeat failed'));
        } catch (e) {
            console.warn('Auto-backup logic error', e);
        }
    };

    const performDelete = async (id) => {
        try {
            let newList = null;
            if (db.isFallback) {
                newList = discounts.filter(d => d.id !== id);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`DELETE FROM discounts WHERE id=?`, [id]);
                await refreshData(db, setDiscounts);
            }
            if (LocalNotifications) await LocalNotifications.cancel({ notifications: [{ id: (id % 20000) * 100 }] });
            setSelectedItem(null);
            autoBackup(newList);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('delete') + '?')) return;
        if (await performDelete(id)) {
            notify('已刪除！');
        } else {
            notify('刪除失敗');
        }
    };

    const handleMarkAsUsed = async (item) => {
        if (!window.confirm(t('confirmUsed'))) return;
        const now = new Date().toLocaleString();
        try {
            let newList = null;
            if (db.isFallback) {
                newList = discounts.map(d => d.id === item.id ? { ...d, status: 'used', usedAt: now } : d);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`UPDATE discounts SET status='used', usedAt=? WHERE id=?`, [now, item.id]);
                await refreshData(db, setDiscounts);
            }
            const baseId = (item.id % 20000) * 100;
            const idsToCancel = [];
            for (let i = 0; i < 100; i++) idsToCancel.push({ id: baseId + i });
            if (LocalNotifications) await LocalNotifications.cancel({ notifications: idsToCancel });

            setSelectedItem({ ...item, status: 'used', usedAt: now });
            notify('標記成功！✅');
            autoBackup(newList);
        } catch (e) {
            console.error(e);
            notify('更新失敗');
        }
    };

    const handleMarkAsUnused = async (item) => {
        try {
            let newList = null;
            if (db.isFallback) {
                newList = discounts.map(d => d.id === item.id ? { ...d, status: 'active', usedAt: null } : d);
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                await db.run(`UPDATE discounts SET status='active', usedAt=NULL WHERE id=?`, [item.id]);
                await refreshData(db, setDiscounts);
            }
            scheduleNotifications({ ...item, status: 'active' }, notifTime);
            setSelectedItem({ ...item, status: 'active', usedAt: null });
            notify('已恢復為未使用！✨');
            autoBackup(newList);
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
                    startDate: item.startDate,
                    expiryDate: item.expiryDate,
                    images: item.images,
                    category: item.category || '一般',
                    link: item.link,
                    discountCodes: item.discountCodes,
                    userId: user.userId,
                    nickname: user.nickname,
                    avatar: user.avatar
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (checkSuspension(data)) return;

                const now = new Date().toLocaleString();
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

    const handleBookmark = async (item) => {
        try {
            // Toggle Logic: Check if already bookmarked
            const exists = discounts.find(d => d.title === item.title && d.expiryDate === item.expiryDate);

            if (exists) {
                if (exists.is_readonly === 1) {
                    if (window.confirm(t('removeBookmark') + '?')) {
                        if (await performDelete(exists.id)) {
                            notify(t('removeBookmark') + '!');
                        } else {
                            notify('操作失敗');
                        }
                    }
                } else {
                    notify('此優惠已在您的私人列表！🐻✨');
                }
                return;
            }

            const itemUid = 'community_' + item.id + '_' + Date.now();
            const imagesJson = JSON.stringify(item.images || []);
            const codesJson = JSON.stringify(item.discountCodes || ['']);

            if (db.isFallback) {
                const newList = [...discounts, {
                    id: Date.now(),
                    uid: itemUid,
                    title: item.title,
                    content: item.content,
                    startDate: item.startDate,
                    expiryDate: item.expiryDate,
                    images: item.images || [],
                    discountCodes: item.discountCodes || [''],
                    link: item.link || '',
                    category: item.category || '一般',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    is_readonly: 1,
                    is_community_shared: 0
                }];
                localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
                setDiscounts(newList);
            } else {
                const sql = `INSERT INTO discounts (uid, title, content, startDate, expiryDate, images, discountCodes, link, status, createdAt, is_readonly, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const params = [itemUid, item.title, item.content, item.startDate, item.expiryDate, imagesJson, codesJson, item.link || '', 'active', new Date().toISOString(), 1, item.category || '一般'];
                await db.run(sql, params);
                await refreshData(db, setDiscounts);
            }
            notify('已成功加入私人貼子！🐻💼');
            autoBackup();
        } catch (e) {
            console.error(e);
            notify('儲存失敗');
        }
    };

    return { handleDelete, handleMarkAsUsed, handleMarkAsUnused, handleShare, handleBookmark };
};
