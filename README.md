# AI 简历优化工具

基于 DeepSeek API 的智能简历分析和优化工具。

## 功能特点

- 📄 PDF 简历自动解析
- 🤖 AI 智能匹配度分析
- 💡 个性化优化建议
- 📝 AI 改写简历内容
- 💰 微信支付解锁完整报告

## 快速开始

### 1. 配置 DeepSeek API Key

```bash
cd server
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key
```

### 2. 启动后端服务

```bash
cd server
npm start
```

后端服务将在 http://localhost:3001 运行

### 3. 启动前端开发服务器

```bash
# 在项目根目录
npm run dev
```

前端将在 http://localhost:5173 运行

### 4. 访问应用

打开浏览器访问 http://localhost:5173

## 项目结构

```
ai-resume-optimizer/
├── src/                    # 前端代码
│   ├── App.tsx            # 主应用组件
│   └── ...
├── server/                 # 后端服务
│   ├── index.js           # Express 服务器
│   └── package.json
├── dist/                   # 构建输出
└── package.json
```

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express
- **AI**: DeepSeek API
- **支付**: 微信支付（待接入）

## 部署

### 前端部署（Vercel）

```bash
npm run build
# 将 dist/ 目录部署到 Vercel
```

### 后端部署

推荐使用 Railway、Render 或阿里云函数计算部署后端服务。

## 后续计划

- [ ] 接入微信支付
- [ ] 用户登录和历史记录
- [ ] 简历模板导出
- [ ] 多轮对话优化

## 许可证

MIT
