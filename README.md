# OneTabCloud

OneTabCloud 是一个 Chrome 扩展，用于保存和管理浏览器标签页，支持数据同步和加密存储。

## 安装说明

您可以通过以下方式安装 OneTabCloud：

1. 在 Chrome 网上应用店搜索 "OneTabCloud"
2. 点击"添加到 Chrome"按钮进行安装

## 主要功能

1. **标签管理**：
   - 保存当前窗口的所有标签页
   - 按组管理标签页
   - 支持编辑组名称和标签标题
   - 支持恢复单个标签或整个分组
   - 支持删除分组
   - 支持移动(拖拽)标签到其他分组
   - 支持删除单个标签
   - 自动生成分组名称（基于时间）
   - 支持按时间排序显示分组
   - 支持搜索标签功能

2. **数据存储**：
   - 使用 `chrome.storage.local` 本地存储
   - 数据压缩：使用 Gzip 压缩减少存储空间
   - 自动更新修改时间戳
   - 支持数据导入导出（JSON格式）
   - 支持清空所有数据
   - 显示存储使用量和分组数量统计
   - 支持数据备份和恢复

3. **同步功能**：
   - 支持 GitHub Gist 同步
   - 可配置同步间隔（5-1440分钟）
   - 支持手动立即同步
   - 基于时间戳的冲突解决
   - 支持启用/禁用自动同步
   - 显示上次同步时间
   - 支持跨设备数据同步
   - 自动同步失败重试机制

4. **用户界面**：
   - 使用 Tailwind CSS 构建现代化界面
   - 响应式设计，适配不同屏幕尺寸
   - 直观的分组和标签管理
   - 编辑功能支持（组名称、标签标题）
   - 支持搜索标签
   - 支持按时间排序
   - 拖拽式标签管理
   - 实时显示同步状态
   - 友好的错误提示

5. **安全特性**：
   - 数据加密存储
   - 安全的 GitHub Token 管理
   - 隐私保护机制
   - 数据访问控制
   - 定期安全审计

## 技术实现

### 数据存储
- 使用 `chrome.storage.local` 存储数据
- 使用 `pako` 进行数据压缩
- 数据结构：
  ```json
  {
    "groups": [
      {
        "id": "timestamp",
        "name": "组名称",
        "lastModified": "ISO时间戳",
        "tabs": "压缩后的标签数据",
        "deleted": false
      }
    ]
  }
  ```

### 标签数据
- 压缩存储的标签数据结构：
  ```json
  {
    "url": "标签URL",
    "title": "标签标题",
    "timestamp": "保存时间"
  }
  ```

### 权限要求
```json
{
  "permissions": [
    "tabs",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://api.github.com/*"
  ]
}
```

## 使用说明

1. **保存标签**：
   - 点击扩展图标
   - 点击"保存当前窗口标签"按钮
   - 标签将按时间自动分组保存

2. **管理标签**：
   - 点击"查看全部"进入管理界面
   - 可以编辑组名称和标签标题
   - 可以恢复单个标签或整个分组
   - 可以删除不需要的分组

3. **同步设置**：
   - 在设置页面配置 GitHub Token
   - 设置同步间隔
   - 可以手动触发同步

## 开发说明

### 项目结构
```
OneTabCloud/
├── manifest.json         # 扩展配置
├── package.json         # 项目依赖配置
├── webpack.config.js    # Webpack 构建配置
├── src/                 # 源代码目录
│   ├── background.js    # 后台脚本
│   ├── view.js         # 标签管理界面
│   ├── popup/
│   │   ├── popup.html   # 弹出窗口
│   │   ├── popup.js     # 弹出窗口逻辑
│   │   └── popup.css    # 样式
│   ├── lib/
│   │   ├── crypto.js    # 加密和压缩
│   │   └── storage.js   # 存储和同步
├── assets/             # 静态资源
│   ├── icon16.png      # 16x16 图标
│   └── icon128.png     # 128x128 图标
└── dist/              # 构建输出目录
```

### 依赖
- 生产依赖：
  - pako (^2.1.0)：数据压缩
  - axios (^1.6.2)：HTTP 请求

- 开发依赖：
  - webpack (^5.89.0)：构建工具
  - webpack-cli (^5.1.4)：Webpack 命令行工具
  - copy-webpack-plugin (^11.0.0)：资源复制插件
  - css-loader (^6.8.1)：CSS 加载器
  - style-loader (^3.3.3)：样式加载器

### 开发命令
```bash
# 开发模式（带热重载）
npm run dev

# 生产构建
npm run build
```

## 注意事项

1. 删除分组时会清空标签数据以节省空间
2. 编辑操作会自动更新 lastModified 时间戳
3. 同步功能需要配置有效的 GitHub Token
4. 建议定期导出数据作为备份