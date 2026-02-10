// Instagram Profile Picture Fetcher
// 使用公开 API 获取 Instagram 头像

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const accounts = [
    { name: 'parknshop', username: 'parknshophk' },
    { name: 'wellcome', username: 'wellcome_supermarket' },
    { name: 'mannings', username: 'manningshk' },
    { name: 'watsons', username: 'watsonshk' },
    { name: '7-eleven', username: '7elevenhk' },
    { name: 'circle_k', username: 'circlekhk' },
    { name: 'mcdonalds', username: 'mcdonaldshk' },
    { name: 'starbucks', username: 'starbuckshk' },
    { name: 'aeon', username: 'aeonhk' },
    { name: 'sogo', username: 'sogohk' },
    { name: 'harbour_city', username: 'harbourcity' },
    { name: 'times_square', username: 'timessquarehk' }
];

const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

async function getInstagramProfilePic(username) {
    try {
        // 使用公开的 Instagram API
        const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const profilePicUrl = data?.graphql?.user?.profile_pic_url_hd ||
                data?.graphql?.user?.profile_pic_url;
            return profilePicUrl;
        }
    } catch (error) {
        console.error(`Error fetching ${username}:`, error.message);
    }
    return null;
}

async function downloadImage(url, filepath) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    return buffer.length;
}

async function main() {
    console.log('📸 Fetching Instagram profile pictures...\n');

    for (const account of accounts) {
        try {
            console.log(`Fetching ${account.name}...`);

            const picUrl = await getInstagramProfilePic(account.username);

            if (picUrl) {
                const filepath = path.join(logosDir, `${account.name}.jpg`);
                const size = await downloadImage(picUrl, filepath);
                console.log(`✅ ${account.name}.jpg (${size} bytes)`);
            } else {
                console.log(`❌ Could not fetch ${account.name}`);
            }

            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ Error with ${account.name}:`, error.message);
        }
    }

    console.log('\n✅ Done!');
    console.log('\n💡 提示：如果某些图片下载失败，可以：');
    console.log('1. 访问 https://igram.io/');
    console.log('2. 输入 Instagram 用户名');
    console.log('3. 下载高清头像');
}

main().catch(console.error);
