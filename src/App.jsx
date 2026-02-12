import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as NativeApp } from '@capacitor/app';

import { useApp } from './context/AppContext';
import merchantsApi from './services/merchantsApi';
import holidaysApi from './services/holidaysApi';
import { refreshData } from './utils/db';
import { scheduleNotifications, rescheduleAllNotifications } from './utils/notifications';

// Components
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import FAB from './components/layout/FAB';
import Icon from './components/common/Icon';

// Pages
import Home from './pages/Home';
import Community from './pages/Community';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';

// Overlays
import NotificationCenter from './features/notifications/NotificationCenter';
import DiscountDetail from './features/discount/DiscountDetail';
import DiscountForm from './features/discount/DiscountForm';

const App = () => {
  const {
    db, setDb,
    lang, setLang,
    theme,
    discounts, setDiscounts,
    merchants, setMerchants,
    setIsMerchantsLoading,
    activeTab, setActiveTab,
    isEditing, setIsEditing,
    selectedItem, setSelectedItem,
    zoomedImage, setZoomedImage,
    showToast, setShowToast,
    isSyncing, setIsSyncing,
    setFormErrors,
    testCooldown, setTestCooldown,
    notifTime, setNotifTime,
    formData, setFormData,
    notifHistory, setNotifHistory,
    showNotifCenter, setShowNotifCenter,
    viewDate, setHolidays,
    t, notify
  } = useApp();

  const platform = Capacitor.getPlatform();

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [pendingDiscountId, setPendingDiscountId] = useState(null);

  // Notifications History Helper
  const addNotifHistory = (title, body, discountId = null) => {
    const newNotif = {
      id: Date.now(),
      title,
      body,
      discountId,
      time: new Date().toLocaleString(),
      isRead: false
    };
    setNotifHistory(prev => [newNotif, ...prev.slice(0, 49)]);
  };

  // --- 1. 初始化與生命週期 (只在組件掛載時運行一次) ---
  useEffect(() => {
    const initApp = async () => {
      try {
        // 狀態欄設定
        if (platform !== 'web' && StatusBar) {
          StatusBar.setStyle({ style: Style.Light });
          StatusBar.setBackgroundColor({ color: theme.name === 'Pink' ? '#FFF5F7' : '#F0F9FF' });
        }

        // 請求通知權限 (Mobile Only)
        if (platform !== 'web' && LocalNotifications) {
          try {
            const permStatus = await LocalNotifications.checkPermissions();
            console.log('🐻 [Notifications] Permission status:', permStatus.display);
            if (permStatus.display !== 'granted') {
              const result = await LocalNotifications.requestPermissions();
              console.log('🐻 [Notifications] Permission request result:', result.display);
            }
          } catch (err) {
            console.error('🐻 [Notifications] Permission error:', err);
          }
        }

        // 1. 初始化資料庫連線 (Mobile Only)
        let dbConn = null;
        if (platform !== 'web' && SQLiteConnection && CapacitorSQLite) {
          try {
            console.log('🐻 [DB] Initializing SQLite...');
            const sqlite = new SQLiteConnection(CapacitorSQLite);
            const ret = await sqlite.isConnection("jetso_db", false);
            if (ret.result) {
              dbConn = await sqlite.retrieveConnection("jetso_db", false);
            } else {
              dbConn = await sqlite.createConnection("jetso_db", false, "no-encryption", 1);
            }
            await dbConn.open();

            // 建立主表 discounts
            await dbConn.execute(`
              CREATE TABLE IF NOT EXISTS discounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                expiryDate TEXT,
                images TEXT,
                discountCodes TEXT,
                link TEXT,
                status TEXT,
                usedAt TEXT,
                createdAt TEXT,
                notify_1m_weekly INTEGER DEFAULT 1,
                notify_last_7d_daily INTEGER DEFAULT 1,
                is_notify_enabled INTEGER DEFAULT 1,
                category TEXT DEFAULT '積分到期',
                notif_hour TEXT DEFAULT '09',
                notif_min TEXT DEFAULT '00',
                is_community_shared INTEGER DEFAULT 0,
                sharedAt TEXT
              );
            `);

            // 建立 KV Store 表 (用於緩存 holidays 等)
            await dbConn.execute(`
              CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER
              );
            `);

            // Migrations
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN is_notify_enabled INTEGER DEFAULT 1;`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN notif_hour TEXT DEFAULT '09';`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN notif_min TEXT DEFAULT '00';`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN is_community_shared INTEGER DEFAULT 0;`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN sharedAt TEXT;`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN category TEXT DEFAULT '積分到期';`); } catch (e) { }
            try { await dbConn.execute(`ALTER TABLE discounts ADD COLUMN discountCodes TEXT;`); } catch (e) { }

            setDb(dbConn);
          } catch (err) {
            console.error('🐻 [DB Error]:', err);
            setDb({ isFallback: true }); // Fallback on error
          }
        } else {
          // Web / Fallback
          console.log('🐻 [DB] Using Web Fallback (LocalStorage)');
          const saved = localStorage.getItem('sqlite_fallback_data');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setDiscounts(parsed);
              console.log('🐻 [DB] Loaded', parsed.length, 'discounts');
            } catch (e) { setDiscounts([]); }
          }
          setDb({ isFallback: true });
        }

        // 2. 載入商家資料 (並行)
        const loadMerchantsPromise = (async () => {
          try {
            const data = await merchantsApi.getAllMerchants();
            setMerchants(data);
          } catch (e) { console.error('Merchant load error:', e); }
          setIsMerchantsLoading(false);
        })();

        // 3. 載入公眾假期 (優先讀取 SQLite，過期才 Call API)
        const loadHolidaysPromise = (async () => {
          try {
            const year = viewDate.getFullYear();
            let holidayData = [];

            // 嘗試從 DB 讀取緩存 (Mobile) 或 LocalStorage (Web)
            if (dbConn) {
              const res = await dbConn.query(`SELECT value, updated_at FROM kv_store WHERE key = ?`, [`holidays_${year}`]);
              if (res.values && res.values.length > 0) {
                const { value, updated_at } = res.values[0];
                const now = Date.now();
                // 檢查是否過期 (30天 = 2592000000ms)
                if (now - updated_at < 2592000000) {
                  console.log('🐻 [Holidays] Using cached data from SQLite');
                  holidayData = JSON.parse(value);
                }
              }
            } else {
              // Web / Fallback cache
              const saved = localStorage.getItem(`jetso_holidays_${year}`);
              const savedTime = localStorage.getItem(`jetso_holidays_time_${year}`);
              if (saved && savedTime) {
                const now = Date.now();
                if (now - parseInt(savedTime) < 2592000000) {
                  console.log('🐻 [Holidays] Using cached data from LocalStorage');
                  holidayData = JSON.parse(saved);
                }
              }
            }

            // 如果沒有緩存或已過期，則 Fetch API
            if (holidayData.length === 0) {
              console.log('🐻 [Holidays] Fetching from API...');
              const [h1, h2] = await Promise.all([
                holidaysApi.getHolidays(year),
                holidaysApi.getHolidays(year + 1)
              ]);
              holidayData = [...h1, ...h2];

              // 寫入緩存
              if (holidayData.length > 0) {
                const now = Date.now();
                if (dbConn) {
                  await dbConn.run(`INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)`, [`holidays_${year}`, JSON.stringify(holidayData), now]);
                } else {
                  localStorage.setItem(`jetso_holidays_${year}`, JSON.stringify(holidayData));
                  localStorage.setItem(`jetso_holidays_time_${year}`, now.toString());
                }
              }
            }
            setHolidays(holidayData);
          } catch (e) {
            console.error('Holiday load error:', e);
          }
        })();

        // 4. 載入優惠資料 (若是 SQLite)
        if (dbConn) {
          await refreshData(dbConn, setDiscounts);
        }

        // 等待所有關鍵數據完成
        await Promise.all([loadMerchantsPromise, loadHolidaysPromise]);

      } catch (e) {
        console.error('App init failed:', e);
      } finally {
        setTimeout(() => setIsAppLoading(false), 500); // 稍微延遲以展示 Loading 對平滑過渡有幫助
      }
    };

    initApp();
  }, []); // 🚩 只在組件掛載時運行一次

  // --- 2. 監聽器與副作用 ---
  useEffect(() => {
    let receivedSub, actionSub, backSub;
    const setupListeners = async () => {
      if (LocalNotifications) {
        receivedSub = await LocalNotifications.addListener('localNotificationReceived', (notif) => {
          addNotifHistory(notif.title, notif.body, notif.extra?.discountId || null);
        });
        actionSub = await LocalNotifications.addListener('localNotificationActionPerformed', (notif) => {
          const { title, body, extra } = notif.notification;
          addNotifHistory(title, body, extra?.discountId || null);
          if (extra?.discountId) {
            setPendingDiscountId(parseInt(extra.discountId));
          }
        });
      }

      backSub = await NativeApp.addListener('backButton', ({ canGoBack }) => {
        if (zoomedImage) setZoomedImage(null);
        else if (isEditing) setIsEditing(false);
        else if (selectedItem) setSelectedItem(null);
        else if (showNotifCenter) setShowNotifCenter(false);
        else if (activeTab !== 'home') setActiveTab('home');
      });
    };

    setupListeners();

    return () => {
      receivedSub?.remove();
      actionSub?.remove();
      backSub?.remove();
    };
  }, [zoomedImage, isEditing, selectedItem, showNotifCenter, activeTab]);


  // Handle Notification Navigation
  useEffect(() => {
    if (pendingDiscountId !== null && discounts.length > 0) {
      console.log('🐻 [Notification] Navigating to discount:', pendingDiscountId);
      const target = discounts.find(d => d.id === pendingDiscountId);
      if (target) {
        setSelectedItem(target);
        setShowNotifCenter(false);
        setActiveTab('home');
      } else {
        console.warn('🐻 [Notification] Target discount not found:', pendingDiscountId);
      }
      setPendingDiscountId(null);
    }
  }, [pendingDiscountId, discounts, setSelectedItem, setShowNotifCenter, setActiveTab]);

  // Reschedule all notifications when app loads and discounts are ready
  useEffect(() => {
    if (!isAppLoading && discounts.length > 0 && notifTime) {
      console.log('🐻 [App] Rescheduling all notifications on startup...');
      rescheduleAllNotifications(discounts, notifTime);
    }
  }, [isAppLoading]); // Only run once when app finishes loading

  // Cooldown for test notification
  useEffect(() => {
    if (testCooldown > 0) {
      const timer = setInterval(() => setTestCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [testCooldown]);

  const handleSave = async () => {
    const errors = {};
    if (!formData.title) errors.title = true;
    if (!formData.expiryDate) errors.expiryDate = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      notify(t('fillRequired'));
      return;
    }
    setFormErrors({});
    setIsSyncing(true);

    try {
      const imagesJson = JSON.stringify(formData.images);
      const targetId = selectedItem ? selectedItem.id : Date.now();

      if (db.isFallback) {
        let newList;
        if (isEditing && selectedItem) {
          newList = discounts.map(d => d.id === selectedItem.id ? { ...d, ...formData } : d);
        } else {
          newList = [...discounts, { ...formData, id: targetId, status: 'active' }];
        }
        localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
        setDiscounts(newList);
      } else {
        if (isEditing && selectedItem) {
          const sql = `UPDATE discounts SET title=?, content=?, expiryDate=?, images=?, discountCodes=?, link=?, notify_1m_weekly=?, notify_last_7d_daily=?, is_notify_enabled=?, category=?, notif_hour=?, notif_min=?, is_community_shared=? WHERE id=?`;
          const params = [formData.title, formData.content, formData.expiryDate, imagesJson, JSON.stringify(formData.discountCodes), formData.link, formData.notify_1m_weekly, formData.notify_last_7d_daily, formData.is_notify_enabled, formData.category, formData.notif_hour, formData.notif_min, formData.is_community_shared, selectedItem.id];
          await db.run(sql, params);
        } else {
          const sql = `INSERT INTO discounts (title, content, expiryDate, images, discountCodes, link, status, createdAt, notify_1m_weekly, notify_last_7d_daily, is_notify_enabled, category, notif_hour, notif_min, is_community_shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          const params = [formData.title, formData.content, formData.expiryDate, imagesJson, JSON.stringify(formData.discountCodes), formData.link, 'active', new Date().toISOString(), formData.notify_1m_weekly, formData.notify_last_7d_daily, formData.is_notify_enabled, formData.category, formData.notif_hour, formData.notif_min, formData.is_community_shared];
          await db.run(sql, params);
        }
        await refreshData(db, setDiscounts);
      }

      const finalItem = { ...formData, id: parseInt(targetId), status: selectedItem?.status || 'active' };
      scheduleNotifications(finalItem, notifTime);

      // 🚩 修復：確保在狀態更新後才設置當前項目
      setSelectedItem(finalItem);
      setIsEditing(false);
      // Removed: setActiveTab('home');
      notify('儲存成功！✨');
    } catch (e) {
      console.error('🐻 [Storage Error]:', e);
      notify(t('storageError'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestNotification = async () => {
    if (testCooldown > 0) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "測試通知 🔔",
          body: "這是一則來自小熊優惠助手的測試訊息！",
          id: 999,
          schedule: { at: new Date(Date.now() + 2000) },
          smallIcon: "ic_stat_jetso",
          extra: { discountId: null, isTest: true }
        }
      ]
    });
    if (platform === 'web') addNotifHistory("測試通知 🔔", "這是一則來自小熊優惠助手的測試訊息！");
    setTestCooldown(5);
    notify("測試通知將於 2 秒後發送！");
  };

  const handleNotifClick = (notif) => {
    setNotifHistory(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    if (notif.discountId) {
      const targetId = parseInt(notif.discountId);
      const target = discounts.find(d => d.id === targetId);
      if (target) {
        setSelectedItem(target);
        setShowNotifCenter(false);
      } else {
        console.warn('Notification target not found:', notif.discountId);
      }
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto h-screen overflow-hidden flex flex-col relative shadow-md ${theme.bg} transition-all duration-500 font-sans`}>

      {/* 🚀 Feature: App Loading Screen */}
      {isAppLoading && (
        <div className="absolute inset-0 z-[999] bg-white flex flex-col items-center justify-center animate-out fade-out duration-700 fill-mode-forwards">
          <img src="/logo192.png" className="w-24 h-24 mb-6 animate-bounce" alt="Loading..." />
          <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-pink-400 animate-progress w-full origin-left" />
          </div>
          <p className="mt-4 text-xs font-black text-gray-300 tracking-widest uppercase">{t('loading')}</p>
        </div>
      )}

      {/* Toast & Loading Overlay */}
      {(showToast || isSyncing) && (
        <div className="absolute top-[env(safe-area-inset-top,12px)] left-4 right-4 z-[300] bg-gray-900/90 backdrop-blur-md text-white px-4 py-4 rounded-md text-xs font-black shadow-md flex items-center justify-center gap-3 animate-bounce">
          {isSyncing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-md animate-spin" /> : <Icon name="check" size={16} className="text-emerald-400" />}
          {isSyncing ? '正在同步數據...' : showToast}
        </div>
      )}

      <Header />

      <main className="flex-1 overflow-hidden relative">
        {showNotifCenter && (
          <NotificationCenter onNotifClick={handleNotifClick} />
        )}

        {activeTab === 'home' && !selectedItem && !isEditing && !showNotifCenter && (
          <Home />
        )}

        {activeTab === 'calendar' && !selectedItem && !isEditing && !showNotifCenter && (
          <Calendar />
        )}

        {activeTab === 'settings' && !selectedItem && !isEditing && !showNotifCenter && (
          <Settings handleTestNotification={handleTestNotification} />
        )}

        {activeTab === 'community' && !selectedItem && !isEditing && !showNotifCenter && (
          <Community />
        )}

        {isEditing && (
          <DiscountForm onSave={handleSave} />
        )}

        {selectedItem && !isEditing && (
          <DiscountDetail />
        )}
      </main>

      <Navigation />

      {/* FAB */}
      {activeTab === 'home' && !selectedItem && !isEditing && !showNotifCenter && (
        <FAB onAdd={() => {
          setFormData({
            title: '', content: '', expiryDate: '', images: [], discountCodes: [''], link: '',
            notify_1m_weekly: 1, notify_last_7d_daily: 1,
            is_notify_enabled: 1, category: t('catPoints'),
            notif_hour: '09', notif_min: '00',
            is_community_shared: 0
          });
          setFormErrors({});
          setIsEditing(true);
        }} />
      )}

      {/* Image Zoom Portal-like */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-md" alt="Zoomed" />
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { to { opacity: 0; visibility: hidden; } }
        @keyframes progress { 0% { width: 0%; left: 0; } 50% { width: 50%; } 100% { width: 100%; left: 0%; } }
        .animate-disappear { animation: fade-out 0.5s forwards; }
        .animate-progress { animation: progress 1.5s infinite linear; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div >
  );
};

export default App;