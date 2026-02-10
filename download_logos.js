const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 读取 merchants.json
const merchants = require('./src/data/merchants.json');

// 创建 logos 目录
const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

// 下载图片的函数（带 User-Agent）
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        const file = fs.createWriteStream(filepath);
        protocol.get(options, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // 处理重定向
                file.close();
                fs.unlinkSync(filepath);
                downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(filepath);
                reject(new Error(`Status: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(filepath);
                console.log(`✅ Downloaded: ${path.basename(filepath)} (${stats.size} bytes)`);
                resolve();
            });
        }).on('error', (err) => {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            reject(err);
        });
    });
}

// 获取文件扩展名
function getExtension(url) {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath);
    if (ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        return ext;
    }
    // 默认使用 .png
    return '.png';
}

// 从原始 URL 获取商家信息
const originalUrls = [
    { name: "百佳", name_en: "PARKnSHOP", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/ParknShop_Logo.svg/1200px-ParknShop_Logo.svg.png" },
    { name: "惠康", name_en: "Wellcome", logo: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Wellcome_Logo.svg" },
    { name: "萬寧", name_en: "Mannings", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Mannings_logo.svg/1200px-Mannings_logo.svg.png" },
    { name: "屈臣氏", name_en: "Watsons", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Watsons_logo.svg/1200px-Watsons_logo.svg.png" },
    { name: "7-Eleven", name_en: "7-Eleven", logo: "https://upload.wikimedia.org/wikipedia/commons/4/40/7-eleven_logo.svg" },
    { name: "OK便利店", name_en: "Circle K", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Circle_K_logo.svg/1024px-Circle_K_logo.svg.png" },
    { name: "麥當勞", name_en: "McDonalds", logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg" },
    { name: "星巴克", name_en: "Starbucks", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Starbucks_Corporation_Logo_2011.svg" },
    { name: "永旺", name_en: "AEON", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Aeon_logo.svg/1200px-Aeon_logo.svg.png" },
    { name: "崇光", name_en: "SOGO", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Sogo_logo.svg/2560px-Sogo_logo.svg.png" },
    { name: "海港城", name_en: "Harbour City", logo: "https://www.harbourcity.com.hk/wp-content/themes/hc2016/images/logo.png" },
    { name: "時代廣場", name_en: "Times Square", logo: "https://www.timessquare.com.hk/wp-content/uploads/2021/04/TS-Logo-Color.png" }
];

// 下载所有 logo
async function downloadAllLogos() {
    const updatedMerchants = [];

    for (let i = 0; i < originalUrls.length; i++) {
        const merchant = originalUrls[i];
        const ext = getExtension(merchant.logo);
        const filename = `${merchant.name_en.toLowerCase().replace(/\s+/g, '_')}${ext}`;
        const filepath = path.join(logosDir, filename);
        const relativePath = `/logos/${filename}`;

        try {
            console.log(`Downloading ${merchant.name_en}...`);
            await downloadImage(merchant.logo, filepath);

            updatedMerchants.push({
                ...merchant,
                logo: relativePath
            });
        } catch (error) {
            console.error(`❌ Failed to download ${merchant.name_en}:`, error.message);
            // 保持原 URL
            updatedMerchants.push(merchant);
        }

        // 稍微延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 更新 merchants.json
    const updatedJsonPath = path.join(__dirname, 'src', 'data', 'merchants.json');
    fs.writeFileSync(updatedJsonPath, JSON.stringify(updatedMerchants, null, 4));
    console.log('\n✅ All done! merchants.json has been updated.');
}

downloadAllLogos().catch(console.error);
