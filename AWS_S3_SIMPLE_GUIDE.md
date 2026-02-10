# 🚀 AWS S3 托管 Logo - 简化版指南

最简单的方法将 logo 托管到 AWS S3 并使用 bigfootws.com 域名。

---

## 🎯 目标

将 logo 文件上传到 AWS，通过以下 URL 访问：
```
https://logos.bigfootws.com/parknshop.jpg
```

---

## 第一步：注册 AWS 账号（10分钟）

### 1. 访问 AWS
- 打开 https://aws.amazon.com/cn/
- 点击 **"创建 AWS 账户"**

### 2. 填写基本信息
- 邮箱地址
- 密码
- AWS 账户名称：`BigFootWS`

### 3. 选择账户类型
- 选择 **"个人"**
- 填写姓名、电话、地址

### 4. 付款信息
- 输入信用卡信息
- ⚠️ **免费套餐内不扣费**
- 会验证扣 $1（之后退回）

### 5. 电话验证
- 选择短信验证
- 输入验证码

### 6. 选择支持计划
- 选择 **"基本支持 - 免费"**

✅ **完成！** 登录 https://console.aws.amazon.com/

---

## 第二步：创建 S3 存储桶（5分钟）

### 1. 打开 S3
- 在 AWS 控制台搜索框输入 **"S3"**
- 点击进入 S3 服务

### 2. 创建存储桶
点击 **"创建存储桶"**，填写：

**存储桶名称**：
```
logos-bigfootws-2026
```
（必须全球唯一，可以改名字）

**区域**：
```
亚太地区（新加坡）ap-southeast-1
```

**取消勾选**：
```
☐ 阻止所有公共访问
```
然后勾选确认：
```
☑ 我了解当前设置可能会导致此存储桶变为公开
```

点击页面底部 **"创建存储桶"**

✅ **存储桶创建完成！**

---

## 第三步：上传 Logo 文件（5分钟）

### 1. 进入存储桶
- 点击刚创建的存储桶名称

### 2. 上传文件
- 点击 **"上传"**
- 点击 **"添加文件"**
- 选择所有 logo 文件（从 `public/logos/` 文件夹）
- 可以一次选择多个
- 点击底部 **"上传"**
- 等待完成，点击 **"关闭"**

✅ **文件上传完成！**

---

## 第四步：设置公开访问（3分钟）

### 1. 返回存储桶页面
- 点击顶部面包屑导航回到存储桶主页

### 2. 设置存储桶策略
- 点击 **"权限"** 标签
- 向下滚动到 **"存储桶策略"**
- 点击 **"编辑"**

### 3. 粘贴以下代码
⚠️ **记得替换存储桶名称**！

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::logos-bigfootws-2026/*"
        }
    ]
}
```

把 `logos-bigfootws-2026` 改成您的存储桶名称。

- 点击 **"保存更改"**

✅ **文件现在可以公开访问！**

---

## 第五步：测试访问（1分钟）

### 获取 URL 并测试

1. 进入存储桶
2. 点击任意文件（例如 `parknshop.jpg`）
3. 复制 **"对象 URL"**
4. 在浏览器新标签打开

URL 格式：
```
https://logos-bigfootws-2026.s3.ap-southeast-1.amazonaws.com/parknshop.jpg
```

如果能看到图片 → ✅ 成功！

---

## 第六步：使用 CloudFront CDN（10分钟）

### 为什么需要 CloudFront？
- ✅ 支持 HTTPS（安全）
- ✅ 全球加速（更快）
- ✅ 可以绑定自定义域名
- ✅ 免费套餐：50GB/月流量

### 1. 创建 CloudFront 分配

1. 在 AWS 控制台搜索 **"CloudFront"**
2. 点击 **"创建分配"**

### 2. 配置源

**源域**：
- 点击输入框，选择您的 S3 存储桶
- 例如：`logos-bigfootws-2026.s3.ap-southeast-1.amazonaws.com`

**源访问**：
- 保持默认（公共）

### 3. 默认缓存行为

**查看器协议策略**：
- 选择 **"Redirect HTTP to HTTPS"**

其他保持默认

### 4. 设置（暂时跳过自定义域名）

先不填 **备用域名(CNAME)**

点击页面底部 **"创建分配"**

### 5. 等待部署
- 状态从 "正在部署" 变为 "已启用"
- 需要 5-15 分钟

### 6. 获取 CloudFront 域名
部署完成后，复制 **"分配域名"**：
```
d1234abcdefg.cloudfront.net
```

### 7. 测试 CloudFront URL
```
https://d1234abcdefg.cloudfront.net/parknshop.jpg
```

✅ **CloudFront 设置完成！**

---

## 第七步：绑定自定义域名（15分钟）

### 选项 A：使用子域名（推荐）

使用 `logos.bigfootws.com`

#### 1. 申请 SSL 证书

1. 在 AWS 控制台搜索 **"Certificate Manager"**
2. ⚠️ **切换区域到**：**美国东部(弗吉尼亚北部) us-east-1**
   - 右上角区域选择器
   - 必须是 us-east-1！CloudFront 要求
3. 点击 **"申请证书"**
4. 选择 **"申请公有证书"** → 下一步
5. **完全限定域名**：
   ```
   logos.bigfootws.com
   ```
6. **验证方法**：选择 **"DNS 验证"**
7. 点击 **"申请"**

#### 2. DNS 验证证书

1. 证书页面会显示 **CNAME 记录**
2. 复制：
   - **CNAME 名称**（例如：`_abc123.logos.bigfootws.com`）
   - **CNAME 值**（例如：`_xyz789.acm-validations.aws`）

3. 前往您的域名 DNS 管理面板
   - 如果在 GoDaddy: 登录 → 域名 → DNS
   - 如果在 Cloudflare: 登录 → 域名 → DNS
   - 如果在 Namecheap: 等等

4. 添加 CNAME 记录：
   ```
   类型: CNAME
   名称: _abc123.logos.bigfootws.com（复制的 CNAME 名称）
   值: _xyz789.acm-validations.aws（复制的 CNAME 值）
   TTL: 自动/默认
   ```

5. 保存

6. 等待 5-30 分钟，证书状态变为 **"已颁发"**

#### 3. 将证书添加到 CloudFront

1. 返回 **CloudFront** 控制台
2. 选择您的分配，点击 **"编辑"**
3. **备用域名(CNAME)**：
   ```
   logos.bigfootws.com
   ```
4. **自定义 SSL 证书**：
   - 点击输入框
   - 选择刚申请的证书
5. 点击 **"保存更改"**

#### 4. 添加 DNS CNAME 指向 CloudFront

1. 返回域名 DNS 管理面板
2. 添加新的 CNAME 记录：
   ```
   类型: CNAME
   名称: logos
   值: d1234abcdefg.cloudfront.net（您的 CloudFront 域名）
   TTL: 自动/默认
   ```
3. 保存

#### 5. 等待 DNS 生效

5-60 分钟后，访问：
```
https://logos.bigfootws.com/parknshop.jpg
```

✅ **自定义域名绑定完成！**

---

## 第八步：更新应用中的 Logo 路径

### 修改 merchants.json

替换所有 logo 路径：

**之前**：
```json
"logo": "/logos/parknshop.jpg"
```

**之后**：
```json
"logo": "https://logos.bigfootws.com/parknshop.jpg"
```

### 完整示例：

```json
{
    "name": "百佳",
    "name_en": "PARKnSHOP",
    "logo": "https://logos.bigfootws.com/parknshop.jpg",
    "instagram_id": "hkparknshop"
}
```

### 批量替换所有 logo：

可以使用查找替换：
- 查找：`"/logos/`
- 替换为：`"https://logos.bigfootws.com/`

---

## 💰 费用估算

### AWS 免费套餐（新账号 12 个月）

| 服务 | 免费额度 | 您的使用 | 够用吗？ |
|------|---------|---------|---------|
| S3 存储 | 5 GB | ~1 MB | ✅ |
| S3 请求 | 20,000 GET | ~1,000/月 | ✅ |
| CloudFront | 50 GB 流量 | ~5 GB/月 | ✅ |
| SSL 证书 | 无限 | 1 个 | ✅ |

### 12 个月后（超出免费套餐）

- S3：~$0.10/月
- CloudFront：~$0.50/月
- **总计**：< $1 USD/月

---

## 🎯 完整步骤总结

1. ✅ 注册 AWS 账号
2. ✅ 创建 S3 存储桶
3. ✅ 上传 logo 文件
4. ✅ 设置公开访问
5. ✅ 测试 S3 URL
6. ✅ 创建 CloudFront 分配
7. ✅ 申请 SSL 证书
8. ✅ DNS 验证证书
9. ✅ 绑定自定义域名
10. ✅ 添加 DNS CNAME
11. ✅ 更新应用 logo 路径

**总耗时**：约 40-60 分钟（包括等待时间）

---

## 🔧 如何重置/清理 AWS 内容

### 如果需要重新开始：

#### 删除 CloudFront 分配
1. CloudFront 控制台
2. 选择分配 → **"禁用"**
3. 等待状态变为 "已禁用"
4. 选择分配 → **"删除"**

#### 删除 S3 存储桶
1. S3 控制台
2. 选择存储桶
3. **"清空"** → 确认
4. **"删除"** → 输入存储桶名称确认

#### 删除 SSL 证书
1. Certificate Manager 控制台
2. 选择证书 → **"删除"**

#### 删除 DNS 记录
1. 域名 DNS 管理面板
2. 删除添加的 CNAME 记录

---

## 🆘 常见问题

### Q1: 403 Forbidden 错误？
**A**: 检查存储桶策略是否正确，确保 "阻止公共访问" 已关闭。

### Q2: 证书一直显示"待验证"？
**A**: 
- 检查 DNS CNAME 记录是否正确
- 等待 30 分钟
- 用 `nslookup` 检查 DNS 是否生效

### Q3: 自定义域名显示 404？
**A**:
- 检查 CloudFront 分配状态是否"已启用"
- 检查 DNS CNAME 是否正确指向 CloudFront
- 等待 DNS 传播（最多 24 小时）

### Q4: 想要使用根域名 bigfootws.com 而不是子域名？
**A**: 
- 需要使用 **Route 53**（AWS DNS 服务）
- 或者在现有 DNS 提供商使用 **ALIAS** 记录（如果支持）

---

## 📞 需要帮助？

在哪一步卡住了？告诉我：
- 具体步骤序号
- 看到的错误信息
- 截图（如果有）

我会帮您解决！🚀
