# 东西在哪 — 设计方案

## 项目定位

个人物品管理与查找工具。核心场景：**「我有个东西，放哪儿了？」**，输入关键词，秒级找到物品及其存放位置。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Rust + Axum + SQLite (FTS5) + sqlx |
| 前端 | Vite + React 19 + TypeScript + TanStack Router/Query + Tailwind CSS v4 + shadcn/ui |
| 图片 | 本地磁盘存储 + 缩略图 |
| 部署 | 单二进制（后端内置静态文件服务），ArchLinux 本地开发 |

## 数据模型

### ER 图

```
Category (分类，树形)
├── id, name, parent_id, icon, created_at
│
Container (容器，树形)
├── id, name, label, description, container_type, parent_id, image_path, created_at
│
Item (物品)
├── id, name, description, source_type, purchased_at, bought_from, price
├── category_id → Category
├── container_id → Container
├── created_at, updated_at
│
ItemImage (物品图片)
├── id, item_id → Item, file_path, thumb_path, sort_order, created_at
│
ItemTag (物品标签，多对多)
├── item_id → Item, tag_id → Tag
│
Tag (标签)
├── id, name, created_at
│
items_fts (FTS5 虚拟表)
├── 覆盖: item.name, item.description, tag.name, container.name, container.label, category.name
```

### 关键设计决策

1. **容器层级**：`parent_id` 自引用，支持任意深度（房间→柜子→箱子→小箱子）
2. **容器类型**：`room / shelf / box / drawer / bag / other`，帮助区分语义
3. **容器标签**：`label` 字段，贴在箱子外面的标签文字，参与搜索
4. **物品标签 vs 容器标签**：
   - 物品标签：自由标签（"充电器"、"USB-C"），多对多
   - 容器标签：单个 `label` 字段，描述箱子外贴的标识
5. **物品来源**：`purchased`（含购买时间/价格/平台）或 `handmade`
6. **分类**：树形结构，手动创建，输入时自动补全
7. **图片**：存储为 `{id}.{ext}` + 缩略图 `{id}_thumb.{ext}`，多张图片排序存储
8. **搜索**：FTS5 索引覆盖物品名、描述、标签名、容器名、容器标签、分类名

### FTS5 同步策略

通过 SQLite trigger 保持 `items_fts` 与源表同步：

```sql
-- 物品/标签/容器/分类变更时重建该物品的 FTS 条目
-- 或者：写操作时显式调用后端同步逻辑（更可控，推荐）
```

推荐用后端代码显式同步，不用 trigger，方便控制分词和索引内容。

## API 设计

REST 风格，`/api/v1` 前缀。

### 分类 Categories
```
GET    /api/v1/categories          # 列出所有分类（树形）
POST   /api/v1/categories          # 创建分类
PUT    /api/v1/categories/:id      # 更新分类
DELETE /api/v1/categories/:id      # 删除分类（物品的 category_id 置空）
```

### 容器 Containers
```
GET    /api/v1/containers          # 列出容器（可按 parent_id 过滤）
GET    /api/v1/containers/tree     # 完整容器树
GET    /api/v1/containers/:id      # 容器详情（含子容器+物品列表）
POST   /api/v1/containers          # 创建容器
PUT    /api/v1/containers/:id      # 更新容器
DELETE /api/v1/containers/:id      # 删除容器（物品的 container_id 置空）
POST   /api/v1/containers/:id/image  # 上传容器图片
```

### 物品 Items
```
GET    /api/v1/items               # 列出物品（支持筛选/分页）
GET    /api/v1/items/:id           # 物品详情
POST   /api/v1/items               # 创建物品
PUT    /api/v1/items/:id           # 更新物品
DELETE /api/v1/items/:id           # 删除物品
POST   /api/v1/items/:id/images    # 上传物品图片
DELETE /api/v1/items/:id/images/:imageId  # 删除物品图片
```

### 标签 Tags
```
GET    /api/v1/tags                # 列出所有标签
POST   /api/v1/tags                # 创建标签
DELETE /api/v1/tags/:id            # 删除标签
GET    /api/v1/tags/autocomplete?q=xx  # 标签补全
```

### 搜索 Search
```
GET    /api/v1/search?q=xxx&category_id=&container_id=&source_type=&page=&size=
# 返回匹配的物品列表，高亮匹配片段，含容器路径
```

### 统计 Stats
```
GET    /api/v1/stats               # 物品总数、容器数、分类数等概览
```

## 前端页面结构

```
/                    # 首页：搜索框 + 最近添加 + 统计概览
/search?q=xxx        # 搜索结果页
/items               # 全部物品（分页/筛选）
/items/new           # 添加物品
/items/:id           # 物品详情（图片、位置、编辑）
/containers          # 浏览容器树（层级导航）
/containers/:id      # 容器详情（子容器 + 物品）
/categories          # 分类管理
/tags                # 标签管理
```

## 项目目录结构

```
wheremystuff/
├── docs/
│   └── design.md              # 本文件
│
├── server/                    # Rust 后端
│   ├── Cargo.toml
│   ├── migrations/            # sqlx 数据库迁移
│   │   ├── 0001_init.sql
│   │   └── ...
│   ├── src/
│   │   ├── main.rs            # 入口：配置加载、路由挂载、静态文件
│   │   ├── config.rs          # 配置（端口、数据目录等）
│   │   ├── db.rs              # 数据库连接池初始化
│   │   ├── error.rs           # 统一错误类型
│   │   ├── handlers/          # HTTP 处理器（每个资源一个文件）
│   │   │   ├── mod.rs
│   │   │   ├── category.rs
│   │   │   ├── container.rs
│   │   │   ├── item.rs
│   │   │   ├── tag.rs
│   │   │   ├── search.rs
│   │   │   └── stats.rs
│   │   ├── models/            # 数据模型 / DTO
│   │   │   ├── mod.rs
│   │   │   ├── category.rs
│   │   │   ├── container.rs
│   │   │   ├── item.rs
│   │   │   ├── tag.rs
│   │   │   └── search.rs
│   │   ├── repositories/      # 数据库查询层
│   │   │   ├── mod.rs
│   │   │   ├── category.rs
│   │   │   ├── container.rs
│   │   │   ├── item.rs
│   │   │   ├── tag.rs
│   │   │   └── search.rs
│   │   ├── services/          # 业务逻辑（图片处理、FTS 同步等）
│   │   │   ├── mod.rs
│   │   │   ├── image.rs       # 图片存储、缩略图生成
│   │   │   └── search_index.rs # FTS5 索引同步
│   │   └── routes.rs          # 路由定义与组装
│   └── tests/                 # 集成测试
│
├── web/                       # React 前端
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts     # Tailwind v4 用 CSS 配置则无此文件
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx           # 入口
│       ├── App.tsx            # 根组件（路由布局）
│       ├── routes/            # TanStack Router 路由
│       │   ├── index.tsx      # 首页
│       │   ├── search.tsx
│       │   ├── items/
│       │   │   ├── index.tsx
│       │   │   ├── new.tsx
│       │   │   └── $id.tsx
│       │   ├── containers/
│       │   │   ├── index.tsx
│       │   │   └── $id.tsx
│       │   ├── categories.tsx
│       │   └── tags.tsx
│       ├── components/        # 可复用组件
│       │   ├── ui/            # shadcn/ui 组件
│       │   ├── SearchBar.tsx
│       │   ├── ContainerTree.tsx
│       │   ├── ContainerPath.tsx   # 面包屑：家→客厅→箱子A
│       │   ├── ItemCard.tsx
│       │   ├── ItemForm.tsx
│       │   ├── ImageGallery.tsx
│       │   ├── TagInput.tsx        # 标签输入（带补全）
│       │   └── CategorySelect.tsx  # 分类选择（树形下拉）
│       ├── hooks/             # 自定义 hooks
│       │   ├── useItems.ts
│       │   ├── useContainers.ts
│       │   ├── useSearch.ts
│       │   └── useTags.ts
│       ├── lib/               # 工具函数
│       │   ├── api.ts         # API 客户端（fetch 封装）
│       │   └── utils.ts
│       └── types/             # TypeScript 类型定义
│           └── index.ts
│
├── data/                      # 运行时数据（.gitignore）
│   ├── wheremystuff.db        # SQLite 数据库
│   └── images/                # 图片存储
│       ├── items/
│       └── containers/
│
├── Cargo.toml                 # workspace 根配置（可选）
├── .gitignore
└── README.md
```

## 分层架构（后端）

```
routes.rs        路由定义
    ↓
handlers/        HTTP 层：参数解析、响应序列化
    ↓
services/        业务逻辑：图片处理、FTS 同步
    ↓
repositories/    数据访问：SQL 查询
    ↓
models/          数据结构：DB 行 ↔ API DTO
```

职责边界：
- **handlers**：只做参数校验和响应包装，不含业务逻辑
- **services**：业务规则（如删除物品时清理图片和 FTS 索引）
- **repositories**：纯 SQL，不依赖 HTTP 上下文

## 搜索性能方案

1. SQLite FTS5 虚拟表，覆盖物品名/描述/标签/容器名/容器标签/分类名
2. 写操作后同步索引（在 service 层显式调用）
3. 搜索结果返回：物品基本信息 + 容器路径（面包屑）+ 匹配高亮
4. 预期：2000 条物品量级下，搜索响应 < 5ms

## 图片处理流程

```
上传 → 校验(格式/大小) → 生成缩略图(300px) → 存储到 data/images/{type}/
返回 → { id, url, thumb_url }
```

- 支持格式：jpg, png, webp
- 原图最大 10MB
- 缩略图用 `image` crate 生成，列表页用缩略图，详情页用原图

## 配置

通过环境变量或 `config.toml`：

```toml
[server]
host = "127.0.0.1"
port = 3000

[data]
db_path = "data/wheremystuff.db"
image_dir = "data/images"

[upload]
max_file_size = "10MB"
```
