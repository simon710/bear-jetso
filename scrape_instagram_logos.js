const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const accounts = [
    { name: 'parknshop', url: 'https://www.instagram.com/parknshophk/', filename: 'parknshop.jpg' },
    { name: 'wellcome', url: 'https://www.instagram.com/hkwellcome/', filename: 'wellcome.jpg' },
    { name: 'mannings', url: 'https://www.instagram.com/manningshk/', filename: 'mannings.jpg' },
    { name: 'watsons', url: 'https://www.instagram.com/watsonshk/', filename: 'watsons.jpg' },
    { name: '7-eleven', url: 'https://www.instagram.com/7elevenhk/', filename: '7-eleven.jpg' },
    { name: 'circle_k', url: 'https://www.instagram.com/circlekhk/', filename: 'circle_k.jpg' },
    { name: 'mcdonalds', url: 'https://www.instagram.com/mcdonaldshk/', filename: 'mcdonalds.jpg' },
    { name: 'starbucks', url: 'https://www.instagram.com/starbuckshk/', filename: 'starbucks.jpg' },
    { name: 'aeon', url: 'https://www.instagram.com/aeonhk/', filename: 'aeon.jpg' },
    { name: 'sogo', url: 'https://www.instagram.com/sogohk/', filename: 'sogo.jpg' },
    { name: 'harbour_city', url: 'https://www.instagram.com/harbourcity/', filename: 'harbour_city.jpg' },
    { name: 'times_square', url: 'https://www.instagram.com/timessquarehk/', filename: 'times_square.jpg' }
];

const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

// 从 Instagram 页面 HTML 中提取头像 URL
async function extractProfilePicUrl(instagramUrl) {
    try {
        const response = await fetch(instagramUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // 方法1: 从 meta property="og:image" 提取
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
            return ogImageMatch[1];
        }

        // 方法2: 从页面的 JSON 数据中提取
        const jsonMatch = html.match(/"profile_pic_url_hd":"([^"]+)"/);
        if (jsonMatch && jsonMatch[1]) {
            return jsonMatch[1].replace(/\\u0026/g, '&');
        }

        // 方法3: 搜索 fbcdn.net 的图片链接
        const fbcdnMatch = html.match(/https:\/\/[^"]*fbcdn\.net[^"]*\.jpg[^"]*/);
        if (fbcdnMatch && fbcdnMatch[0]) {
            return fbcdnMatch[0].replace(/\\u0026/g, '&');
        }

        return null;
    } catch (error) {
        console.error(`Error fetching ${instagramUrl}:`, error.message);
        return null;
    }
}

// 下载图片
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
    console.log('📸 开始从 Instagram 抓取商家 Logo...\n');

    let successCount = 0;
    let failCount = 0;

    for (const account of accounts) {
        try {
            console.log(`正在处理 ${account.name}...`);

            // 提取头像 URL
            const picUrl = await extractProfilePicUrl(account.url);

            if (picUrl) {
                console.log(`  找到头像 URL: ${picUrl.substring(0, 80)}...`);

                // 下载图片
                const filepath = path.join(logosDir, account.filename);
                const size = await downloadImage(picUrl, filepath);
                console.log(`  ✅ 下载成功: ${account.filename} (${(size / 1024).toFixed(2)} KB)\n`);
                successCount++;
            } else {
                console.log(`  ❌ 无法找到头像 URL\n`);
                failCount++;
            }

            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`  ❌ 错误: ${error.message}\n`);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 成功: ${successCount} 个`);
    console.log(`❌ 失败: ${failCount} 个`);
    console.log('='.repeat(50));

    if (successCount > 0) {
        console.log('\n🎉 Logo 已保存到 public/logos/ 目录');
        console.log('💡 刷新浏览器即可看到新的 logo！');
    }
}

main().catch(console.error);
