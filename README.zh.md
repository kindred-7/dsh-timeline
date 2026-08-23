# DSH 对话时间线插件

一个 DeepSeek Harness 客户端插件，在对话窗口左侧显示多轮对话的时间线标记。

## 功能特性

- 📍 **时间线标记**：在对话窗口左侧显示短线标记，每个用户提问对应一个标记
- ✨ **Hover 动效**：鼠标悬停时短线平滑变长，带有蓝色高亮和发光效果
- 💬 **Tooltip 预览**：悬停时显示提问的问题内容
- 🎯 **点击定位**：点击标记后平滑滚动到对应的对话位置

## 快速开始

### 方式一：pnpm 安装（推荐）

在目标电脑上（需已安装 Node.js 和 pnpm）：

```powershell
# 1. 进入 dsh web profile 目录
cd %USERPROFILE%\.dsh\profiles\web

# 2. 用 pnpm 安装插件包（tgz 文件路径按实际位置调整）
pnpm add D:\downloads\dsh-conversation-timeline-0.3.0.tgz

# 3. 注册到 dsh.profile.bundles
pnpm exec dsh-conversation-timeline-register

# 4. 重启
dsh web
```

卸载：

```powershell
pnpm exec dsh-conversation-timeline-register --remove
pnpm remove dsh-conversation-timeline
```

### 方式二：一键脚本安装（无需 Node/pnpm）

1. 将 `dsh-conversation-timeline-<版本>.zip` 解压到任意目录
2. 在 PowerShell 中进入插件目录并运行安装脚本：

```powershell
cd dsh-conversation-timeline
.\install.ps1
```

> 如遇执行策略限制，使用：
> `powershell -ExecutionPolicy Bypass -File .\install.ps1`

脚本会自动完成：复制文件到 `%USERPROFILE%\.dsh\profiles\web\node_modules\`、写入依赖声明、注册到 `dsh.profile.bundles`。支持重复运行（幂等覆盖更新）。

卸载：

```powershell
.\uninstall.ps1
```

### 手动安装

1. **复制插件文件**

```bash
# Windows（把 <插件目录> 替换为解压后的实际路径）
xcopy /E /I "<插件目录>" "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-conversation-timeline"
```

2. **编辑 web profile 配置**

打开 `%USERPROFILE%\.dsh\profiles\web\package.json`，添加：

```json
{
  "dependencies": {
    "dsh-conversation-timeline": "file:./node_modules/dsh-conversation-timeline"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-conversation-timeline"
      ]
    }
  }
}
```

3. **重启 DSH**

```bash
dsh web
```

## 使用说明

安装后，插件会自动在对话窗口左侧显示时间线标记：

### 查看时间线
- 每个用户提问会在左侧显示一个灰色短线标记
- 标记垂直居中排列，间距 6px

### 预览问题
- 将鼠标悬停在标记上
- 短线会从 12px 平滑扩展到 24px
- 颜色从灰色变为蓝色，并带有发光效果
- 显示问题的 tooltip 预览

### 快速定位
- 点击任意标记
- 对话窗口会平滑滚动到对应的提问位置
- 支持键盘导航（Tab 键切换标记）

## 技术实现

### 架构

```
┌─────────────────────────────────────┐
│   DSH Web Application               │
│  ┌──────────────────────────────┐  │
│  │  Sidebar  │  Conversation    │  │
│  │           │  ┌────────────┐  │  │
│  │           │  │ Timeline   │  │  │
│  │           │  │ Markers    │←─┼──┼─ Plugin
│  │           │  └────────────┘  │  │
│  │           │                  │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 核心代码

1. **监听会话消息**
```javascript
const session = useSession();
const snapshot = session?.getSnapshot();
const userMessages = snapshot.events
  .filter(event => event.kind === 'user/message')
  .map(event => ({
    id: event.id,
    content: event.content?.[0]?.text,
    seq: event.seq
  }));
```

2. **渲染时间线标记**
```javascript
<div className="timeline-container">
  {userMessages.map((message, index) => (
    <div
      key={message.id}
      className="timeline-marker"
      onClick={() => scrollToMessage(message.seq)}
      onMouseEnter={(e) => showTooltip(e, message)}
      onMouseLeave={hideTooltip}
    />
  ))}
</div>
```

3. **CSS 动效**
```css
.timeline-marker {
  width: 12px;
  height: 3px;
  background-color: #6b7280;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-marker:hover {
  width: 24px;
  background-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}
```

### 文件结构

```
dsh-conversation-timeline/
├── package.json          # 插件配置和依赖
├── README.md             # 英文说明
├── README.zh.md          # 中文说明
├── install.ps1           # Windows 安装脚本
├── lib/
│   ├── index.js         # 插件入口
│   └── client.js        # 客户端实现（核心）
└── docs/
    └── demo.md          # 演示说明
```

## 自定义样式

插件使用 CSS 类名，可以通过覆盖样式来定制外观：

```css
/* 在 web profile 的 cordis.patch.yml 中添加自定义样式 */

/* 修改标记颜色 */
.timeline-marker {
  background-color: #10b981; /* 绿色 */
}

/* 修改 hover 效果 */
.timeline-marker:hover {
  background-color: #059669;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
}

/* 修改时间线位置 */
.timeline-container {
  left: 80px; /* 调整距离左侧的距离 */
}
```

## 故障排除

### 插件未显示

1. 检查插件是否正确安装：
```powershell
Test-Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-conversation-timeline"
```

2. 检查 package.json 是否包含插件：
```powershell
Get-Content "$env:USERPROFILE\.dsh\profiles\web\package.json" | Select-String "dsh-conversation-timeline"
```

3. 重启 DSH web 应用

### 时间线位置不正确

如果时间线标记与侧边栏重叠，调整 `left` 值：

```css
.timeline-container {
  left: 80px; /* 增加这个值 */
}
```

### Tooltip 被裁剪

如果 tooltip 在屏幕边缘被裁剪，可以修改 tooltip 位置逻辑：

```javascript
// 在 client.js 中修改 tooltip 位置计算
const tooltipX = Math.min(rect.right + 10, window.innerWidth - 320);
```

## 开发

### 本地开发

1. 进入插件源码目录：
```bash
cd dsh-conversation-timeline
```

2. 修改代码后，重新安装到 profile：
```powershell
.\install.ps1
```

3. 刷新 DSH web 页面（Ctrl+F5）

### 调试

打开浏览器开发者工具（F12），查看：
- Console：查看插件日志
- Elements：检查 DOM 结构和样式
- Network：确认插件文件加载

## 兼容性

- ✅ DSH 0.1.1-rc.2+
- ✅ React 18+
- ✅ Windows 10/11
- ✅ Chrome/Edge/Firefox
- ⚠️ 仅支持 Web 平台

## 路线图

- [ ] 支持显示助手消息标记（不同颜色）
- [ ] 添加时间线缩略图预览
- [ ] 支持拖拽调整时间线位置
- [ ] 添加键盘导航支持（↑/↓ 键切换）
- [ ] 支持自定义标记样式（通过设置界面）
- [ ] 添加时间线搜索功能
- [ ] 支持折叠/展开时间线

## 贡献

欢迎提交 Issue 和 Pull Request！

### 开发规范

1. 遵循现有的代码风格
2. 添加必要的注释
3. 测试后再提交
4. 更新相关文档

## 许可证

MIT License

## 致谢

感谢 DeepSeek Harness 团队提供的优秀插件系统！

