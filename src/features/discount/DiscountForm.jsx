import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../../components/common/Icon';
import { compressImage } from '../../utils/image';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import ocrApi from '../../services/ocrApi';


const DiscountForm = ({ onSave }) => {
    const {
        formData, setFormData,
        formErrors, setFormErrors,
        merchants, t, lang, theme,
        notify, setZoomedImage
    } = useApp();

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const fileInputRef = useRef(null);

    const autocompleteRef = useRef(null);

    const platform = Capacitor.getPlatform();

    // 處理點擊外部關閉自動完成
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            notify('正在壓縮圖片...📸');
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result);
                setFormData(prev => ({ ...prev, images: [...(prev.images || []), compressed] }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiScan = async (source) => {
        try {
            setShowImageSourceModal(false);
            if (platform === 'web') {
                notify('網頁版暫時僅支援手動錄入');
                return;
            }

            const image = await Camera.getPhoto({
                quality: 80, // Lower quality for faster OCR
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source
            });

            if (image.dataUrl) {
                setIsOcrLoading(true);
                notify('🚀 正在使用 AI 解析內容...');

                try {
                    // 🚩 提高壓縮尺寸至 1600px 並維持高質量，以便捕捉複雜的中文字符
                    const compressedForOcr = await compressImage(image.dataUrl, 1600);
                    console.log('🐻 [OCR] 圖片已壓縮 (1600px)，準備發送...');


                    const ocrData = await ocrApi.detectText(compressedForOcr);
                    const { detectedLines, extractedDate } = ocrData;


                    let newFormData = { ...formData };

                    // 1. 嘗試提取日期
                    if (extractedDate) {
                        newFormData.expiryDate = extractedDate;
                        notify('📅 已自動識別到期日：' + extractedDate);
                    }

                    // 2. 嘗試匹配商家
                    const allText = detectedLines.join(' ').toLowerCase();
                    console.log('🐻 [OCR] 識別全文本:', allText);

                    // 尋找匹配的商戶 (更加寬鬆的匹配邏輯，加入安全檢查)
                    const matchedMerchant = merchants.find(m => {
                        const name = (m.name || '').toLowerCase();
                        const id = (m.merchantId || '').toLowerCase();
                        const name_en = (m.name_en || '').toLowerCase();

                        return (name && allText.includes(name)) ||
                            (id && allText.includes(id)) ||
                            (name_en && allText.includes(name_en)) ||
                            name.split(' ').some(word => word.length > 2 && allText.includes(word));
                    });



                    if (matchedMerchant) {
                        newFormData.title = lang === 'zh' ? matchedMerchant.name : matchedMerchant.name_en;
                        notify('🏢 已自動識別商家：' + newFormData.title);
                    }

                    // 🚩 新增：將所有識別到的文字放入「內容」欄位，方便用戶編輯
                    if (detectedLines.length > 0) {
                        const rawContent = detectedLines.join('\n');
                        newFormData.content = rawContent;
                        // 如果沒有匹配到商家，嘗試用第一行作為標題
                        if (!matchedMerchant) {
                            newFormData.title = detectedLines[0].substring(0, 30);
                        }
                    }

                    // 4. 添加圖片
                    const compressed = await compressImage(image.dataUrl);

                    newFormData.images = [...(newFormData.images || []), compressed];

                    setFormData(newFormData);
                    notify('✨ AI 識別完成！請檢查內容');
                } catch (err) {
                    console.error('OCR Error:', err);
                    notify(`AI 辨識失敗: ${err.message || '未知錯誤'}`);
                    const compressed = await compressImage(image.dataUrl);

                    setFormData(prev => ({ ...prev, images: [...(prev.images || []), compressed] }));
                } finally {
                    setIsOcrLoading(false);
                }
            }
        } catch (error) {
            console.error('AI Scan error:', error);
            if (error.message !== 'User cancelled photos app') {
                notify('無法獲取圖片，請重試');
            }
        }
    };

    const handleCameraCapture = async (source) => {

        try {
            setShowImageSourceModal(false);

            if (platform === 'web') {
                // Web fallback - use file input
                fileInputRef.current.click();
                return;
            }

            notify('正在處理圖片...📸');

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source
            });

            if (image.dataUrl) {
                const compressed = await compressImage(image.dataUrl);
                setFormData(prev => ({ ...prev, images: [...(prev.images || []), compressed] }));
                notify('圖片已添加！✨');
            }
        } catch (error) {
            console.error('Camera error:', error);
            if (error.message !== 'User cancelled photos app') {
                notify('無法獲取圖片，請重試');
            }
        }
    };

    return (
        <div className="h-full overflow-y-auto p-5 pb-24 space-y-4 bg-white scrollbar-hide">
            <div className="space-y-1 relative" ref={autocompleteRef}>
                <label className={`text-[10px] font-black ${formErrors.title ? 'text-rose-600' : 'text-gray-400'} ml-2 uppercase tracking-widest`}>{t('titleLabel')} *</label>
                <div className={`flex items-center gap-3 bg-gray-50 rounded-md p-4 border-2 ${formErrors.title ? 'border-rose-500' : 'border-transparent'} focus-within:border-pink-200 transition-all`}>
                    {merchants.find(m => m.name === formData.title || m.name_en === formData.title)?.logo && (
                        <img src={merchants.find(m => m.name === formData.title || m.name_en === formData.title).logo} className="w-8 h-8 object-contain rounded-md" alt="Merchant" />
                    )}
                    <input
                        value={formData.title}
                        onFocus={() => {
                            if (formData.title.length > 0 && suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onChange={e => {
                            const val = e.target.value;
                            setFormData({ ...formData, title: val });
                            if (val) setFormErrors(prev => ({ ...prev, title: false }));

                            if (val.length > 0) {
                                const filtered = merchants
                                    .filter(m =>
                                        m.name.toLowerCase().startsWith(val.toLowerCase()) ||
                                        m.name_en.toLowerCase().startsWith(val.toLowerCase())
                                    )
                                    .sort((a, b) => {
                                        const a_name = (lang === 'zh' ? a.name : a.name_en).toLowerCase();
                                        const b_name = (lang === 'zh' ? b.name : b.name_en).toLowerCase();
                                        return a_name.localeCompare(b_name);
                                    });
                                setSuggestions(filtered);
                                setShowSuggestions(filtered.length > 0);
                            } else {
                                setSuggestions([]);
                                setShowSuggestions(false);
                            }
                        }}
                        className="flex-1 bg-transparent outline-none font-bold"
                        placeholder="輸入商店名稱..."
                    />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[200] bg-white rounded-md shadow-md border border-gray-100 mt-1 max-h-48 overflow-y-auto p-2 space-y-1">
                        {suggestions.map((m, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setFormData({ ...formData, title: lang === 'zh' ? m.name : m.name_en });
                                    setShowSuggestions(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md transition-all text-left"
                            >
                                <img src={m.logo} className="w-6 h-6 object-contain rounded-md" alt={m.name} />
                                <span className="text-xs font-bold text-gray-700">{lang === 'zh' ? m.name : m.name_en}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('categoryLabel')}</label>
                <div className="relative">
                    <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none font-bold transition-all appearance-none cursor-pointer"
                    >
                        {['catPoints', 'catMall', 'catFnb', 'catGift', 'catStation', 'catCode', 'catTravel', 'catOther'].map(cat => (
                            <option key={cat} value={t(cat)}>{t(cat)}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 rotate-90">
                        <Icon name="chevronRight" size={16} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('startDate')}</label>
                    <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none font-bold transition-all text-xs"
                    />
                </div>

                <div className="space-y-1">
                    <label className={`text-[10px] font-black ${formErrors.expiryDate ? 'text-rose-600' : 'text-gray-400'} ml-2 uppercase tracking-widest`}>{t('expiry')} *</label>
                    <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={e => {
                            setFormData({ ...formData, expiryDate: e.target.value });
                            if (e.target.value) setFormErrors(prev => ({ ...prev, expiryDate: false }));
                        }}
                        className={`w-full bg-gray-50 rounded-md p-4 border-2 ${formErrors.expiryDate ? 'border-rose-500' : 'border-transparent'} focus:border-pink-200 outline-none font-bold transition-all text-xs`}
                    />
                </div>
            </div>

            {formData.category === t('catCode') && (
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('discountCode')}</label>
                    <div className="space-y-3">
                        {(formData.discountCodes || ['']).map((code, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    value={code}
                                    onChange={e => {
                                        const newCodes = [...(formData.discountCodes || [''])];
                                        newCodes[index] = e.target.value;
                                        setFormData({ ...formData, discountCodes: newCodes });
                                    }}
                                    className="flex-1 bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none font-bold transition-all"
                                    placeholder={`${t('discountCode')} ${index + 1}`}
                                />
                                {index > 0 && (
                                    <button
                                        onClick={() => {
                                            const newCodes = (formData.discountCodes || ['']).filter((_, i) => i !== index);
                                            setFormData({ ...formData, discountCodes: newCodes });
                                        }}
                                        className="px-4 bg-rose-50 text-rose-400 rounded-md active:scale-95 transition-all"
                                    >
                                        <Icon name="trash" size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => setFormData({ ...formData, discountCodes: [...(formData.discountCodes || ['']), ''] })}
                            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-md text-gray-400 text-xs font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Icon name="plus" size={14} /> 新增更多優惠碼
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('contentLabel')}</label>
                <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-gray-50 rounded-md p-4 border-2 border-transparent focus:border-pink-200 outline-none font-bold transition-all min-h-[120px] resize-none"
                    placeholder="輸入備註或優惠詳情..."
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('media')}</label>
                    <span className="text-[10px] font-black text-gray-300">{(formData.images || []).length}/3 {t('photos')}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {(formData.images || []).map((img, i) => (
                        <div key={i} className="aspect-square rounded-md overflow-hidden relative group shadow-sm border-2 border-white bg-gray-100">
                            <img
                                src={img}
                                className="w-full h-full object-cover cursor-zoom-in active:scale-95 transition-all"
                                alt="Discount"
                                onClick={() => setZoomedImage(img)}
                            />
                            <button
                                onClick={() => setFormData({ ...formData, images: (formData.images || []).filter((_, idx) => idx !== i) })}
                                className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-md shadow-md active:scale-90 transition-all z-10"
                            >
                                <Icon name="trash" size={14} />
                            </button>
                        </div>
                    ))}
                    {(formData.images || []).length < 3 && (
                        <button
                            onClick={() => setShowImageSourceModal(true)}
                            className="aspect-square rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:bg-gray-50 transition-all gap-1"
                        >
                            <Icon name="camera" size={24} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('uploadImage')}</span>
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" capture="environment" />
            </div>

            {/* Image Source Modal */}
            {showImageSourceModal && (
                <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-end justify-center animate-in fade-in" onClick={() => setShowImageSourceModal(false)}>
                    <div className="bg-white rounded-t-2xl w-full max-w-md p-6 space-y-3 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-center font-black text-gray-700 mb-4">獲取圖片 {isOcrLoading && <span className="animate-pulse text-pink-500">(AI 執行中...)</span>}</h3>

                        {/* 1. 先隱藏 AI 識別按鈕 */}
                        {/* 
                        <button
                            disabled={isOcrLoading}
                            onClick={() => handleAiScan(CameraSource.Camera)}
                            className={`w-full p-6 rounded-md bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black flex flex-col items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${isOcrLoading ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="camera" size={24} />
                                <span className="text-lg">🤖 AI 智能掃描拍照</span>
                            </div>
                            <span className="text-[10px] opacity-80 font-normal">自動識別商家標誌及到期日</span>
                        </button>
                        */}

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                disabled={isOcrLoading}
                                onClick={() => handleCameraCapture(CameraSource.Camera)}
                                className="p-4 rounded-md bg-gray-50 text-gray-700 font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100"
                            >
                                <Icon name="camera" size={18} />
                                普通拍照
                            </button>
                            <button
                                disabled={isOcrLoading}
                                onClick={() => handleCameraCapture(CameraSource.Photos)}
                                className="p-4 rounded-md bg-gray-50 text-gray-700 font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100"
                            >
                                <Icon name="image" size={18} />
                                從相簿選
                            </button>
                        </div>

                        <button
                            onClick={() => setShowImageSourceModal(false)}
                            className="w-full p-4 rounded-md bg-white border-2 border-gray-100 text-gray-400 font-black active:scale-95 transition-all"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}


            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">{t('detailsLink')}</label>
                <div className="flex items-center gap-3 bg-gray-50 rounded-md p-4 border-2 border-transparent focus-within:border-pink-200 transition-all">
                    <Icon name="externalLink" size={18} className="text-gray-300" />
                    <input
                        value={formData.link}
                        onChange={e => setFormData({ ...formData, link: e.target.value })}
                        className="flex-1 bg-transparent outline-none font-bold"
                        placeholder="https://..."
                    />
                </div>
            </div>

            {/* Notifications Toggles */}
            <div className="bg-gray-50 rounded-md p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-700 font-bold text-sm">
                        <Icon name="bell" size={18} className={theme.text} /> {t('notifToggle')}
                    </div>
                    <button
                        onClick={() => setFormData({ ...formData, is_notify_enabled: formData.is_notify_enabled ? 0 : 1 })}
                        className={`w-12 h-6 rounded-md relative transition-all ${formData.is_notify_enabled ? theme.primary : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-md transition-all ${formData.is_notify_enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                {formData.is_notify_enabled === 1 && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('notifCustomTime')}</label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={formData.notif_hour}
                                    onChange={e => setFormData({ ...formData, notif_hour: e.target.value })}
                                    className="flex-1 bg-white rounded-md p-2 text-center font-bold border-2 border-transparent focus:border-pink-200 outline-none"
                                >
                                    {[...Array(24)].map((_, i) => {
                                        const h = i.toString().padStart(2, '0');
                                        return <option key={h} value={h}>{h} {t('hour')}</option>;
                                    })}
                                </select>
                                <span className="font-bold text-gray-300">:</span>
                                <select
                                    value={formData.notif_min}
                                    onChange={e => setFormData({ ...formData, notif_min: e.target.value })}
                                    className="flex-1 bg-white rounded-md p-2 text-center font-bold border-2 border-transparent focus:border-pink-200 outline-none"
                                >
                                    {['00', '15', '30', '45'].map(m => (
                                        <option key={m} value={m}>{m} {t('minute')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {[{ key: 'notify_1m_weekly', label: t('notif1') }, { key: 'notify_last_7d_daily', label: t('notif2') }].map(n => (
                            <div key={n.key} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 font-bold">{n.label}</span>
                                <button
                                    onClick={() => setFormData({ ...formData, [n.key]: formData[n.key] ? 0 : 1 })}
                                    className={`w-10 h-5 rounded-md relative transition-all ${formData[n.key] ? theme.primary : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-md transition-all ${formData[n.key] ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4">
                <button
                    onClick={onSave}
                    className={`w-full py-5 rounded-md ${theme.primary} text-white font-black shadow-md active:scale-95 transition-all text-lg`}
                >
                    {t('save')}
                </button>
            </div>
        </div>
    );
};

export default DiscountForm;
