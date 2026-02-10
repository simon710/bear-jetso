import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';


// --- 1. 核心邏輯與工具函數 ---

const compressImage = (base64Str, maxWidth = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const checkIsExpired = (dateStr) => {
  if (!dateStr) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr.replace(/-/g, '/'));
    return target < today;
  } catch (e) { return false; }
};

const checkIsSoonExpiring = (dateStr) => {
  if (!dateStr) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr.replace(/-/g, '/'));
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  } catch (e) { return false; }
};

const getStatus = (item) => {
  if (!item) return 'active';
  if (item.status === 'used') return 'used';
  if (checkIsExpired(item.expiryDate)) return 'expired';
  return 'active';
};

import translations from './data/translations.json';
import themes from './data/themes.json';
import merchantsApi from './services/merchantsApi';

const t = (key, lang) => translations[lang][key] || key;

// --- 2. 圖標組件 ---
const Icon = ({ name, size = 24, className = "" }) => {
  const icons = {
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9m4.35 13a2.41 2.41 0 0 0 4.3 0" />,
    calendar: <><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
    plus: <><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></>,
    trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    x: <><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
    edit: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
    sort: <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4" />,
    upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
    externalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

const App = () => {
  const [db, setDb] = useState(null);
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState(themes.pink);
  const [discounts, setDiscounts] = useState([]);
  const [merchants, setMerchants] = useState([]); // 從 API 獲取的商家數據
  const [isMerchantsLoading, setIsMerchantsLoading] = useState(true); // 商家數據加載狀態
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

  const [notifTime, setNotifTime] = useState({
    hour: localStorage.getItem('jetso_notif_hr') || '09',
    min: localStorage.getItem('jetso_notif_min') || '00'
  });

  const [formData, setFormData] = useState({
    title: '', content: '', expiryDate: '', images: [], discountCodes: [''], link: '',
    notify_1m_weekly: 1, notify_last_7d_daily: 1,
    is_notify_enabled: 1, category: t('catPoints', 'zh')
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

  const fileInputRef = useRef(null);

  // Persistence for notifications
  useEffect(() => {
    localStorage.setItem('jetso_notifs_v1', JSON.stringify(notifHistory));
  }, [notifHistory]);

  const addNotifHistory = (title, body, discountId = null) => {
    const newEntry = {
      id: Date.now(),
      title,
      body,
      discountId,
      time: new Date().toLocaleString(),
      isRead: false
    };
    setNotifHistory(prev => [newEntry, ...prev].slice(0, 50));
  };

  // 從 AWS API 加載商家數據
  useEffect(() => {
    const loadMerchants = async () => {
      try {
        setIsMerchantsLoading(true);
        console.log('正在從 AWS API 加載商家數據...');
        const data = await merchantsApi.getAllMerchants();
        setMerchants(data);
        console.log(`✅ 成功加載 ${data.length} 個商家`);
      } catch (error) {
        console.error('❌ 加載商家數據失敗:', error);
        setMerchants([]); // 失敗時使用空數組
      } finally {
        setIsMerchantsLoading(false);
      }
    };

    loadMerchants();
  }, []); // 只在組件掛載時執行一次


  // --- 3. 初始化與原生功能 ---
  useEffect(() => {
    const initApp = async () => {
      const platform = Capacitor.getPlatform();

      if (LocalNotifications) {
        await LocalNotifications.requestPermissions();
      }

      if (platform !== 'web') {
        try {
          await StatusBar.setStyle({ style: Style.Light });
        } catch (e) {
          console.log('StatusBar error', e);
        }
      }

      if (platform === 'web' || !SQLiteConnection || !CapacitorSQLite) {
        const saved = localStorage.getItem('sqlite_fallback_data');
        if (saved) {
          try { setDiscounts(JSON.parse(saved)); } catch (e) { setDiscounts([]); }
        }
        setDb({ isFallback: true });
        return;
      }

      try {
        console.log('🐻 [DB] Initializing SQLite...');
        const sqlite = new SQLiteConnection(CapacitorSQLite);

        // 檢查是否已有連接
        const ret = await sqlite.isConnection("jetso_db", false);
        let dbConn;
        if (ret.result) {
          dbConn = await sqlite.retrieveConnection("jetso_db", false);
        } else {
          dbConn = await sqlite.createConnection("jetso_db", false, "no-encryption", 1);
        }

        await dbConn.open();
        console.log('🐻 [DB] Connection opened');

        const createTableQuery = `
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
            category TEXT DEFAULT '積分到期'
          );
        `;
        await dbConn.execute(createTableQuery);

        // Simple migration to add missing columns
        try {
          await dbConn.execute(`ALTER TABLE discounts ADD COLUMN is_notify_enabled INTEGER DEFAULT 1;`);
        } catch (e) { }
        try {
          await dbConn.execute(`ALTER TABLE discounts ADD COLUMN category TEXT DEFAULT '積分到期';`);
        } catch (e) { }
        try {
          await dbConn.execute(`ALTER TABLE discounts ADD COLUMN discountCodes TEXT;`);
        } catch (e) { }

        setDb(dbConn);

        const res = await dbConn.query("SELECT * FROM discounts;");
        const loadedData = res.values.map(item => ({
          ...item,
          images: JSON.parse(item.images || '[]')
        }));
        setDiscounts(loadedData);
        console.log('🐻 [DB] Data loaded:', loadedData.length);
      } catch (err) {
        console.error('🐻 [DB Error]:', err);
        setDb({ isFallback: true });
      }
    };

    let receivedSub, actionSub;
    const setupListeners = async () => {
      if (LocalNotifications) {
        receivedSub = await LocalNotifications.addListener('localNotificationReceived', (notif) => {
          addNotifHistory(notif.title, notif.body, notif.extra?.discountId || null);
        });
        actionSub = await LocalNotifications.addListener('localNotificationActionPerformed', (notif) => {
          const { title, body, extra } = notif.notification;
          addNotifHistory(title, body, extra?.discountId || null);
        });
      }
    };

    initApp();
    setupListeners();

    return () => {
      if (receivedSub && typeof receivedSub.remove === 'function') receivedSub.remove();
      if (actionSub && typeof actionSub.remove === 'function') actionSub.remove();
    };
  }, []);

  const notify = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Cooldown timer effect
  useEffect(() => {
    if (testCooldown > 0) {
      const timer = setTimeout(() => setTestCooldown(testCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [testCooldown]);

  // Reschedule all active discounts when notification time changes
  useEffect(() => {
    if (discounts.length > 0 && LocalNotifications) {
      const activeItems = discounts.filter(d => d.status === 'active' && !checkIsExpired(d.expiryDate));
      activeItems.forEach(item => scheduleNotifications(item));
    }
  }, [notifTime.hour, notifTime.min]);

  /**
   * 原生通知配置提示：
   * 1. 在 android/app/src/main/res/drawable/ 加入圖標 (如 ic_stat_jetso.png)
   * 2. 在 capacitor.config.json 的 plugins 加入:
   * "LocalNotifications": { "smallIcon": "ic_stat_jetso", "iconColor": "#FF69B4" }
   */
  const scheduleNotifications = async (item) => {
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

    const expiryDate = new Date(item.expiryDate.replace(/-/g, '/'));
    expiryDate.setHours(parseInt(notifTime.hour), parseInt(notifTime.min), 0);

    const notifications = [];

    // 1. Day of expiry
    notifications.push({
      title: "今日到期！ 🐻",
      body: `「${item.title}」於今天到期，記得在今天內使用呀！`,
      id: baseId,
      schedule: { at: expiryDate },
      actionTypeId: "",
      smallIcon: "ic_stat_jetso",
      extra: { discountId: item.id }
    });

    // 2. Weekly reminders from 1 month before (notif1)
    if (item.notify_1m_weekly) {
      for (let i = 1; i <= 4; i++) {
        const date = new Date(expiryDate);
        date.setDate(date.getDate() - (i * 7));
        if (date > new Date()) {
          notifications.push({
            title: "優惠快到期囉！ 🐻",
            body: `「${item.title}」還有 ${i} 星期就過期了，快點計劃使用吧！`,
            id: baseId + 10 + i,
            schedule: { at: date },
            actionTypeId: "",
            smallIcon: "ic_stat_jetso",
            extra: { discountId: item.id }
          });
        }
      }
    }

    // 3. Daily reminders in last week (notif2)
    if (item.notify_last_7d_daily) {
      for (let i = 1; i <= 6; i++) {
        const date = new Date(expiryDate);
        date.setDate(date.getDate() - i);
        if (date > new Date()) {
          notifications.push({
            title: "快到期啦！ 🐻",
            body: `「${item.title}」還有 ${i} 天就過期了！別忘記它喔～`,
            id: baseId + i,
            schedule: { at: date },
            actionTypeId: "",
            smallIcon: "ic_stat_jetso",
            extra: { discountId: item.id }
          });
        }
      }
    }

    await LocalNotifications.schedule({ notifications });
  };

  const handleTestNotification = async () => {
    if (testCooldown > 0) return;

    if (!LocalNotifications) {
      notify("Web 版暫不支援原生通知測試");
      return;
    }

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

    if (Capacitor.getPlatform() === 'web') {
      addNotifHistory("測試通知 🔔", "這是一則來自小熊優惠助手的測試訊息！");
    }

    // Native platforms will handle this via the 'localNotificationReceived' listener
    setTestCooldown(5);
    notify("測試通知將於 2 秒後發送！");
  };

  const refreshData = async (currentDb) => {
    if (!currentDb) return;
    if (currentDb.isFallback) {
      const saved = localStorage.getItem('sqlite_fallback_data');
      if (saved) setDiscounts(JSON.parse(saved));
      return;
    }
    const res = await currentDb.query("SELECT * FROM discounts;");
    setDiscounts(res.values.map(item => ({
      ...item,
      images: JSON.parse(item.images || '[]'),
      discountCodes: item.discountCodes ? JSON.parse(item.discountCodes) : (item.discountCode ? [item.discountCode] : [''])
    })));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      notify('正在壓縮圖片...📸');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setFormData(prev => ({ ...prev, images: [...prev.images, compressed] }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.title) errors.title = true;
    if (!formData.expiryDate) errors.expiryDate = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      notify(t('fillRequired', lang));
      return;
    }
    setFormErrors({});

    setIsSyncing(true);
    try {
      const imagesJson = JSON.stringify(formData.images);
      let targetId = selectedItem ? selectedItem.id : Date.now();

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
          const sql = `UPDATE discounts SET title=?, content=?, expiryDate=?, images=?, discountCodes=?, link=?, notify_1m_weekly=?, notify_last_7d_daily=?, is_notify_enabled=?, category=? WHERE id=?`;
          const params = [formData.title, formData.content, formData.expiryDate, imagesJson, JSON.stringify(formData.discountCodes), formData.link, formData.notify_1m_weekly, formData.notify_last_7d_daily, formData.is_notify_enabled, formData.category, selectedItem.id];
          await db.run(sql, params);
        } else {
          const sql = `INSERT INTO discounts (title, content, expiryDate, images, discountCodes, link, status, createdAt, notify_1m_weekly, notify_last_7d_daily, is_notify_enabled, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          const params = [formData.title, formData.content, formData.expiryDate, imagesJson, JSON.stringify(formData.discountCodes), formData.link, 'active', new Date().toISOString(), formData.notify_1m_weekly, formData.notify_last_7d_daily, formData.is_notify_enabled, formData.category];
          await db.run(sql, params);
        }
        await refreshData(db);
      }

      scheduleNotifications({ ...formData, id: targetId, status: 'active' });

      setIsEditing(false);
      setSelectedItem(null);
      setActiveTab('home');
      notify('儲存成功！✨');
    } catch (e) {
      console.error('🐻 [Storage Error]:', e);
      notify(t('storageError', lang));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('delete', lang) + '?')) return;
    try {
      if (db.isFallback) {
        const newList = discounts.filter(d => d.id !== id);
        localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
        setDiscounts(newList);
      } else {
        await db.run(`DELETE FROM discounts WHERE id=?`, [id]);
        await refreshData(db);
      }
      if (LocalNotifications) await LocalNotifications.cancel({ notifications: [{ id }] });
      setSelectedItem(null);
      notify('已刪除！');
    } catch (e) {
      notify('刪除失敗');
    }
  };

  const handleMarkAsUsed = async () => {
    const now = new Date().toLocaleString();
    try {
      if (db.isFallback) {
        const newList = discounts.map(d => d.id === selectedItem.id ? { ...d, status: 'used', usedAt: now } : d);
        localStorage.setItem('sqlite_fallback_data', JSON.stringify(newList));
        setDiscounts(newList);
      } else {
        await db.run(`UPDATE discounts SET status='used', usedAt=? WHERE id=?`, [now, selectedItem.id]);
        await refreshData(db);
      }
      if (LocalNotifications) await LocalNotifications.cancel({ notifications: [{ id: selectedItem.id }] });
      setSelectedItem({ ...selectedItem, status: 'used', usedAt: now });
      notify('標記成功！✅');
    } catch (e) {
      notify('更新失敗');
    }
  };

  const filteredAndSorted = useMemo(() => {
    return [...discounts]
      .filter(d => getStatus(d) === homeFilter)
      .sort((a, b) => {
        const dateA = new Date(a.expiryDate.replace(/-/g, '/'));
        const dateB = new Date(b.expiryDate.replace(/-/g, '/'));
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [discounts, homeFilter, sortOrder]);

  // Calendar helper - generate days for a month (42 cells for 6 weeks)
  const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length < 42) days.push(null);
    return days;
  };

  const DiagonalTag = ({ text, colorClass }) => (
    <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden pointer-events-none z-10">
      <div className={`absolute top-4 -right-7 w-28 py-1 rotate-45 text-center text-[11px] font-black text-white shadow-md ${colorClass} flex items-center justify-center`}>
        <span className="w-full text-center leading-none inline-block uppercase tracking-tight">{text}</span>
      </div>
    </div>
  );

  const hasUnread = notifHistory.some(n => !n.isRead);

  const handleNotifClick = (notif) => {
    setNotifHistory(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    if (notif.discountId) {
      const target = discounts.find(d => d.id === notif.discountId);
      if (target) {
        setSelectedItem(target);
        setShowNotifCenter(false);
      }
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto h-screen overflow-hidden flex flex-col relative shadow-md ${theme.bg} transition-all duration-500 font-sans`}>

      {/* Toast & Loading */}
      {(showToast || isSyncing || isMerchantsLoading) && (
        <div className="absolute top-[env(safe-area-inset-top,12px)] left-6 right-6 z-[300] bg-gray-900/90 backdrop-blur-md text-white px-6 py-4 rounded-md text-xs font-black shadow-md flex items-center justify-center gap-3 animate-bounce">
          {(isSyncing || isMerchantsLoading) ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-md animate-spin" /> : <Icon name="check" size={16} className="text-emerald-400" />}
          {isSyncing ? '正在同步數據...' : (isMerchantsLoading ? '正在獲取雲端商家資料...' : showToast)}
        </div>
      )}

      {/* Header - 加入 Safe Area Top */}
      <header className={`pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 px-6 flex items-center justify-between ${theme.bg} shrink-0 border-b border-black/5`}>
        <div className="flex items-center gap-3">
          {(selectedItem || isEditing) && (
            <button onClick={() => { setIsEditing(false); setSelectedItem(null); }} className="p-2 rounded-md bg-white shadow-sm active:scale-90 transition-all">
              <Icon name="chevronLeft" size={18} className={theme.text} />
            </button>
          )}
          <h1 className={`text-xl font-black ${theme.text} uppercase tracking-tight`}>
            {isEditing ? t('edit', lang) : (selectedItem ? t('detail', lang) : (showNotifCenter ? t('notifHistory', lang) : t(activeTab, lang)))}
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
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {/* Notification Center */}
        {showNotifCenter && !selectedItem && !isEditing && (
          <div className="h-full flex flex-col bg-white animate-in slide-in-from-right duration-300">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-hide">
              {notifHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic"><p>{t('noNotif', lang)}</p></div>
              ) : (
                notifHistory.map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n)} className={`p-4 rounded-md transition-all cursor-pointer border-2 ${n.isRead ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-pink-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-black text-xs ${n.isRead ? 'text-gray-500' : theme.text}`}>{n.title}</h4>
                      <span className="text-[8px] font-bold text-gray-300">{n.time}</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed font-bold ${n.isRead ? 'text-gray-400' : 'text-gray-600'}`}>{n.body}</p>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setNotifHistory([])} className="m-6 p-4 rounded-md bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest">{t('resetData', lang)}</button>
          </div>
        )}

        {/* Home Tab */}
        {
          !selectedItem && !isEditing && !showNotifCenter && activeTab === 'home' && (
            <div className="h-full flex flex-col">
              <div className="px-6 py-5 flex flex-col gap-4 shrink-0">
                <div className="flex gap-3 h-14">
                  {['active', 'used', 'expired'].map(f => (
                    <button key={f} onClick={() => setHomeFilter(f)} className={`flex-1 rounded-md text-xs font-black transition-all shadow-sm ${homeFilter === f ? theme.primary + ' text-white scale-105 shadow-md' : 'bg-white text-gray-400'}`}>{t(f, lang)}</button>
                  ))}
                </div>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="bg-white/80 backdrop-blur-sm border-2 border-white rounded-md py-3 px-4 flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 shadow-sm">
                  <Icon name="sort" size={14} className={theme.text} /> {sortOrder === 'asc' ? t('sortSoon', lang) : t('sortLate', lang)}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-24 scrollbar-hide">
                {filteredAndSorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic"><p>{t('empty', lang)}</p></div>
                ) : (
                  filteredAndSorted.map(item => {
                    const status = getStatus(item);
                    const isSoon = status === 'active' && checkIsSoonExpiring(item.expiryDate);
                    const merchant = merchants.find(m => m.name === item.title || m.name_en === item.title);

                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)} className={`bg-white rounded-md p-4 shadow-sm flex gap-4 cursor-pointer active:scale-95 transition-all relative overflow-hidden border-2 border-transparent hover:border-pink-100 ${status !== 'active' ? 'grayscale opacity-70' : ''}`}>
                        {status === 'expired' && <DiagonalTag text={t('tagExpired', lang)} colorClass="bg-gray-400" />}
                        {status === 'used' && <DiagonalTag text={t('tagUsed', lang)} colorClass="bg-gray-500" />}
                        {isSoon && <DiagonalTag text={t('tagSoon', lang)} colorClass="bg-rose-500" />}

                        <div className="w-16 h-16 rounded-md bg-gray-50 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center p-1">
                          {merchant?.logo ? (
                            <img src={merchant.logo} className="w-full h-full object-contain rounded-md" />
                          ) : item.images?.[0] ? (
                            <img src={item.images[0]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200"><Icon name="camera" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${theme.secondary} ${theme.text}`}>{item.category || t('catPoints', lang)}</span>
                            <h3 className="font-bold text-gray-800 text-base truncate flex-1">{item.title}</h3>
                          </div>
                          <p className={`text-[10px] font-black mt-1 ${isSoon ? 'text-rose-500' : 'text-gray-400'}`}>{item.expiryDate} {t('expiry', lang)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        }

        {/* Calendar Tab - 全新設計 */}
        {
          !selectedItem && !isEditing && !showNotifCenter && activeTab === 'calendar' && (
            <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
              {/* Header with Month/Year and Navigation */}
              <div className="px-6 py-6 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">
                    {viewDate.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-US', { month: 'long' })}
                  </h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">{viewDate.getFullYear()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                    className="w-10 h-10 rounded-md bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Icon name="chevronLeft" size={20} />
                  </button>
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                    className="w-10 h-10 rounded-md bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Icon name="chevronRight" size={20} />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 px-6 mt-4 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                  <div key={i} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid - with Drag Support */}
              <div
                className="px-6 pb-4 shrink-0 touch-none select-none"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  window.calendarDragStart = touch.clientX;
                  window.calendarDragTime = Date.now();
                }}
                onTouchMove={(e) => {
                  if (!window.calendarDragStart) return;
                  const touch = e.touches[0];
                  const dx = touch.clientX - window.calendarDragStart;
                  // Visual feedback could be added here if desired
                }}
                onTouchEnd={(e) => {
                  if (!window.calendarDragStart) return;
                  const touch = e.changedTouches[0];
                  const dx = touch.clientX - window.calendarDragStart;
                  const dt = Date.now() - window.calendarDragTime;
                  const velocity = Math.abs(dx) / dt;

                  // Swipe right = previous month, Swipe left = next month
                  if (Math.abs(dx) > 50 || velocity > 0.3) {
                    if (dx > 0) {
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
                    } else {
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
                    }
                  }

                  window.calendarDragStart = null;
                  window.calendarDragTime = null;
                }}
                onMouseDown={(e) => {
                  window.calendarDragStart = e.clientX;
                  window.calendarDragTime = Date.now();
                  window.calendarMouseDown = true;
                }}
                onMouseMove={(e) => {
                  if (!window.calendarMouseDown) return;
                  // Visual feedback could be added here
                }}
                onMouseUp={(e) => {
                  if (!window.calendarMouseDown) return;
                  const dx = e.clientX - window.calendarDragStart;
                  const dt = Date.now() - window.calendarDragTime;
                  const velocity = Math.abs(dx) / dt;

                  if (Math.abs(dx) > 50 || velocity > 0.3) {
                    if (dx > 0) {
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
                    } else {
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
                    }
                  }

                  window.calendarMouseDown = false;
                  window.calendarDragStart = null;
                  window.calendarDragTime = null;
                }}
                onMouseLeave={() => {
                  window.calendarMouseDown = false;
                  window.calendarDragStart = null;
                  window.calendarDragTime = null;
                }}
              >
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()).map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

                    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasDiscount = discounts.some(d => d.expiryDate === dateStr);
                    const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
                    const isSelected = selectedDay === day;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className="aspect-square relative flex items-center justify-center rounded-md transition-all hover:bg-gray-50"
                      >
                        {isSelected && (
                          <div className={`absolute inset-0 rounded-md ${theme.primary} shadow-md`} />
                        )}
                        <span className={`relative text-sm font-bold z-10 ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                          {day}
                        </span>
                        {hasDiscount && (
                          <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-md ${isSelected ? 'bg-white' : theme.accent} shadow-sm`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discount List for Selected Day */}
              <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3 scrollbar-hide">
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-white/80 backdrop-blur-sm py-3 -mx-6 px-6">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    {viewDate.getMonth() + 1}/{selectedDay} {t('expiryJetso', lang)}
                  </h3>
                  <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-black text-gray-500">
                    {discounts.filter(d => d.expiryDate === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).length}
                  </span>
                </div>

                {discounts
                  .filter(d => d.expiryDate === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)
                  .map(item => {
                    const merchant = merchants.find(m => m.name === item.title || m.name_en === item.title);
                    const status = getStatus(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-md p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-md bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                          {merchant?.logo ? (
                            <img src={merchant.logo} alt="" className="w-full h-full object-contain" />
                          ) : item.images?.[0] ? (
                            <img src={item.images[0]} alt="" className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <Icon name="gift" size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm mb-1 truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-md font-black ${theme.secondary} ${theme.text}`}>
                              {item.category}
                            </span>
                            <span className="text-gray-400 font-bold">{t(status, lang)}</span>
                          </div>
                        </div>
                        <Icon name="chevronRight" size={18} className="text-gray-300" />
                      </div>
                    );
                  })}

                {discounts.filter(d => d.expiryDate === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center mb-4">
                      <Icon name="calendar" size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-400">{t('empty', lang)}</p>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* Edit/Add Form */}
        {
          isEditing && (
            <div className="h-full overflow-y-auto p-6 pb-24 space-y-5 bg-white scrollbar-hide">
              <div className="space-y-1 relative">
                <label className={`text-[10px] font-black ${formErrors.title ? 'text-rose-600' : 'text-gray-400'} ml-2 uppercase tracking-widest`}>{t('titleLabel', lang)} *</label>
                <div className={`flex items-center gap-3 bg-gray-50 rounded-md p-4 border-2 ${formErrors.title ? 'border-rose-500' : 'border-transparent'} focus-within:border-pink-200 transition-all`}>
                  {merchants.find(m => m.name === formData.title || m.name_en === formData.title)?.logo && (
                    <img src={merchants.find(m => m.name === formData.title || m.name_en === formData.title).logo} className="w-8 h-8 object-contain rounded-md" />
                  )}
                  <input
                    value={formData.title}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, title: val });
                      if (val) setFormErrors(prev => ({ ...prev, title: false }));
                      if (val.length > 0) {
                        const filtered = merchants
                          .filter(m =>
                            m.name.toLowerCase().includes(val.toLowerCase()) ||
                            m.name_en.toLowerCase().includes(val.toLowerCase())
                          )
                          .sort((a, b) => {
                            const a_zh = a.name.toLowerCase().startsWith(val.toLowerCase());
                            const a_en = a.name_en.toLowerCase().startsWith(val.toLowerCase());
                            const b_zh = b.name.toLowerCase().startsWith(val.toLowerCase());
                            const b_en = b.name_en.toLowerCase().startsWith(val.toLowerCase());
                            if ((a_zh || a_en) && !(b_zh || b_en)) return -1;
                            if (!(a_zh || a_en) && (b_zh || b_en)) return 1;
                            return 0;
                          });
                        window.autocompleteList = filtered;
                      } else {
                        window.autocompleteList = [];
                      }
                    }}
                    onFocus={() => {
                      if (formData.title) {
                        const filtered = merchants
                          .filter(m =>
                          (m.name.toLowerCase().includes(formData.title.toLowerCase()) ||
                            m.name_en.toLowerCase().includes(formData.title.toLowerCase()))
                          )
                          .sort((a, b) => {
                            const val = formData.title.toLowerCase();
                            const a_starts = a.name.toLowerCase().startsWith(val) || a.name_en.toLowerCase().startsWith(val);
                            const b_starts = b.name.toLowerCase().startsWith(val) || b.name_en.toLowerCase().startsWith(val);
                            if (a_starts && !b_starts) return -1;
                            if (!a_starts && b_starts) return 1;
                            return 0;
                          });
                        window.autocompleteList = filtered;
                      }
                    }}
                    onBlur={() => setTimeout(() => { window.autocompleteList = []; setDragOffset(dragOffset + 0.0001); }, 200)}
                    className="flex-1 bg-transparent outline-none font-bold"
                    placeholder="輸入商店名稱..."
                  />
                </div>
                {window.autocompleteList?.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[200] bg-white rounded-md shadow-md border border-gray-100 mt-1 max-h-48 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    {window.autocompleteList.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFormData({ ...formData, title: lang === 'zh' ? m.name : m.name_en });
                          window.autocompleteList = [];
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md transition-all"
                      >
                        <img src={m.logo} className="w-6 h-6 object-contain rounded-md" />
                        <span className="text-xs font-bold text-gray-700">{lang === 'zh' ? m.name : m.name_en}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('categoryLabel', lang)}</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none font-bold transition-all appearance-none cursor-pointer"
                  >
                    {['catPoints', 'catMall', 'catFnb', 'catGift', 'catStation', 'catCode', 'catTravel', 'catOther'].map(cat => (
                      <option key={cat} value={t(cat, lang)}>{t(cat, lang)}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 rotate-90">
                    <Icon name="chevronRight" size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black ${formErrors.expiryDate ? 'text-rose-600' : 'text-gray-400'} ml-2 uppercase tracking-widest`}>{t('expiry', lang)} *</label>
                <input type="date" value={formData.expiryDate} onChange={e => { setFormData({ ...formData, expiryDate: e.target.value }); if (e.target.value) setFormErrors(prev => ({ ...prev, expiryDate: false })); }} className={`w-full bg-gray-50 rounded-md p-4 border-2 ${formErrors.expiryDate ? 'border-rose-500' : 'border-transparent'} focus:border-pink-200 outline-none font-bold transition-all`} />
              </div>

              {/* 優惠碼 Dynamic Inputs - Only if category is catCode */}
              {formData.category === t('catCode', lang) && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('discountCode', lang)}</label>
                    <button
                      onClick={() => setFormData({ ...formData, discountCodes: [...formData.discountCodes, ''] })}
                      className={`flex items-center gap-1 text-[10px] font-bold ${theme.text}`}
                    >
                      <Icon name="plus" size={14} /> 新增
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.discountCodes.map((code, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={code}
                          onChange={e => {
                            const newCodes = [...formData.discountCodes];
                            newCodes[idx] = e.target.value;
                            setFormData({ ...formData, discountCodes: newCodes });
                          }}
                          className="flex-1 bg-white rounded-md px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-pink-100 outline-none transition-all"
                          placeholder={`優惠碼 ${idx + 1}`}
                        />
                        {formData.discountCodes.length > 1 && (
                          <button
                            onClick={() => setFormData({ ...formData, discountCodes: formData.discountCodes.filter((_, i) => i !== idx) })}
                            className="bg-rose-50 text-rose-400 p-2 rounded-md active:scale-90 transition-all"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('contentLabel', lang)}</label>
                <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none h-24 transition-all scrollbar-hide" />
              </div>

              {/* 通知勾選框 */}
              <div className="p-4 bg-gray-50 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Icon name="bell" size={14} className={theme.text} /> {t('noticeSet', lang)}
                  </label>
                  <button
                    onClick={() => {
                      const newValue = formData.is_notify_enabled ? 0 : 1;
                      setFormData({ ...formData, is_notify_enabled: newValue });
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${formData.is_notify_enabled ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-white'}`}
                  >
                    {t('notifToggle', lang)}: {formData.is_notify_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {formData.is_notify_enabled === 1 && (
                  <div className="space-y-2 animate-in fade-in">
                    <button onClick={() => setFormData({ ...formData, notify_1m_weekly: formData.notify_1m_weekly ? 0 : 1 })} className={`w-full p-3 flex items-center gap-3 rounded-md border-2 transition-all ${formData.notify_1m_weekly ? theme.secondary + ' border-transparent' : 'bg-white border-gray-100'}`}>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${formData.notify_1m_weekly ? theme.primary : 'bg-gray-200'}`}>{formData.notify_1m_weekly === 1 && <Icon name="check" size={14} className="text-white" />}</div>
                      <span className={`text-xs font-bold ${formData.notify_1m_weekly ? theme.text : 'text-gray-400'}`}>{t('notif1', lang)}</span>
                    </button>
                    <button onClick={() => setFormData({ ...formData, notify_last_7d_daily: formData.notify_last_7d_daily ? 0 : 1 })} className={`w-full p-3 flex items-center gap-3 rounded-md border-2 transition-all ${formData.notify_last_7d_daily ? theme.secondary + ' border-transparent' : 'bg-white border-gray-100'}`}>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${formData.notify_last_7d_daily ? theme.primary : 'bg-gray-200'}`}>{formData.notify_last_7d_daily === 1 && <Icon name="check" size={14} className="text-white" />}</div>
                      <span className={`text-xs font-bold ${formData.notify_last_7d_daily ? theme.text : 'text-gray-400'}`}>{t('notif2', lang)}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('media', lang)}</label>
                <button onClick={() => fileInputRef.current?.click()} className={`w-full py-5 rounded-md border-2 border-dashed ${theme.border} flex items-center justify-center gap-3 text-gray-400 font-bold text-sm bg-gray-50`}>
                  <Icon name="upload" size={20} className={theme.text} /> {t('uploadImage', lang)}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                <div className="grid grid-cols-3 gap-3">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden shadow-sm border-2 border-white">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-rose-500 text-white rounded-md p-1 shadow-md active:scale-75"><Icon name="x" size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} className={`w-full py-5 rounded-md ${theme.primary} text-white font-black shadow-md mt-6 active:scale-95 transition-all`}>
                {t('save', lang)} ✨
              </button>
            </div>
          )
        }

        {/* Details View */}
        {
          selectedItem && !isEditing && (
            <div className="h-full overflow-y-auto p-8 pb-24 space-y-6 bg-white animate-in slide-in-from-right duration-300 scrollbar-hide relative overflow-hidden">
              {getStatus(selectedItem) === 'expired' && <DiagonalTag text={t('tagExpired', lang)} colorClass="bg-gray-400" />}
              {getStatus(selectedItem) === 'used' && <DiagonalTag text={t('tagUsed', lang)} colorClass="bg-gray-500" />}
              {getStatus(selectedItem) === 'active' && checkIsSoonExpiring(selectedItem.expiryDate) && <DiagonalTag text={t('tagSoon', lang)} colorClass="bg-rose-500" />}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-4 py-1 rounded-md text-[9px] font-black uppercase ${getStatus(selectedItem) === 'active' ? theme.primary + ' text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                    {t(getStatus(selectedItem), lang)}
                  </span>
                  <span className={`px-4 py-1 rounded-md text-[9px] font-black uppercase ${theme.secondary} ${theme.text} shadow-sm`}>
                    {selectedItem.category || t('catPoints', lang)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {merchants.find(m => m.name === selectedItem.title || m.name_en === selectedItem.title)?.logo && (
                    <div className="w-12 h-12 bg-white rounded-md shadow-sm border border-gray-100 p-2 shrink-0">
                      <img src={merchants.find(m => m.name === selectedItem.title || m.name_en === selectedItem.title).logo} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <h2 className="text-3xl font-black text-gray-800 leading-tight">{selectedItem.title}</h2>
                </div>
              </div>
              {selectedItem.images?.length > 0 && (
                <div className="rounded-md overflow-hidden shadow-md border-4 border-white">
                  <img src={selectedItem.images[0]} className="w-full aspect-video object-cover" onClick={() => setZoomedImage(selectedItem.images[0])} />
                </div>
              )}
              <div className="bg-gray-50 p-7 rounded-md space-y-5 border-2 border-white shadow-inner">
                <p className="text-gray-600 text-sm leading-relaxed">{selectedItem.content}</p>
                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-200/50">
                  <div><p className="text-[10px] font-black text-gray-300 uppercase">{t('expiry', lang)}</p><p className="font-black text-gray-700">{selectedItem.expiryDate}</p></div>
                  {(selectedItem.discountCodes?.length > 0 && selectedItem.discountCodes[0]) && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-gray-300 uppercase mb-2">{t('discountCode', lang)}</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedItem.discountCodes.map((code, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              if (Capacitor.isNativePlatform()) {
                                // Native copy
                                navigator.clipboard.writeText(code);
                              } else {
                                // Web copy
                                navigator.clipboard.writeText(code);
                              }
                              notify(t('copied', lang));
                            }}
                            className="px-5 py-3 bg-white border-2 border-pink-100 rounded-md font-black text-pink-600 text-lg shadow-sm flex items-center gap-2 active:scale-90 transition-all cursor-pointer"
                          >
                            <Icon name="copy" size={18} />
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!selectedItem.discountCodes && selectedItem.discountCode) && (
                    <div><p className="text-[10px] font-black text-gray-300 uppercase">{t('discountCode', lang)}</p><p className="font-black text-gray-700 truncate">{selectedItem.discountCode}</p></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {selectedItem.status !== 'used' && !checkIsExpired(selectedItem.expiryDate) && (
                  <button onClick={handleMarkAsUsed} className={`w-full py-5 rounded-md ${theme.primary} text-white font-black shadow-md active:scale-95 transition-all text-lg`}>✨ {t('markAsUsed', lang)}</button>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setFormData(selectedItem); setFormErrors({}); setIsEditing(true); }} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-md text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"><Icon name="edit" size={16} /> {t('modify', lang)}</button>
                  <button onClick={() => handleDelete(selectedItem.id)} className="px-6 py-4 bg-rose-50 text-rose-400 font-black rounded-md text-xs active:scale-95 transition-all"><Icon name="trash" size={18} /></button>
                </div>
              </div>
            </div>
          )
        }

        {/* Settings Tab */}
        {
          !selectedItem && !isEditing && !showNotifCenter && activeTab === 'settings' && (
            <div className="p-8 space-y-6 overflow-y-auto h-full pb-32 scrollbar-hide">
              <div className="bg-white rounded-md p-7 shadow-sm space-y-5 border-2 border-white">
                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-sm"><Icon name="clock" size={18} className={theme.text} /> {t('notifTimeSet', lang)}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black text-gray-300">{t('hour', lang)}</span>
                    <select value={notifTime.hour} onChange={(e) => { setNotifTime({ ...notifTime, hour: e.target.value }); localStorage.setItem('jetso_notif_hr', e.target.value); }} className="w-full p-3 rounded-md bg-gray-50 font-black text-center outline-none">
                      {Array.from({ length: 24 }).map((_, i) => { const val = i.toString().padStart(2, '0'); return <option key={val} value={val}>{val}</option>; })}
                    </select>
                  </div>
                  <span className="text-xl font-black text-gray-200 pt-5">:</span>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black text-gray-300">{t('minute', lang)}</span>
                    <select value={notifTime.min} onChange={(e) => { setNotifTime({ ...notifTime, min: e.target.value }); localStorage.setItem('jetso_notif_min', e.target.value); }} className="w-full p-3 rounded-md bg-gray-50 font-black text-center outline-none">
                      {['00', '15', '30', '45'].map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  disabled={testCooldown > 0}
                  onClick={handleTestNotification}
                  className={`w-full py-4 rounded-md ${theme.secondary} ${theme.text} font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${testCooldown > 0 ? 'opacity-50 grayscale' : ''}`}
                >
                  <Icon name="bell" size={14} /> {t('testNotice', lang)} {testCooldown > 0 && `(${testCooldown}s)`}
                </button>
              </div>

              <div className="bg-white rounded-md p-7 shadow-sm space-y-5 border-2 border-white">
                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-sm"><Icon name="settings" size={18} className={theme.text} /> {t('themeSelection', lang)}</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(themes).map(([k, v]) => (
                    <button key={k} onClick={() => setTheme(v)} className={`w-full aspect-square rounded-md ${v.primary} border-4 transition-all shadow-sm ${theme.name === v.name ? 'border-gray-800 scale-110 shadow-md' : 'border-white'}`} />
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-md p-4 shadow-sm border-2 border-white">
                <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="w-full p-4 flex items-center justify-between font-black text-gray-600 hover:bg-gray-50 rounded-md transition-all">
                  <div className="flex items-center gap-3"><Icon name="copy" size={18} className={theme.text} /> {t('changeLang', lang)}</div>
                  <span className="text-[10px] px-3 py-1 bg-gray-100 rounded-md">{lang === 'zh' ? '中文' : 'English'}</span>
                </button>
                <button onClick={() => {
                  if (window.confirm('確定清空所有資料？')) {
                    if (db.isFallback) { localStorage.removeItem('sqlite_fallback_data'); setDiscounts([]); }
                    else { db.run("DELETE FROM discounts"); refreshData(db); }
                  }
                }} className="w-full p-4 flex items-center gap-3 font-black text-rose-400 hover:bg-rose-50 rounded-md transition-all"><Icon name="trash" size={18} /> {t('resetData', lang)}</button>
              </div>
            </div>
          )
        }
      </main >

      {/* Navigation - 加入 Safe Area Bottom */}
      < nav className={`pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-8 shrink-0`}>
        {
          [{ id: 'home', icon: 'home' }, { id: 'calendar', icon: 'calendar' }, { id: 'settings', icon: 'settings' }].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedItem(null); setIsEditing(false); setShowNotifCenter(false); }} className={`p-4 rounded-md transition-all relative ${activeTab === item.id ? theme.secondary + ' ' + theme.text + ' scale-110 shadow-sm' : 'text-gray-300'}`}>
              <Icon name={item.icon} size={24} strokeWidth={activeTab === item.id ? 3 : 2} />
            </button>
          ))
        }
      </nav >

      {/* FAB - 根據底部 Safe Area 調整位置 */}
      {
        activeTab === 'home' && !selectedItem && !isEditing && !showNotifCenter && (
          <button
            onClick={() => {
              setFormData({
                title: '', content: '', expiryDate: '', images: [], discountCodes: [''], link: '',
                notify_1m_weekly: 1, notify_last_7d_daily: 1,
                is_notify_enabled: 1, category: t('catPoints', lang)
              });
              setFormErrors({});
              setIsEditing(true);
            }}
            className={`absolute bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] right-8 w-16 h-16 rounded-md ${theme.primary} text-white shadow-lg flex items-center justify-center active:scale-90 active:rotate-12 transition-all z-50`}
          >
            <Icon name="plus" size={32} />
          </button>
        )
      }

      {
        zoomedImage && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in" onClick={() => setZoomedImage(null)}>
            <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-md" />
          </div>
        )
      }

      <style>{`
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .animate-in { animation-fill-mode: forwards; }
      .fade-in { animation-name: fade-in; }
      .slide-in-from-right { animation-name: slide-in-right; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      .will-change-transform { will-change: transform; }
    `}</style>
    </div >
  );
};

export default App;