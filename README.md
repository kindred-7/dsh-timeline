# DSH Conversation Timeline Plugin

一个 DeepSeek Harness 客户端插件，在对话窗口左侧显示多轮对话的时间线标记。

## 功能特性

- 📍 **时间线标记**：在对话窗口左侧显示短线标记，每个用户提问对应一个标记
- ✨ **Hover 动效**：鼠标悬停时短线平滑变长，带有蓝色高亮和发光效果
- 💬 **Tooltip 预览**：悬停时显示提问的问题内容
- 🎯 **点击定位**：点击标记后平滑滚动到对应的对话位置

## 安装

### 方法 1：作为本地插件安装

1. 将插件目录复制到 DSH profiles 目录：

```bash
# Windows（把 <插件目录> 替换为解压后的实际路径）
xcopy /E /I "<插件目录>" "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-timeline"

# Linux/Mac
cp -r dsh-timeline ~/.dsh/profiles/web/node_modules/
```

2. 编辑 web profile 的 `package.json`，添加插件依赖：

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-timeline": "file:./node_modules/dsh-timeline"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-timeline"
      ]
    }
  }
}
```

3. 重启 DSH web 应用

### 方法 2：开发模式

1. 在插件目录运行：

```bash
cd dsh-timeline
pnpm link --global
```

2. 在 web profile 目录链接：

```bash
cd ~/.dsh/profiles/web
pnpm link dsh-timeline
```

3. 重启 DSH web 应用

## 使用方法

安装后，插件会自动在对话窗口左侧显示时间线标记：

1. **查看时间线**：每个用户提问会在左侧显示一个灰色短线标记
2. **预览问题**：将鼠标悬停在标记上，短线会变长并显示蓝色高亮，同时显示问题的 tooltip
3. **快速定位**：点击标记，对话窗口会平滑滚动到对应的提问位置

## 技术细节

### 插件结构

```
dsh-timeline/
├── package.json          # 插件配置和依赖
├── lib/
│   ├── index.js         # 插件入口
│   └── client.js        # 客户端实现
└── README.md            # 说明文档
```

### 核心实现

- 使用 `useSession()` hook 监听当前会话
- 从 session snapshot 中提取 `user/message` 事件
- 使用 React 组件渲染时间线标记
- CSS 过渡实现平滑的 hover 动效
- 使用 `scrollIntoView()` 实现点击定位

### 样式定制

插件使用 CSS 变量和类名，可以通过覆盖样式来定制外观：

```css
/* 修改标记颜色 */
.timeline-marker {
  background-color: #your-color;
}

/* 修改 hover 效果 */
.timeline-marker:hover {
  background-color: #your-hover-color;
  box-shadow: 0 0 12px rgba(your-rgb, 0.6);
}
```

## 兼容性

- 需要 DSH 0.1.1-rc.2 或更高版本
- 需要 React 18+
- 仅支持 Web 平台

## 已知限制

- 时间线标记使用 `position: fixed`，在某些布局下可能需要调整位置
- Tooltip 位置基于鼠标位置计算，在屏幕边缘可能会被裁剪
- 仅显示用户消息，不显示助手消息或系统消息

## 开发计划

- [ ] 支持显示助手消息标记
- [ ] 添加时间线缩略图预览
- [ ] 支持拖拽调整时间线位置
- [ ] 添加键盘导航支持
- [ ] 支持自定义标记样式

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

