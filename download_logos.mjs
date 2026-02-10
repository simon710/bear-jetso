import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 logos 目录
const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

// 商家列表（使用原始 URL）
const merchants = [
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

function getExtension(url) {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath);
    if (ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        return ext;
    }
    return '.png';
}

async function downloadImage(url, filepath) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    return buffer.length;
}

async function main() {
    const updatedMerchants = [];

    for (const merchant of merchants) {
        const ext = getExtension(merchant.logo);
        const filename = `${merchant.name_en.toLowerCase().replace(/\s+/g, '_')}${ext}`;
        const filepath = path.join(logosDir, filename);

        try {
            console.log(`Downloading ${merchant.name_en}...`);
            const size = await downloadImage(merchant.logo, filepath);
            console.log(`✅ ${filename} (${size} bytes)`);

            updatedMerchants.push({
                ...merchant,
                logo: `/logos/${filename}`
            });
        } catch (error) {
            console.error(`❌ Failed ${merchant.name_en}: ${error.message}`);
            updatedMerchants.push(merchant);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    const jsonPath = path.join(__dirname, 'src', 'data', 'merchants.json');
    fs.writeFileSync(jsonPath, JSON.stringify(updatedMerchants, null, 4));
    console.log('\n✅ Done! Updated merchants.json');
}

main().catch(console.error);
