import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { checkIsExpired } from './helpers';

export const scheduleNotifications = async (item, notifTime) => {
    if (!LocalNotifications || Capacitor.getPlatform() === 'web') return;

    // We use a base ID and offsets to allow multiple notifications for one item
    // Use a large multiplier to ensure chunks of IDs are reserved for each item
    // LocalNotifications IDs must be 32-bit signed integers (max 2,147,483,647)
    const numericId = typeof item.id === 'number' ? item.id : parseInt(item.id);
    const baseId = (numericId % 100000) * 20;

    // Cancel existing schedules for this base ID range (0-19)
    const idsToCancel = [];
    for (let i = 0; i < 20; i++) idsToCancel.push(baseId + i);
    await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });

    if (item.status === 'used' || checkIsExpired(item.expiryDate) || !item.is_notify_enabled) return;

    // 🚩 優先使用 item 自身的提示時間，否則使用全局設定
    const hr = item.notif_hour || notifTime.hour;
    const min = item.notif_min || notifTime.min;

    const expiryDate = new Date(item.expiryDate.replace(/-/g, '/'));
    expiryDate.setHours(parseInt(hr), parseInt(min), 0);

    const startDate = item.startDate ? new Date(item.startDate.replace(/-/g, '/')) : null;
    if (startDate) startDate.setHours(parseInt(hr), parseInt(min), 0);

    const notifications = [];

    // 1. Day of expiry (ID: baseId + 0)
    notifications.push({
        title: "今日到期！ 🐻",
        body: `「${item.title}」於今天到期，記得在今天內使用呀！`,
        id: baseId,
        schedule: { at: expiryDate },
        actionTypeId: "",
        smallIcon: "ic_stat_jetso",
        extra: { discountId: item.id }
    });

    // 2. Weekly reminders from 1 month before (IDs: baseId + 15 to 18)
    if (item.notify_1m_weekly) {
        for (let i = 1; i <= 4; i++) {
            const date = new Date(expiryDate);
            date.setDate(date.getDate() - (i * 7));
            if (date > new Date()) {
                notifications.push({
                    title: "優惠快到期囉！ 🐻",
                    body: `「${item.title}」還有 ${i} 星期就過期了，快點計劃使用吧！`,
                    id: baseId + 14 + i,
                    schedule: { at: date },
                    actionTypeId: "",
                    smallIcon: "ic_stat_jetso",
                    extra: { discountId: item.id }
                });
            }
        }
    }

    // 3. Daily reminders (IDs: baseId + 1 to 14)
    // Supports "Within range" OR "Last 7 days"
    if (item.notify_last_7d_daily) {
        for (let i = 1; i <= 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            date.setHours(parseInt(hr), parseInt(min), 0);

            if (date >= expiryDate) break; // Don't duplicate expiry day or go beyond

            const diffMs = expiryDate - date;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const isInLastWeek = diffDays <= 7;
            const isInActiveRange = startDate ? (date >= startDate && date <= expiryDate) : false;

            if (isInLastWeek || isInActiveRange) {
                notifications.push({
                    title: isInActiveRange && !isInLastWeek ? "優惠進行中！ 🐻" : "快到期啦！ 🐻",
                    body: isInActiveRange && !isInLastWeek
                        ? `「${item.title}」正在優惠期內，別錯過喔！`
                        : `「${item.title}」還有 ${diffDays} 天就過期了！別忘記它喔～`,
                    id: baseId + i,
                    schedule: { at: date },
                    actionTypeId: "",
                    smallIcon: "ic_stat_jetso",
                    extra: { discountId: item.id }
                });
            }
        }
    }

    if (notifications.length > 0) {
        console.log(`🐻 [Notifications] Scheduling ${notifications.length} notifications for "${item.title}" at ${hr}:${min}`);
        await LocalNotifications.schedule({ notifications });
    }
};

// 重新排程所有活躍優惠的通知
export const rescheduleAllNotifications = async (discounts, notifTime) => {
    if (!LocalNotifications || Capacitor.getPlatform() === 'web') return;

    console.log('🐻 [Notifications] Rescheduling all notifications...');

    const activeDiscounts = discounts.filter(d =>
        d.status !== 'used' &&
        !checkIsExpired(d.expiryDate) &&
        d.is_notify_enabled
    );

    for (const discount of activeDiscounts) {
        await scheduleNotifications(discount, notifTime);
    }

    console.log(`🐻 [Notifications] Rescheduled ${activeDiscounts.length} active discounts`);
};
