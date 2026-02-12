# 通知系統修復與改進

## 問題診斷

用戶反映到了設定的通知時間但沒有收到通知。經過檢查發現以下問題：

### 1. ❌ 缺少通知權限請求
- App 啟動時沒有請求 Android 通知權限
- 沒有權限的話，通知無法發送

### 2. ❌ 通知只在儲存時排程
- 通知只在新增或編輯優惠時排程
- App 重啟後不會重新排程
- 更改通知時間設定後，已存在的優惠不會更新

### 3. ❌ 缺少除錯日誌
- 無法確認通知是否成功排程
- 難以追蹤問題

## 已實施的修復

### ✅ 1. 添加通知權限請求 (App.jsx)
```javascript
// 請求通知權限 (Mobile Only)
if (platform !== 'web' && LocalNotifications) {
  const permStatus = await LocalNotifications.checkPermissions();
  if (permStatus.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }
}
```

### ✅ 2. App 啟動時重新排程所有通知 (App.jsx)
```javascript
// Reschedule all notifications when app loads and discounts are ready
useEffect(() => {
  if (!isAppLoading && discounts.length > 0 && notifTime) {
    rescheduleAllNotifications(discounts, notifTime);
  }
}, [isAppLoading]);
```

### ✅ 3. 更改通知時間時自動重新排程 (Settings.jsx)
```javascript
const handleTimeChange = async (type, value) => {
  const newTime = { ...notifTime, [type]: value };
  setNotifTime(newTime);
  localStorage.setItem(`jetso_notif_${type === 'hour' ? 'hr' : 'min'}`, value);
  
  // 重新排程所有通知
  await rescheduleAllNotifications(discounts, newTime);
  notify('已更新所有通知時間！⏰');
};
```

### ✅ 4. 新增 rescheduleAllNotifications 函數 (notifications.js)
```javascript
export const rescheduleAllNotifications = async (discounts, notifTime) => {
  const activeDiscounts = discounts.filter(d => 
    d.status !== 'used' && 
    !checkIsExpired(d.expiryDate) && 
    d.is_notify_enabled
  );
  
  for (const discount of activeDiscounts) {
    await scheduleNotifications(discount, notifTime);
  }
};
```

### ✅ 5. 添加除錯日誌
- 排程通知時會顯示數量和時間
- 權限請求會記錄結果
- 重新排程時會記錄處理的優惠數量

## 額外改進

### ✅ 分鐘選擇器改為 1 分鐘間隔
- 從原本的 4 個選項 (00, 15, 30, 45) 改為 60 個選項 (00-59)
- 用戶可以更精確地設定通知時間

## 測試步驟

1. **重新建置 App**
   ```bash
   .\build_android.bat
   ```

2. **首次啟動測試**
   - 安裝並啟動 app
   - 檢查是否彈出通知權限請求對話框
   - 授予權限

3. **新增測試優惠**
   - 新增一個優惠，到期日設為明天
   - 在設定頁面設定通知時間為 2 分鐘後
   - 等待 2 分鐘，確認是否收到通知

4. **更改通知時間測試**
   - 在設定頁面更改通知時間
   - 應該看到提示訊息「已更新所有通知時間！⏰」
   - 確認所有優惠的通知時間都已更新

5. **App 重啟測試**
   - 關閉並重新啟動 app
   - 檢查 console log，應該看到「Rescheduling all notifications on startup...」
   - 確認通知仍然正常運作

## 通知排程邏輯確認

✅ **通知確實會按照設定的時間發送**

在 `scheduleNotifications` 函數中 (第 21-22 行)：
```javascript
const expiryDate = new Date(item.expiryDate.replace(/-/g, '/'));
expiryDate.setHours(parseInt(notifTime.hour), parseInt(notifTime.min), 0);
```

所有通知都會在用戶設定的時間發送：
- 到期當天通知：到期日 + 設定時間
- 每週提醒（到期前 1-4 週）：對應日期 + 設定時間
- 每日提醒（到期前 1-6 天）：對應日期 + 設定時間

## 修改的檔案

1. `src/utils/notifications.js` - 新增 rescheduleAllNotifications 函數和日誌
2. `src/App.jsx` - 添加權限請求和啟動時重新排程
3. `src/pages/Settings.jsx` - 更改時間時重新排程，分鐘選擇器改為 1 分鐘間隔

## 注意事項

- 通知權限必須由用戶授予，如果用戶拒絕，通知將無法發送
- Android 系統可能會因為省電模式或其他原因延遲或取消通知
- 建議用戶將 app 加入省電白名單以確保通知正常運作
