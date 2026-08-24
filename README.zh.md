# DSH Timeline（@kindred7/dsh-timeline）

[![npm version](https://img.shields.io/npm/v/@kindred7/dsh-timeline)](https://www.npmjs.com/package/@kindred7/dsh-timeline)

dsh web 对话时间线插件：在对话界面左侧渲染一条极简的垂直刻度线，每一轮用户提问对应一个刻度，为长对话提供"全局地图"式的快速导航。

## 功能描述

**一句话简介**（可直接用作 GitHub About / 仓库描述）：

> @kindred7/dsh-timeline —— dsh web 对话导航时间线：左侧刻度标记每轮提问，悬停预览、点击定位、滚动跟随。

**详细功能：**

- 🧭 **对话快速导航**：每条用户提问在对话区左侧对应一条短刻度线；点击任意刻度，平滑滚动定位到对应消息；滚动浏览时自动高亮当前阅读位置所在的刻度
- 💬 **悬停预览**：鼠标悬停时刻度拉长并弹出毛玻璃 tooltip，显示该轮提问的完整内容
- ✨ **波纹动效**：悬停某刻度时，上下相邻刻度呈阶梯式长度衰减（波纹扩散），过渡动画细腻克制
- 📌 **自适应定位**：以对话容器为基准动态计算位置——侧边栏拉伸、窗口缩放、布局折叠时实时跟随，永不被遮挡；容器探测采用三级降级策略（消息行结构探测 → 语义标记 → 类名匹配），不依赖构建产物 hash 类名，跨版本、跨机器稳定可用
- 🌗 **明暗主题**：通过 CSS 变量适配 `prefers-color-scheme`，深浅色模式均自动切换
- ♿ **无障碍**：遵循 `prefers-reduced-motion` 关闭动效；刻度带 `aria-label` 支持读屏

## 快速开始

### 方式一：一条命令安装（推荐）

`dsh plugin --profile web <参数>` 会进入 web profile 目录（`%USERPROFILE%\.dsh\profiles\web`，首次使用自动创建）并把参数转发给 pnpm；安装/更新/卸载成功后自动对账 `dsh.profile.bundles`——凡是声明了 `dsh.bundle` 的依赖都会被自动注册，无需手动执行注册命令。

```powershell
# 从 npm 注册表安装——国内无需代理即可访问（npmmirror 自动同步）
dsh plugin --profile web add @kindred7/dsh-timeline

# 或从 GitHub 直装
dsh plugin --profile web add github:kindred-7/dsh-timeline

# 重启 DSH web 生效
dsh web
```

锁定版本与日常管理使用同一条命令：

```powershell
dsh plugin --profile web add @kindred7/dsh-timeline@0.4.0           # 锁定 npm 版本
dsh plugin --profile web update @kindred7/dsh-timeline              # 更新到最新
dsh plugin --profile web remove @kindred7/dsh-timeline              # 卸载（同时取消注册）
```

> npmmirror 镜像通常在发布后数分钟内自动同步；若刚发布的新版本在镜像上 404，稍等片刻重试，或临时在命令后追加 `--registry=https://registry.npmjs.org`。

### 方式二：在 profile 目录手动 pnpm 安装

在目标电脑上（需已安装 Node.js ≥ 18 和 pnpm）：

```powershell
# 1. 进入 dsh web profile 目录
cd %USERPROFILE%\.dsh\profiles\web

# 2. 安装（任选其一）
pnpm add @kindred7/dsh-timeline                       # npm 注册表最新版
pnpm add @kindred7/dsh-timeline@0.4.0                 # 锁定版本
pnpm add github:kindred-7/dsh-timeline                # 或 GitHub 最新 main 分支
pnpm add https://registry.npmjs.org/@kindred7/dsh-timeline/-/dsh-timeline-0.4.0.tgz

# 3. 注册到 dsh.profile.bundles
pnpm exec dsh-timeline-register

# 4. 重启
dsh web
```

卸载：

```powershell
pnpm exec dsh-timeline-register --remove
pnpm remove @kindred7/dsh-timeline
```

> npm 用户同样适用：`npm install github:kindred-7/dsh-timeline`

### 方式三：一键脚本安装（无需 Node/pnpm）

1. 将 `dsh-timeline-<版本>.zip` 解压到任意目录
2. 在 PowerShell 中进入插件目录并运行安装脚本：

```powershell
cd dsh-timeline
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
xcopy /E /I "<插件目录>" "%USERPROFILE%\.dsh\profiles\web\node_modules\@kindred7\dsh-timeline"
```

2. **编辑 web profile 配置**

打开 `%USERPROFILE%\.dsh\profiles\web\package.json`，添加：

```json
{
  "dependencies": {
    "@kindred7/dsh-timeline": "file:./node_modules/@kindred7/dsh-timeline"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@kindred7/dsh-timeline"
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
- 对话窗口会平滑滚动到对应的提问位置；即使已贴在对话最底部、或 AI 正在流式回复，点击跳转依然可靠
- 若目标提问已在物理滚动极限（如最新一条提问、且你正停在最底部），该行会短暂闪烁高亮提示"已在此处"——内容不足一屏时无法再滚动
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
dsh-timeline/
├── package.json          # 插件配置和依赖
├── cordis.patch.yml      # bundle patch 描述文件（DSH 注入用）
├── register.js           # 注册 CLI（bin: dsh-timeline-register）
├── install.ps1           # Windows 一键安装脚本
├── uninstall.ps1         # 卸载脚本
├── lib/
│   ├── index.js         # 插件入口
│   └── client.js        # 客户端实现（核心）
├── USAGE.md              # 使用指南
├── README.md             # 英文说明
└── README.zh.md          # 中文说明
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
Test-Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\@kindred7\dsh-timeline"
```

2. 检查 package.json 是否包含插件：
```powershell
Get-Content "$env:USERPROFILE\.dsh\profiles\web\package.json" | Select-String "kindred7"
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
cd dsh-timeline
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

## 贡献

欢迎提交 Issue 和 Pull Request！

### 开发规范

1. 遵循现有的代码风格
2. 添加必要的注释
3. 测试后再提交
4. 更新相关文档

## 更新记录

### 0.4.0

- **变更**：发布到 npm，包名 **@kindred7/dsh-timeline**（未加 scope 的 `dsh-timeline` 已被占用）；裸包名直装无需访问 GitHub，国内经 npmmirror 同步后可达
- **修复**：长对话最底部点击刻度跳转失效
  - trajectory/多标签场景同一会话视图会挂载多份，全局 DOM 查询可能命中隐藏副本导致滚了看不见——现在只认可见行，并用 `row.closest('[data-conversation-scroll]')` 解析滚动容器（与宿主同款语义）
  - 宿主的贴底跟随（ResizeObserver 回顶）会在动画头几帧把从底部启动的平滑滚动拽回——现在先瞬时预抬脱离贴底状态再平滑滚动
- **新增**：目标行已在物理滚动极限时，闪烁高亮代替无效滚动，给出明确的定位反馈
- **修复**：多视图挂载下当前阅读位置高亮可能跟随隐藏副本

### 0.3.0

- 首个公开发布版本

## 许可证

MIT License

## 致谢

感谢 DeepSeek Harness 团队提供的优秀插件系统！

