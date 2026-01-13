# 逃离锈钴城 - Cloudflare Worker 部署指南

## 概述
这是《逃离锈钴城》游戏的 Cloudflare Worker 后端，负责处理玩家数据存储、排行榜和荣誉榜功能。

## 功能特性
- 玩家数据保存/加载
- 实时排行榜系统
- 荣誉榜（成功逃离的玩家）
- 每日数据清理
- 游戏统计信息
- CORS 支持

## 部署步骤

### 1. 准备工作
- 注册 Cloudflare 账户
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- 克隆本项目

### 2. 创建 KV 命名空间
```bash
# 创建三个 KV 命名空间
wrangler kv:namespace create "PLAYERS"
wrangler kv:namespace create "RANKINGS"
wrangler kv:namespace create "HONOR"

# 创建预览环境的 KV 命名空间
wrangler kv:namespace create "PLAYERS" --preview
wrangler kv:namespace create "RANKINGS" --preview
wrangler kv:namespace create "HONOR" --preview