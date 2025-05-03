# OneTabCloud Chrome 扩展

## 项目概述
**OneTabCloud** 是一个受 [OneTab](https://www.one-tab.com/) 启发的 Chrome 扩展，用于高效保存、组织和管理浏览器标签页，将打开的标签页转换为列表，并支持跨设备同步。同步功能通过 GitHub Gist 实现，用户只需输入 **GitHub Personal Access Token (PAT)**（需授予 `gist` 权限），扩展会自动创建一个私有 Gist 用于存储数据，确保数据隔离和隐私。本扩展通过压缩、分片和优化的轮询机制，解决 Gist 单文件 1MB 容量限制和缺乏实时同步的问题。本文档为开发者提供清晰的开发指南，包含需求、架构、实现细节和路线图。

## 功能

### 核心功能
1. **标签保存**：一键保存当前窗口所有标签或选定标签到列表。
2. **标签分组**：将标签组织为命名分组（例如按日期或自定义名称）。所有标签都以分组方式保存，分组是数据组织的基本单位。
3. **标签恢复**：支持恢复单个标签、分组或所有保存的标签。
4. **导出/导入**：将标签列表导出为 JSON 文件，或导入文件进行备份/分享。
5. **管理界面**：提供简洁、用户友好的界面，用于查看、编辑和删除标签/分组。
6. **本地存储**：使用 `chrome.storage.local` API 本地存储标签数据。

### 同步功能（GitHub Gist）
1. **跨设备同步**：
   - 通过 GitHub Gist 在多设备间同步标签和分组。
   - 每个用户的数据存储到其个人 GitHub 账户的私有 Gist 中，确保数据隔离。
2. **用户配置**：
   - 用户在 GitHub 生成 PAT（需授予 `gist` 权限），输入到设置界面。
   - 扩展自动验证 PAT 并创建一个新的私有 Gist（无需手动配置 Gist ID）。
   - 数据仅与用户自己的 GitHub 账户关联，互不干扰。
3. **解决 1MB 单文件容量限制**：
   - **数据压缩**：使用 `pako` 进行 Gzip 压缩，减少数据大小 50%-70%。
   - **数据精简**：仅存储必要字段（例如 `{ u: url, t: title, ts: timestamp }`）。
   - **多文件分片**：数据超 900KB 时，拆分为多个文件（例如 `data-part1.json`），通过 `index.json` 跟踪。分片不增加 API 调用次数（单次 `PATCH` 请求更新所有文件）。
   - **数据清理**：自动删除 30 天未访问的分组，提供手动清理界面。
   - **溢出处理**：数据接近 900KB 时暂停同步，提示用户清理或导出。
4. **解决同步问题**：
   - **定时轮询**：使用 `chrome.alarms` 每 10 分钟同步一次，每小时最多 12 次 API 调用（6 次读取 + 6 次写入）。
   - **增量同步**：仅同步修改的分组/标签，使用 `version` 和 `lastModified` 标记。
   - **冲突解决**：基于 `lastSync` 时间戳的“最后写入优先”策略，合并非冲突数据。分组比较基于唯一 `id`，而非 `name`。
   - **手动同步**：提供界面按钮支持立即同步。
   - **离线支持**：使用 `chrome.storage.local` 缓存数据，联网后同步。
   - **API 调用**：单次同步通常调用 2 次 API（1 次 `GET` 读取，1 次 `PATCH` 写入）；首次同步可能为 3 次（加 1 次 `POST` 创建 Gist）。
5. **隐私保护**：
   - 使用 `crypto-js` 加密标签 URL 和标题后存储到 Gist。
   - 使用私有 Gist，防止公开访问。
   - 不存储敏感数据（例如 Cookie）。
6. **速率限制管理**：
   - GitHub Gist API 限制为 5000 次请求/小时（认证请求）。
   - 分片机制优化 API 调用，单次 `PATCH` 包含所有分片文件。
   - 增量同步和 10 分钟轮询减少不必要调用。
   - 数据压缩降低分片数量，间接减少潜在 Gist 容量问题。

## 技术要求

### Chrome 扩展
- **权限**（在 `manifest.json` 中）：
  ```json
  {
    "permissions": [
      "tabs",
      "storage",
      "alarms",
      "https://api.github.com/*"
    ],
    "host_permissions": [
      "https://api.github.com/*"
    ]
  }
  ```
- **API**：
  - `chrome.tabs`：管理标签。
  - `chrome.storage.local`：本地存储。
  - `chrome.alarms`：定时同步。
  - `chrome.runtime`：后台脚本。

### 依赖
- **pako**：Gzip 压缩（`npm install pako`）。
- **crypto-js**：数据加密（`npm install crypto-js`）。
- **axios**：GitHub API 请求（`npm install axios`）。
- **Tailwind CSS**：界面样式（通过 CDN 或构建流程）。

### GitHub Gist
- **API**：`https://api.github.com/gists` 用于读写。
- **认证**：用户提供的 PAT，需包含 `gist` 权限。
- **数据格式**：加密、压缩的 JSON：
  ```json
  {
    "groups": [
      {
        "id": "group1",
        "name": "工作",
        "version": 2,
        "lastModified": "2025-05-01T10:00:00Z",
        "tabs": [
          {"u": "https://example.com", "t": "示例网站", "ts": "2025-05-01T09:00:00Z"}
        ]
      }
    ],
    "lastSync": "2025-05-01T10:00:00Z"
  }
  ```

## 架构

### 文件结构
```
OneTabCloud/
├── manifest.json         # 扩展配置文件
├── src/
│   ├── background.js    # 后台脚本（同步、PAT 验证）
│   ├── popup/
│   │   ├── popup.html   # 主界面
│   │   ├── popup.js     # 界面逻辑
│   │   ├── popup.css    # 样式（Tailwind CSS）
│   ├── options/
│   │   ├── options.html # 设置界面（PAT 配置）
│   │   ├── options.js   # 设置逻辑
│   ├── lib/
│   │   ├── gist.js      # Gist API 操作
│   │   ├── storage.js   # 本地存储和同步逻辑
│   │   ├── crypto.js    # 加密和压缩
├── assets/
│   ├── icon16.png       # 扩展图标 (16x16)
│   ├── icon128.png      # 扩展图标 (128x128)
├── package.json         # Node.js 依赖
```

### 核心组件
1. **background.js**：
   - 处理 PAT 验证、同步调度（`chrome.alarms`）和 API 调用。
   - 监听标签保存/恢复事件。
2. **popup.js/html/css**：
   - 渲染标签和分组界面。
   - 处理保存、恢复、删除和手动同步。
3. **options.js/html**：
   - 配置 PAT，自动创建 Gist。
   - 显示同步状态和容量使用情况。
4. **gist.js**：
   - 管理 Gist 读写、压缩、加密和分片。
5. **storage.js**：
   - 管理 `chrome.storage.local` 和同步逻辑。
6. **crypto.js**：
   - 处理加密（`crypto-js`）和压缩（`pako`）。


## 开发路线图

### 阶段 1：核心功能
1. **任务**：初始化扩展
   - 创建 `manifest.json`，配置权限和基本信息。
   - 添加图标（`icon16.png`, `icon128.png`）。
2. **任务**：实现标签保存和恢复
   - 在 `popup.js` 中使用 `chrome.tabs.query` 保存标签。
   - 实现恢复功能，点击标签 URL 打开新标签。
3. **任务**：本地存储
   - 在 `storage.js` 中使用 `chrome.storage.local` 存储标签数据。
   - 实现分组管理（创建、编辑、删除）。
4. **任务**：导出/导入
   - 添加导出按钮，生成 JSON 文件。
   - 实现导入功能，解析 JSON 文件并合并数据。

### 阶段 2：GitHub Gist 同步
1. **任务**：PAT 认证
   - 在 `options.js` 中实现 PAT 输入和验证。
   - 存储 PAT 和自动创建的 Gist ID 到 `chrome.storage.local`。
2. **任务**：Gist 管理
   - 在 `gist.js` 中实现 `createGist`, `saveToGist` 和 `loadFromGist`。
   - 集成 `pako` 和 `crypto-js` 进行压缩和加密。
3. **任务**：分片支持
   - 实现 `saveWithSharding` 和 `shardData`。
   - 处理 `index.json` 的读写。
4. **任务**：同步逻辑
   - 在 `storage.js` 中实现 `syncWithGist` 和 `resolveConflict`。
   - 在 `background.js` 中设置定时同步（10 分钟）。
5. **任务**：离线和错误处理
   - 实现离线缓存（`chrome.storage.local`）。
   - 处理 API 速率限制（HTTP 429）和容量溢出。

### 阶段 3：界面与优化
1. **任务**：完善界面
   - 使用 Tailwind CSS 美化 `popup.html` 和 `options.html`。
   - 添加同步状态显示和容量监控（例如“750KB / 1MB”）。
2. **任务**：测试
   - 测试大容量数据（5000 个标签）。
   - 测试多设备同步和离线场景。
   - 验证 API 速率限制和冲突解决。
3. **任务**：文档与发布
   - 完善用户文档（安装、配置、使用）。
   - 发布到 Chrome 网上应用店。

## 安装与设置

### 开发环境
1. 克隆仓库：`git clone <repository-url>`
2. 安装依赖：`npm install`
3. 加载扩展：
   - 打开 Chrome，进入 `chrome://extensions/`。
   - 启用“开发者模式”，点击“加载已解压的扩展”，选择项目文件夹。

### 用户配置
1. **生成 PAT**：
   - 访问 `https://github.com/settings/tokens`，点击“Generate new token”。
   - 勾选 `gist` 权限，生成 PAT 并复制。
2. **设置扩展**：
   - 安装扩展（从 Chrome 网上应用店或手动加载）。
   - 点击扩展图标，进入设置页面。
   - 在“GitHub Personal Access Token”输入框粘贴 PAT，点击“设置 PAT”。
   - 扩展自动创建私有 Gist，无需额外配置。
3. **使用**：
   - 保存标签：点击“保存所有标签”。
   - 管理标签：查看、恢复或删除分组。
   - 同步：自动每 10 分钟同步，或点击“立即同步”。
   - 容量管理：监控使用量，清理旧分组或导出备份。

## 隐私与安全
- **数据加密**：使用 `crypto-js` 加密 URL 和标题。
- **存储**：
  - 本地：`chrome.storage.local`。
  - 云端：加密后存储在用户个人私有 Gist。
- **隐私**：
  - 每个用户的数据隔离，仅存储到其 GitHub 账户的 Gist。
  - 不收集无关数据。
  - 用户可随时删除 Gist 或本地数据。
- **安全**：
  - GitHub API 使用 HTTPS。
  - 用户需妥善保管 PAT，防止泄露。
  - 处理 API 速率限制和容量溢出。

## 注意事项
- **容量限制**：
  - 单文件 1MB，通过压缩和分片支持约 10,000-20,000 个标签。
  - 总大小受 Gist 限制（约 10MB）。
- **同步**：
  - 10 分钟轮询，增量同步减少 API 调用。
  - 冲突解决基于分组 ID 和版本号，确保数据一致性。
  - 单次同步通常 2 次 API 调用（读取 + 写入）。
- **API 限制**：
  - GitHub API 限制 5000 次请求/小时，使用条件请求优化。
  - 处理 HTTP 429 错误，建议添加自动重试。
- **PAT 使用**：
  - 用户需确保 PAT 包含 `gist` 权限。
  - PAT 应安全存储，避免泄露。

## 开发资源
- **GitHub API**：https://docs.github.com/en/rest/gists
- **Chrome Extensions**：https://developer.chrome.com/docs/extensions/
- **依赖**：
  - `pako`：https://www.npmjs.com/package/pako
  - `crypto-js`：https://www.npmjs.com/package/crypto-js
  - `axios`：https://www.npmjs.com/package/axios
- **参考项目**：
  - [SyncMyCookie](https://github.com/Andiedie/sync-my-cookie)
  - [GistPad](https://github.com/vsls-contrib/gistpad)