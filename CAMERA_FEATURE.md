# 相機拍照功能添加

## 功能說明

已為圖片上傳功能添加即時相機拍照支援。用戶現在可以選擇：
1. 📸 **使用相機拍照** - 即時拍攝照片
2. 🖼️ **從相簿選擇** - 從手機相簿中選擇現有照片

## 實施細節

### 1. 安裝的套件
- `@capacitor/camera@^8.0.0` - Capacitor 官方相機插件

### 2. 修改的檔案

#### `src/features/discount/DiscountForm.jsx`
- 添加了 Camera 插件導入
- 新增 `showImageSourceModal` 狀態控制選擇對話框
- 新增 `handleCameraCapture` 函數處理相機拍照和相簿選擇
- 添加了圖片來源選擇的 Modal 對話框
- Web 平台自動降級為文件選擇器

#### `src/components/common/Icon.jsx`
- 添加了 `image` 圖標用於相簿選擇按鈕

#### `android/app/src/main/AndroidManifest.xml`
- 更新了權限配置以支援 Android 13+
- 添加了 `READ_MEDIA_IMAGES` 權限（Android 13+）
- 為舊版本保留 `READ_EXTERNAL_STORAGE` 和 `WRITE_EXTERNAL_STORAGE`（最高到 Android 12）

### 3. 用戶體驗流程

1. 用戶點擊「上傳圖片」按鈕
2. 彈出選擇對話框，顯示三個選項：
   - **拍照** - 打開相機即時拍攝
   - **從相簿選擇** - 打開相簿選擇現有照片
   - **取消** - 關閉對話框
3. 選擇後自動壓縮圖片並添加到表單

### 4. 平台兼容性

- **Android**: 完整支援相機和相簿
- **iOS**: 完整支援相機和相簿（需要在 Info.plist 中配置權限描述）
- **Web**: 自動降級為文件選擇器

### 5. 圖片處理

- 所有圖片都會經過壓縮處理（使用 `compressImage` 函數）
- 相機拍攝的圖片質量設定為 90%
- 支援最多 3 張圖片

## Android 權限配置

```xml
<!-- 相機權限 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- 舊版 Android (≤12) 的儲存權限 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- Android 13+ 的媒體權限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

## iOS 配置（如需支援 iOS）

需要在 `ios/App/App/Info.plist` 中添加：

```xml
<key>NSCameraUsageDescription</key>
<string>需要使用相機來拍攝優惠照片</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>需要訪問相簿來選擇優惠照片</string>
```

## 測試步驟

1. **重新建置 App**
   ```bash
   npm run build
   npx cap sync
   ```

2. **在 Android Studio 中建置並安裝**

3. **測試相機功能**
   - 新增或編輯優惠
   - 點擊「上傳圖片」按鈕
   - 選擇「拍照」
   - 授予相機權限（首次使用）
   - 拍攝照片並確認
   - 確認照片已添加到表單

4. **測試相簿功能**
   - 點擊「上傳圖片」按鈕
   - 選擇「從相簿選擇」
   - 授予相簿權限（首次使用）
   - 選擇一張照片
   - 確認照片已添加到表單

## 已知限制

1. Web 平台不支援直接調用相機，會降級為文件選擇器
2. 首次使用需要用戶授予相機和相簿權限
3. 某些 Android 設備可能需要在設定中手動授予權限

## 技術細節

### Camera.getPhoto 配置

```javascript
{
  quality: 90,              // 圖片質量 (0-100)
  allowEditing: false,      // 不允許編輯（可根據需求調整）
  resultType: CameraResultType.DataUrl,  // 返回 base64 格式
  source: CameraSource.Camera | CameraSource.Photos  // 相機或相簿
}
```

### 錯誤處理

- 用戶取消操作不會顯示錯誤訊息
- 其他錯誤會顯示「無法獲取圖片，請重試」
- 所有錯誤都會記錄到 console

## UI/UX 改進

- 使用底部彈出式 Modal，符合移動端設計規範
- 按鈕使用主題色彩，視覺一致性好
- 添加圖標使選項更直觀
- 支援點擊背景關閉 Modal
- 平滑的動畫效果（fade-in, slide-in）
