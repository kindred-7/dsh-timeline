# DSH Conversation Timeline Plugin - 使用指南

## 🎉 安装完成！

插件已成功安装到 DSH web profile。

## 📍 插件位置

```
C:\Users\kindr\.dsh\profiles\web\node_modules\dsh-conversation-timeline\
```

## 🚀 启动插件

重启 DSH web 应用：

```bash
dsh web
```

或者如果已经在运行，刷新页面（Ctrl+F5 或 Cmd+Shift+R）

## 🎨 功能演示

### 1. 时间线标记

启动后，你会在对话窗口左侧看到一组灰色短线标记：

```
┌─────────────────────────────────────┐
│  Sidebar  │  Conversation          │
│           │                        │
│           │  ──  ← 标记 1          │
│           │                        │
│           │  ──  ← 标记 2          │
│           │                        │
│           │  ──  ← 标记 3          │
│           │                        │
└─────────────────────────────────────┘
```

每个标记对应一个用户提问。

### 2. Hover 效果

将鼠标悬停在标记上：

- **之前**：灰色短线，12px 宽
- **之后**：蓝色短线，24px 宽，带发光效果
- **动画**：0.25s 平滑过渡

```
正常状态：  ──────  (灰色, 12px)
Hover 状态：────────────  (蓝色, 24px, 发光)
```

### 3. Tooltip 预览

Hover 时会显示问题的 tooltip：

```
┌──────────────────────┐
│  What is DeepSeek?   │  ← Tooltip
└──────────────────────┘
      ↑
   ──────  (标记)
```

### 4. 点击定位

点击任意标记，对话窗口会平滑滚动到对应的提问位置。

## 🔧 自定义配置

### 修改时间线位置

如果时间线与侧边栏重叠，编辑：

```
C:\Users\kindr\.dsh\profiles\web\node_modules\dsh-conversation-timeline\lib\client.js
```

找到：

```css
.timeline-container {
  left: 70px;  /* 修改这个值 */
}
```

### 修改颜色方案

在同一个文件中，修改 CSS 变量：

```css
/* 默认颜色 */
.timeline-marker {
  background-color: #6b7280;  /* 灰色 */
}

.timeline-marker:hover {
  background-color: #3b82f6;  /* 蓝色 */
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}
```

你可以改成任何你喜欢的颜色，例如：

```css
/* 绿色主题 */
.timeline-marker {
  background-color: #10b981;
}

.timeline-marker:hover {
  background-color: #059669;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

/* 紫色主题 */
.timeline-marker {
  background-color: #8b5cf6;
}

.timeline-marker:hover {
  background-color: #7c3aed;
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
}
```

## 🐛 故障排除

### 问题：插件未显示

**解决方案：**

1. 检查插件是否正确加载：
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 应该看到 "[dsh-conversation-timeline] Plugin loaded"

2. 检查 package.json：
   ```powershell
   Get-Content "$env:USERPROFILE\.dsh\profiles\web\package.json"
   ```
   
   确保包含：
   ```json
   "dsh": {
     "profile": {
       "bundles": [
         "@deepseek-ai/dsh-base",
         "@deepseek-ai/dsh-web-app",
         "dsh-conversation-timeline"
       ]
     }
   }
   ```

3. 重启 DSH：
   ```bash
   # 停止当前运行的 DSH
   # 然后重新启动
   dsh web
   ```

### 问题：时间线位置不对

**解决方案：**

调整 `left` 值，参考上面的"修改时间线位置"部分。

### 问题：Tooltip 被裁剪

**解决方案：**

修改 tooltip 位置逻辑，在 `client.js` 中找到：

```javascript
setTooltip({
  visible: true,
  x: rect.right + 10,  // 修改这里
  y: rect.top,
  text: message.content
});
```

改为：

```javascript
const tooltipX = Math.min(rect.right + 10, window.innerWidth - 320);
setTooltip({
  visible: true,
  x: tooltipX,
  y: rect.top,
  text: message.content
});
```

## 📊 性能影响

- **内存**：< 1MB
- **CPU**：仅在 hover 时触发，几乎无影响
- **渲染**：使用 CSS 过渡，GPU 加速

## 🔄 更新插件

当有新版本时：

1. 更新源目录的文件：
   ```bash
   # 在源目录修改代码
   cd C:\Users\kindr\dsh-conversation-timeline
   ```

2. 重新运行安装脚本：
   ```powershell
   .\install.ps1
   ```

3. 刷新 DSH web 页面

## 📝 卸载插件

1. 编辑 package.json：
   ```powershell
   notepad "$env:USERPROFILE\.dsh\profiles\web\package.json"
   ```

2. 删除以下内容：
   - `dependencies` 中的 `"dsh-conversation-timeline"`
   - `bundles` 数组中的 `"dsh-conversation-timeline"`

3. 删除插件目录：
   ```powershell
   Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-conversation-timeline"
   ```

4. 重启 DSH

## 💡 提示和技巧

### 快速导航

- 使用 Tab 键在标记之间切换
- 使用 Enter 键激活当前标记
- 使用 Esc 键关闭 tooltip

### 键盘快捷键

```
Tab        - 切换到下一个标记
Shift+Tab  - 切换到上一个标记
Enter      - 跳转到标记对应的消息
Esc        - 关闭 tooltip
```

### 与其他插件配合

这个插件与其他 DSH 插件完全兼容，不会影响：
- Sidebar 插件
- Trajectory 插件
- Goal 插件
- 其他 conversation 插件

## 🎓 学习资源

- [DSH 插件开发文档](https://github.com/deepseek-ai/deepseek-harness)
- [React 官方文档](https://react.dev/)
- [CSS 过渡动画](https://developer.mozilla.org/docs/Web/CSS/CSS_Transitions)

## 🤝 反馈和建议

如果你有任何问题或建议，欢迎：
- 提交 Issue
- 提交 Pull Request
- 联系开发者

## 📄 许可证

MIT License - 自由使用、修改和分发

