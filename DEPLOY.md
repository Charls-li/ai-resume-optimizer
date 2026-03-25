# AI 简历优化工具 - 部署指南

## 部署架构
- **前端**: Vercel (免费)
- **后端**: Render (免费)
- **AI 服务**: DeepSeek API

## 部署步骤

### 第一步：部署后端到 Render

1. 访问 https://render.com/
2. 用 GitHub 账号登录
3. 点击 "New +" → "Web Service"
4. 连接你的 GitHub 仓库
5. 配置如下：
   - **Name**: `ai-resume-optimizer-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free
6. 添加环境变量：
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek API Key
   - `PORT`: `10000`
7. 点击 "Create Web Service"
8. 等待部署完成，记录分配的域名（如 `https://ai-resume-optimizer-api.onrender.com`）

### 第二步：部署前端到 Vercel

1. 访问 https://vercel.com/
2. 用 GitHub 账号登录
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库
5. 配置如下：
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (默认)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 点击 "Deploy"
7. 等待部署完成

### 第三步：验证部署

1. 访问 Vercel 分配的域名
2. 测试文件上传和 AI 分析功能
3. 确认能正常跳转到公众号关注页面

## 注意事项

1. **Render 免费版限制**:
   - 15 分钟无访问会自动休眠
   - 首次访问需要等待 30 秒左右唤醒

2. **DeepSeek API 额度**:
   - 确保账户有足够余额
   - 可在 https://platform.deepseek.com/ 查看

3. **域名更新**:
   - 如果 Render 分配的域名不同，需要修改 `src/App.tsx` 中的 `getApiUrl` 函数

## 故障排查

- **前端无法连接后端**: 检查 CORS 配置和 API_URL 是否正确
- **AI 分析失败**: 检查 DEEPSEEK_API_KEY 是否有效
- **文件解析失败**: 检查 Render 的内存限制（免费版 512MB）
