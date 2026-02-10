const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 商家账号列表（已更新为正确的账号）
const accounts = [
    { username: 'hkparknshop', filename: 'parknshop.jpg' },
    { username: 'hkwellcome', filename: 'wellcome.jpg' },
    { username: 'mannings_hk', filename: 'mannings.jpg' },
    { username: 'hkwatsons', filename: 'watsons.jpg' },
    { username: '7elevenhk', filename: '7-eleven.jpg' },
    { username: 'circlek_hk', filename: 'circle_k.jpg' },
    { username: 'mcdonaldshk', filename: 'mcdonalds.jpg' },
    { username: 'starbuckshk', filename: 'starbucks.jpg' },
    { username: 'aeonstores.hk', filename: 'aeon.jpg' },
    { username: 'sogohongkong', filename: 'sogo.jpg' },
    { username: 'harbourcity', filename: 'harbour_city.jpg' },
    { username: 'hktimessquare', filename: 'times_square.jpg' }
];

const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

// Instagram User Agent
const userAgent = "Instagram 337.0.0.0.77 Android (28/9; 420dpi; 1080x1920; samsung; SM-G611F; on7xreflte; samsungexynos7870; en_US; 493419337)";

// 下载单个账号的头像
async function downloadProfilePic(username, filename) {
    try {
        const apiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

        // 获取用户信息
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': userAgent,
                'X-IG-App-ID': '936619743392459'
            }
        });

        const profilePicUrlHD = response.data.data.user.profile_pic_url_hd;

        if (!profilePicUrlHD) {
            throw new Error('无法获取头像 URL');
        }

        // 下载图片
        const imageResponse = await axios({
            url: profilePicUrlHD,
            method: 'GET',
            responseType: 'stream'
        });

        const filePath = path.join(logosDir, filename);
        const writer = fs.createWriteStream(filePath);

        imageResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                const stats = fs.statSync(filePath);
                resolve(stats.size);
            });
            writer.on('error', reject);
        });

    } catch (error) {
        throw new Error(error.response?.status || error.message);
    }
}

// 批量下载
async function main() {
    console.log('📸 开始从 Instagram 下载商家 Logo...\n');

    let successCount = 0;
    let failCount = 0;

    for (const account of accounts) {
        try {
            console.log(`正在下载 ${account.username}...`);
            const size = await downloadProfilePic(account.username, account.filename);
            console.log(`✅ ${account.filename} 下载成功 (${(size / 1024).toFixed(2)} KB)\n`);
            successCount++;

            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            const errorMsg = error.response?.data || error.response?.status || error.message;
            console.log(`❌ ${account.username} 下载失败:`);
            console.log(`   错误: ${JSON.stringify(errorMsg).substring(0, 150)}\n`);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 成功: ${successCount} 个`);
    console.log(`❌ 失败: ${failCount} 个`);
    console.log('='.repeat(60));

    if (successCount > 0) {
        console.log('\n🎉 Logo 已保存到 public/logos/ 目录');
        console.log('💡 刷新浏览器即可看到新的 logo！');
    }
}

main().catch(console.error);
