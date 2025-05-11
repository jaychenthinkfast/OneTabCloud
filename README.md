# OneTabCloud

OneTabCloud 是一个 Chrome 扩展，用于保存和管理浏览器标签页，支持数据同步和加密存储。

## 主要功能

1. **标签管理**：
   - 保存当前窗口的所有标签页
   - 按组管理标签页
   - 支持编辑组名称和标签标题
   - 支持恢复单个标签或整个分组
   - 支持删除分组

2. **数据存储**：
   - 使用 `chrome.storage.local` 本地存储
   - 数据压缩：使用 Gzip 压缩减少存储空间
   - 自动更新修改时间戳
   - 支持数据导入导出

3. **同步功能**：
   - 支持 GitHub Gist 同步
   - 可配置同步间隔
   - 支持手动立即同步
   - 基于时间戳的冲突解决

4. **用户界面**：
   - 使用 Tailwind CSS 构建现代化界面
   - 响应式设计
   - 直观的分组和标签管理
   - 编辑功能支持（组名称、标签标题）

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
├── src/
│   ├── background.js    # 后台脚本
│   ├── view.js         # 标签管理界面
│   ├── popup/
│   │   ├── popup.html   # 弹出窗口
│   │   ├── popup.js     # 弹出窗口逻辑
│   │   └── popup.css    # 样式
│   ├── lib/
│   │   ├── crypto.js    # 加密和压缩
│   │   └── storage.js   # 存储和同步
```

### 依赖
- Tailwind CSS：UI 框架
- pako：数据压缩
- axios：HTTP 请求

## 注意事项

1. 删除分组时会清空标签数据以节省空间
2. 编辑操作会自动更新 lastModified 时间戳
3. 同步功能需要配置有效的 GitHub Token
4. 建议定期导出数据作为备份