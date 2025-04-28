# QBot API 演示项目

这是一个展示如何使用腾讯云 QBot API 的演示项目。该项目使用 Vue.js 构建前端界面，并通过 WebSocket 或 SSE 与 QBot 服务进行通信。

## 功能特点

- 基于 Vue.js 的现代化前端界面
- 支持 WebSocket 和 SSE 两种连接方式
- 完整的聊天机器人交互演示
- 基于 Vercel 的简单部署流程

## 快速开始

### 前提条件

- Node.js 14.x 或更高版本
- npm 或 yarn 包管理器
- 腾讯云账号及相关 API 密钥

### 安装

1. 克隆仓库
   ```bash
   git clone <repository-url>
   cd qbot-api-demo
   ```

2. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 创建环境变量文件
   在项目根目录创建 `.env` 文件，并添加以下内容：
   ```
   SECRET_ID=你的腾讯云SecretId
   SECRET_KEY=你的腾讯云SecretKey
   APP_ID=你的QBot应用ID
   VUE_APP_KEY=你的QBot应用密钥
   ```

### 开发

启动开发服务器：
```bash
npm run dev
# 或
yarn dev
```

应用将在 `http://localhost:3000` (或配置的端口) 上运行。

## 项目配置

### 环境变量

项目使用以下环境变量：

| 变量名 | 描述 | 必填 |
|--------|------|------|
| SECRET_ID | 腾讯云 API 的 SecretId | 是 |
| SECRET_KEY | 腾讯云 API 的 SecretKey | 是 |
| APP_ID | QBot 应用的 ID | 是 |
| VUE_APP_KEY | QBot 应用的密钥 (前端使用) | 是 |

### 连接方式配置

在 `src/constants/static.js` 文件中可以设置连接方式：
- `ws`: 使用 WebSocket 连接
- `sse`: 使用 Server-Sent Events 连接

## 部署到 Vercel

本项目已配置好 Vercel 部署文件，可以直接部署到 Vercel 平台。

1. 在 Vercel 中导入你的 Git 仓库

2. 在 Vercel 项目设置中配置环境变量：
   - `SECRET_ID`
   - `SECRET_KEY`
   - `APP_ID`
   - `VUE_APP_KEY`

3. 部署项目

## 开发指南

### 项目结构

```
qbot-api-demo/
├── public/            # 静态资源
├── src/               # 源代码
│   ├── assets/        # 项目资源
│   ├── components/    # 组件
│   ├── constants/     # 常量定义
│   └── ...
├── scripts/           # 后端脚本
├── .env               # 环境变量(本地开发用，不提交到仓库)
└── vercel.json        # Vercel 部署配置
```

### 脚本命令

- `npm run dev`: 启动开发服务器
- `npm run build`: 构建生产版本
- `npm run serve`: 本地预览生产构建

## 注意事项

- 请勿将包含敏感信息的 `.env` 文件提交到版本控制系统
- 在生产环境中，确保所有敏感信息都通过环境变量安全地传递
- 定期更新依赖以修复潜在的安全漏洞

## 许可证

[指定您的许可证类型]