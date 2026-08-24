// ============================================================================
// dsh-timeline 客户端半边（浏览器端插件）
//
// 整体结构：
//   1. 通过 window.__ModuleLoader__.load 注册模块（dsh 插件加载协议）
//   2. 注入样式表（时间轴刻度 + 悬浮提示的 CSS，含明暗主题适配）
//   3. ConversationTimeline 组件（读取会话消息 → 渲染左侧刻度条）
//   4. apply(ctx) 插件入口（把组件挂到宿主的 slot 上；动态定位在组件 effect 内）
// ============================================================================

// ----------------------------------------------------------------------------
// 1. 模块注册：dsh 的 client-modules 加载器要求每个 client.js 必须显式调用
//    __ModuleLoader__.load 并声明唯一 id，否则报
//    "loaded without registering ... via __ModuleLoader__.load"
// ----------------------------------------------------------------------------
window.__ModuleLoader__.load({
  // 插件唯一标识，必须与 package.json 的包名一致
  id: "@kindred7/dsh-timeline",
  // 工厂函数：require 由加载器注入，用于解析 react 等共享依赖
  factory: (require) => {
    // 构造 CommonJS 风格的 module/exports 对象（加载器按 CJS 约定收集导出）
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // 引入宿主提供的 React 与 JSX 运行时（不打包进 bundle，走共享依赖）
    let react_jsx_runtime = require("react/jsx-runtime");
    let react = require("react");

    // ==========================================================================
    // 2. 样式定义（CSS 字符串，稍后注入 <head>）
    // ==========================================================================
    const css = `
      /* ---- 时间轴容器：固定在视口左中部，垂直排列所有刻度 ---- */
      .timeline-container {
        position: fixed;          /* 相对视口定位，不随内容滚动 */
        left: 280px;              /* 初始位置，apply() 中会按实际布局动态修正 */
        top: 50%;                 /* 垂直居中起点 */
        transform: translateY(-50%); /* 向上平移自身高度一半，实现垂直居中 */
        display: flex;
        flex-direction: column;   /* 刻度自上而下排列 */
        gap: 10px;                 /* 相邻刻度间距 */
        z-index: 1000;            /* 覆盖在普通内容之上 */
        pointer-events: auto;     /* 允许接收鼠标事件（hover/click） */
        padding: 4px 0;
      }

      /* ---- 单个刻度：一条短横线，本身透明，实际线条由 ::before 绘制 ---- */
      .timeline-marker {
        width: 10px;
        height: 2px;
        background-color: transparent; /* 本体透明，视觉线条全靠 ::before */
        cursor: pointer;               /* 提示可点击跳转 */
        position: relative;
        padding: 5px 0;                /* 扩大可点击/悬停热区 */
        margin: -5px 0;                /* 负 margin 抵消 padding，保持视觉间距不变 */
        transition: all 0.15s ease-out; /* 宽度/颜色变化的过渡动画 */
      }

      /* ---- 刻度线的可见部分（::before 伪元素）---- */
      .timeline-marker::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        height: 2px;                                   /* 线条粗细 */
        width: 12px;                                   /* 默认长度 */
        background-color: var(--dsh-timeline-color, #4a5568); /* 颜色走 CSS 变量，便于明暗主题切换 */
        transform: translateY(-50%);                   /* 垂直对齐 */
        transition: all 0.15s ease-out;
        border-radius: 1px;
        opacity: 0.6;                                  /* 默认半透明，弱化存在感 */
      }

      /* ---- 悬停态：线条拉长到 24px、变亮、完全不透明。
              附带 .timeline-marker:hover.active::before 选择器：
              悬停时组件会同时挂 active 类，其规则(特异性 0,2,1)写在后面
              会把宽度压回 14px，这里用更高特异性(0,3,1)保证悬停恒为 24px ---- */
      .timeline-marker:hover::before,
      .timeline-marker:hover.active::before {
        background-color: var(--dsh-timeline-hover-color, #a0aec0);
        height: 2px;
        width: 32px;
        opacity: 1;
      }

      /* ---- 激活态：当前滚动位置对应的刻度，高亮显示 ---- */
      .timeline-marker.active::before {
        background-color: var(--dsh-timeline-active-color, #e2e8f0);
        height: 2px;
        width: 12px;
        opacity: 1;
      }

      /* ---- 波纹/阶梯效果：悬停某刻度时，上下相邻刻度依次变短，
              形成"以悬停点为中心向两侧衰减"的视觉波纹（最多影响 3 层）---- */
      .sibling-up-1::before,
      .timeline-marker.sibling-down-1::before {
        width: 20px;   /* 距悬停点 1 格：最长 */
      }
      .timeline-marker.sibling-up-2::before,
      .timeline-marker.sibling-down-2::before {
        width: 17px;    /* 距离 2 格：骤短 */
      }
      .timeline-marker.sibling-up-3::before,
      .timeline-marker.sibling-down-3::before {
        width: 12px;    /* 距离 3 格：最短（下限） */
      }

      /* ---- 悬浮提示框：显示该条消息的提问全文 ---- */
      .timeline-tooltip {
        position: fixed;             /* 跟随鼠标坐标绝对定位 */
        background-color: var(--dsh-tooltip-bg, rgba(15, 23, 42, 0.92));
        color: var(--dsh-tooltip-text, #e2e8f0);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;             /* 从 11px 调大，提升可读性 */
        line-height: 1.5;
        max-width: 280px;            /* 长提问自动折行 */
        max-height: 100px;           /* 最多显示约 5 行，超出截断 */
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        word-wrap: break-word;
        z-index: 1001;               /* 高于刻度层，避免被遮挡 */
        pointer-events: none;        /* 不拦截鼠标，防止 hover 抖动 */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        opacity: 0;                  /* 默认隐藏 */
        transition: opacity 0.12s ease;
        backdrop-filter: blur(4px);          /* 毛玻璃背景 */
        -webkit-backdrop-filter: blur(4px);  /* Safari 兼容 */
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* ---- 提示框可见态：淡入 ---- */
      .timeline-tooltip.visible {
        opacity: 1;
      }

      /* ---- 暗色主题配色变量 ---- */
      @media (prefers-color-scheme: dark) {
        :root {
          --dsh-timeline-color: #4a5568;       /* 默认刻度 */
          --dsh-timeline-hover-color: #a0aec0; /* 悬停刻度 */
          --dsh-timeline-active-color: #e2e8f0;/* 当前位置刻度 */
          --dsh-tooltip-bg: rgba(15, 23, 42, 0.92);
          --dsh-tooltip-text: #e2e8f0;
        }
      }

      /* ---- 亮色主题配色变量 ---- */
      @media (prefers-color-scheme: light) {
        :root {
          --dsh-timeline-color: #a0aec0;
          --dsh-timeline-hover-color: #4a5568;
          --dsh-timeline-active-color: #1a202c;
          --dsh-tooltip-bg: rgba(255, 255, 255, 0.95);
          --dsh-tooltip-text: #1a202c;
        }
      }

      /* ---- 无障碍：用户系统开启"减少动态效果"时禁用全部过渡动画 ---- */
      @media (prefers-reduced-motion: reduce) {
        .timeline-marker,
        .timeline-marker::before,
        .timeline-tooltip {
          transition: none;
        }
      }

      /* ---- 目标行闪烁提示：点击刻度时若物理上已无可滚动位移
              （如对话已在最底部、点最后几条消息），不执行无效滚动，
              改为闪烁高亮目标消息行，给用户明确的"已定位"反馈 ---- */
      @keyframes dsh-timeline-flash-kf {
        0%   { box-shadow: inset 0 0 0 2px rgba(96,165,250,.65); background-color: rgba(96,165,250,.14); }
        70%  { box-shadow: inset 0 0 0 2px rgba(96,165,250,.25); background-color: rgba(96,165,250,.06); }
        100% { box-shadow: inset 0 0 0 2px transparent; background-color: transparent; }
      }
      .dsh-timeline-flash {
        animation: dsh-timeline-flash-kf 1s ease-out 1;
        border-radius: 8px;
      }
      /* 减少动态效果时不播动画，保留一个静态描边（由定时器移除） */
      @media (prefers-reduced-motion: reduce) {
        .dsh-timeline-flash {
          animation: none;
          box-shadow: inset 0 0 0 2px rgba(96,165,250,.35);
        }
      }
    `;

    // --------------------------------------------------------------------------
    // 2.1 注入样式表：只在浏览器环境执行；用 tagId 做幂等去重（热更新时不重复插入）
    // --------------------------------------------------------------------------
    if (typeof document !== "undefined") {
      const tagId = "@kindred7/dsh-timeline/styles";
      if (document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
        const tag = document.createElement("style");
        tag.dataset.plugin = "@kindred7/dsh-timeline";   // 标记来源插件
        tag.dataset.pluginCss = tagId;                      // 去重依据
        tag.textContent = css;
        document.head.appendChild(tag);
      }
    }

    // --------------------------------------------------------------------------
    // 2.2 工具函数：提取一条用户消息的纯文本
    //     content 是消息块数组（可能含 text/image 等类型），这里只拼接文本块
    // --------------------------------------------------------------------------
    function messageText(content) {
      if (!Array.isArray(content)) return "";
      return content
        .map((block) => (block && block.type === "text" ? block.text : ""))
        .join("")
        .trim();
    }

    // --------------------------------------------------------------------------
    // 2.4 工具函数：闪烁高亮一行消息（点击刻度但无滚动位移时的定位反馈）。
    //     直接操作宿主 DOM 类名，动画结束后自动摘除；用元素上的定时器句柄
    //     保证连点时先清旧态，offsetWidth 强制重排以便重复触发同一动画。
    // --------------------------------------------------------------------------
    function flashRowTarget(row) {
      const cls = "dsh-timeline-flash";
      if (row.__dshTimelineFlashTimer !== undefined) {
        clearTimeout(row.__dshTimelineFlashTimer);
      }
      row.classList.remove(cls);
      void row.offsetWidth; // 强制重排：允许对同一行连续重新触发动画
      row.classList.add(cls);
      row.__dshTimelineFlashTimer = setTimeout(() => {
        row.classList.remove(cls);
        delete row.__dshTimelineFlashTimer;
      }, 1100);
    }

    // --------------------------------------------------------------------------
    // 2.3 工具函数：探测会话滚动容器（组件内动态定位使用）。
    //     不依赖具体类名：wSkVaW_ 这类前缀是构建产物 hash，每个版本都可能变，
    //     因此按「消息行祖先回溯 → 结构语义 → 已知类名」三级降级探测。
    // --------------------------------------------------------------------------
    function findConversationEl() {
      // 第一级（跨版本通用）：宿主给每条消息行都打上稳定的 data-chat-anchor-key。
      // 从任一消息行向上找第一个纵向可滚动（overflow-y: auto/scroll）的祖先，
      // 即为会话滚动容器（ConversationRoot 的 [data-conversation-scroll]）。
      const row = document.querySelector("[data-chat-anchor-key]");
      if (row) {
        let el = row.parentElement;
        while (el && el !== document.body) {
          const oy = getComputedStyle(el).overflowY;
          if (oy === "auto" || oy === "scroll") return el;
          el = el.parentElement;
        }
      }

      // 第二级：结构/语义标记，与样式无关
      const structural = [
        "[data-conversation-scroll]", // 宿主显式标注的滚动容器
        "[role='main']",              // ARIA 地标
        "main"                        // HTML5 语义标签
      ];
      for (const sel of structural) {
        const found = document.querySelector(sel);
        if (found) return found;
      }

      // 第三级：已知类名匹配（仅当前版本构建命中，作最后兜底）
      const byClass = [
        ".wSkVaW_viewArea",
        "[class*='viewArea']",
        "[class*='centerCol']",
        "[class*='conversation']"
      ];
      for (const sel of byClass) {
        const found = document.querySelector(sel);
        if (found) return found;
      }
      return null;
    }

    // ==========================================================================
    // 3. 时间轴组件
    //    props.useSession —— 宿主注入的会话 store hook（zustand 风格选择器订阅）
    // ==========================================================================
    function ConversationTimeline({ useSession }) {
      // --- 3.1 组件内部状态 ---
      const [hoveredIndex, setHoveredIndex] = react.useState(null); // 当前悬停的刻度下标
      const [activeIndex, setActiveIndex] = react.useState(null);   // 当前滚动位置对应的刻度下标
      const [tooltip, setTooltip] = react.useState({                // 悬浮提示状态（位置+文本+可见性）
        visible: false, x: 0, y: 0, text: ''
      });
      const containerRef = react.useRef(null); // 指向刻度容器 DOM，供波纹效果直接操作 classList

      // --- 3.2 订阅会话数据：只取 chat 树（消息节点集合），变化时才触发重渲染 ---
      const chat = useSession((s) => s.chat);

      // --- 3.3 从 chat 树中筛出全部用户消息（即时间轴的每一个刻度）---
      const userMessages = react.useMemo(() => {
        const out = [];
        if (!chat) return out;
        for (const key of chat.order) {            // 按 会话顺序 遍历消息 key
          const node = chat.nodes.get(key);        // 取出消息节点
          if (!node || node.kind !== "user") continue; // 只保留用户消息，忽略 AI 回复
          out.push({
            key: node.key,                         // 节点唯一键（React key / DOM 定位锚点）
            seq: node.anchorSeq,                   // 锚点序号（预留排序用途）
            text: messageText(node.data?.content)  // 提问全文（tooltip 用）
          });
        }
        return out;
      }, [chat]);

      // --- 3.4 滚动监听：计算"当前读到哪条用户消息"，同步高亮 activeIndex ---
      react.useEffect(() => {
        if (!userMessages.length) return undefined;

        // 解析活动会话的滚动容器：从「可见」消息行向上 closest（与 3.6 同款
        // 语义）。trajectory/多标签场景同一会话视图会挂载多份，全局
        // querySelector 可能命中隐藏副本——监听了错误的容器，高亮就乱了。
        let chatContainer = null;
        outer: for (const msg of userMessages) {
          const rows = document.querySelectorAll(`[data-chat-anchor-key="${CSS.escape(msg.key)}"]`);
          for (const row of rows) {
            if (row.getClientRects().length === 0) continue; // 跳过不可见副本
            const sc = row.closest("[data-conversation-scroll]");
            if (sc) { chatContainer = sc; break outer; }
          }
        }
        if (!chatContainer) chatContainer = document.querySelector('[data-conversation-scroll]');
        if (!chatContainer) return undefined;

        const handleScroll = () => {
          // 视线基准线 = 滚动容器的垂直中点
          const containerRect = chatContainer.getBoundingClientRect();
          const containerCenter = containerRect.top + containerRect.height / 2;

          // 从最新消息往前找：第一条"顶部已越过中线"的消息即为当前位置
          for (let i = userMessages.length - 1; i >= 0; i--) {
            const msg = userMessages[i];
            // 同样只认可见的那份行
            const rows = document.querySelectorAll(`[data-chat-anchor-key="${CSS.escape(msg.key)}"]`);
            const row = Array.from(rows).find((el) => el.getClientRects().length > 0);
            if (row) {
              const rowRect = row.getBoundingClientRect();
              if (rowRect.top <= containerCenter) {
                setActiveIndex(i);
                break; // 倒序找到的第一个就是最新的，立即结束
              }
            }
          }
        };

        // 绑定滚动事件；组件卸载/消息列表变化时解绑，避免泄漏
        chatContainer.addEventListener('scroll', handleScroll);
        handleScroll(); // 初始先算一次，保证首屏高亮正确
        return () => chatContainer.removeEventListener('scroll', handleScroll);
      }, [userMessages]);

      // --- 3.5 波纹效果：悬停某刻度时，给上下相邻刻度加 sibling-up-N /
      //         sibling-down-N 类（N=距离），配合 CSS 实现"阶梯变短"动画。
      //         直接操作 DOM class 而非 state，避免高频重渲染 ---
      react.useEffect(() => {
        if (!containerRef.current) return;
        const markers = containerRef.current.querySelectorAll('.timeline-marker');

        markers.forEach((marker, index) => {
          // 先清掉上一轮的所有波纹类，保证状态干净
          marker.classList.remove(
            'sibling-up', 'sibling-down',
            'sibling-up-1', 'sibling-up-2', 'sibling-up-3',
            'sibling-down-1', 'sibling-down-2', 'sibling-down-3'
          );

          if (hoveredIndex !== null) {
            if (index === hoveredIndex) {
              // 当前 - no extra class needed
            } else if (index < hoveredIndex) {
              // 位于悬停点上方的刻度：按距离加 sibling-up-N
              const distance = hoveredIndex - index;
              if (distance <= 3) {
                marker.classList.add(`sibling-up-${distance}`);
              }
            } else {
              // 位于悬停点下方的刻度：按距离加 sibling-down-N
              const distance = index - hoveredIndex;
              if (distance <= 3) {
                marker.classList.add(`sibling-down-${distance}`);
              }
            }
          }
        });
      }, [hoveredIndex, userMessages]);

      // --- 3.6 点击刻度：平滑滚动到对应的用户消息行 ---
      //
      //     三条硬约束（都踩过坑）：
      //       ① 行定位必须取「可见」的那份行：trajectory/标签页等场景会把同
      //          一会话视图挂载多份，document.querySelector 只返回文档顺序
      //          第一份——可能是隐藏副本，滚了也白滚；
      //       ② 滚动容器必须用 row.closest('[data-conversation-scroll]') 解析
      //          （与宿主 scrollerOf 同款语义），绝不能全局 querySelector：
      //          多视图下全局第一份几乎总是错的；
      //       ③ 从贴底状态出发要先「瞬时脱离贴底」再平滑动画：宿主 ChatView
      //          有 FOLLOW_THRESHOLD=24px 的贴底跟随（ResizeObserver 触发
      //          scrollTop=scrollHeight），贴底时启动的平滑动画会在头几帧被
      //          它拽回底部，表现为点击彻底失灵。
      //
      //     另外不用 scrollIntoView(block:'start') 的老理由仍然成立：目标
      //     scrollTop 超出可滚上限时浏览器静默钳制（最底部点最后几条消息
      //     必然零位移），且无法感知该情形给出反馈。
      const handleClick = react.useCallback((key) => {
        // ① 取可见的那份行
        const selector = `[data-chat-anchor-key="${CSS.escape(key)}"]`;
        const row = Array.from(document.querySelectorAll(selector))
          .find((el) => el.getClientRects().length > 0);
        if (!row) return;

        const reduced = typeof matchMedia === "function"
          && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const behavior = reduced ? "auto" : "smooth";

        // ② 滚动容器：closest 优先，退回通用探测并校验包含关系
        let container = row.closest("[data-conversation-scroll]");
        if (!container) {
          const probed = findConversationEl();
          container = probed && probed.contains(row) ? probed : null;
        }
        if (!container) {
          row.scrollIntoView({ behavior, block: "start" });
          return;
        }

        const GAP = 12; // 行顶缘与容器顶缘的呼吸边距
        const floorOf = () =>
          Math.max(container.scrollHeight - container.clientHeight, 0);

        // 计算目标（重新钳制）并滚动；零位移则闪烁反馈
        const navigate = () => {
          const cRect = container.getBoundingClientRect();
          const rRect = row.getBoundingClientRect();
          const target = Math.min(
            Math.max(container.scrollTop + (rRect.top - cRect.top) - GAP, 0),
            floorOf(),
          );
          if (Math.abs(target - container.scrollTop) < 1) {
            // 物理上已无可滚动位移（如已在最底部点最后一条）：
            // 闪烁高亮代替无效滚动，给明确的"已在此处"反馈
            flashRowTarget(row);
            return;
          }
          container.scrollTo({ top: target, behavior });
        };

        // ③ 贴底预检：先瞬时上抬 64px（> 宿主阈值 24px）让宿主解除贴底
        //    跟随状态，隔两帧（等宿主 scroll handler 跑完）再启动平滑动画，
        //    避免动画头几帧被 ResizeObserver 回顶拽回。
        if (floorOf() - container.scrollTop <= 48) {
          container.scrollTop = Math.max(container.scrollTop - 64, 0);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            // 上抬后布局几何未变，但 scrollTop 变了，重新计算再滚
            const cRect = container.getBoundingClientRect();
            const rRect = row.getBoundingClientRect();
            const target = Math.min(
              Math.max(container.scrollTop + (rRect.top - cRect.top) - GAP, 0),
              floorOf(),
            );
            if (Math.abs(target - container.scrollTop) < 1) {
              flashRowTarget(row);
              return;
            }
            container.scrollTo({ top: target, behavior });
          }));
          return;
        }

        navigate();
      }, []);

      // --- 3.7 鼠标移入刻度：记录下标（触发布纹效果）并弹出 tooltip，
      //           tooltip 定位在刻度右侧 8px 处，与刻度顶部对齐 ---
      const handleMouseEnter = react.useCallback((e, message, index) => {
        setHoveredIndex(index);
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: rect.right + 30, // 右侧偏移：刻度线右缘再留 20px 间距
          y: rect.top,
          text: message.text
        });
      }, []);

      // --- 3.8 鼠标移出：清除悬停下标并隐藏 tooltip ---
      const handleMouseLeave = react.useCallback(() => {
        setHoveredIndex(null);
        setTooltip({ visible: false, x: 0, y: 0, text: '' });
      }, []);

      // --- 3.9 动态定位：时间轴是 fixed 定位，left 以会话滚动容器左缘 +20px 为基准。
      //        过去在 apply() 里只靠两次 setTimeout 探测：宿主异步渲染完成前刻度
      //        尚未挂载，之后便再也不校正——这就是“识别不到对话容器”的原因。
      //        现改为组件内 effect：刻度挂载（userMessages 变化）时必然已在会话
      //        视图内，立即贴齐一次；再以 ResizeObserver 跟随容器几何变化（侧栏
      //        拖宽/折叠、窗口缩放），容器元素更换时自动换绑观察目标。
      react.useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        let observed = null;   // 当前被观察的容器元素
        let raf = 0;           // 极端时序下下一帧补测的句柄

        const place = () => {
          const target = findConversationEl();
          if (!target) return false;
          el.style.left = `${target.getBoundingClientRect().left + 20}px`;
          if (observed !== target) {
            if (observed !== null) observer.unobserve(observed);
            observed = target;
            observer.observe(target);
          }
          return true;
        };
        const observer = new ResizeObserver(place);

        if (!place()) raf = requestAnimationFrame(place); // 容器尚未就绪则隔帧补测
        window.addEventListener("resize", place);
        return () => {
          if (raf) cancelAnimationFrame(raf);
          window.removeEventListener("resize", place);
          observer.disconnect();
        };
      }, [userMessages]);

      // --- 3.10 渲染守卫：无会话数据或没有用户消息时不渲染任何内容 ---
      if (!chat || userMessages.length === 0) {
        return null;
      }

      // --- 3.11 渲染：Fragment 包裹两块内容 ---
      //      a) 刻度容器：每条用户消息渲染一个可点击的 marker
      //      b) 悬浮提示：条件渲染，仅 tooltip.visible 时挂载
      return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
        children: [
          // a) 时间轴刻度列表
          react_jsx_runtime.jsx("div", {
            ref: containerRef,
            className: "timeline-container",
            children: userMessages.map((message, index) =>
              react_jsx_runtime.jsx("div", {
                // 同时满足"正在悬停"或"处于当前阅读位置"时高亮
                className: `timeline-marker ${hoveredIndex === index ? 'active' : ''} ${activeIndex === index ? 'active' : ''}`,
                onClick: () => handleClick(message.key),                    // 点击跳转
                onMouseEnter: (e) => handleMouseEnter(e, message, index),   // 悬停弹提示+波纹
                onMouseLeave: handleMouseLeave,                             // 移出复位
                "aria-label": `Jump to message ${index + 1}`                // 无障碍描述
              }, message.key) // 以消息 key 作为 React key，保证复用与顺序稳定
            )
          }),
          // b) 悬浮提示框（fixed 定位，坐标来自 handleMouseEnter）
          tooltip.visible && react_jsx_runtime.jsx("div", {
            className: `timeline-tooltip ${tooltip.visible ? 'visible' : ''}`,
            style: { left: `${tooltip.x}px`, top: `${tooltip.y}px` },
            children: tooltip.text
          })
        ]
      });
    }

    // ==========================================================================
    // 4. 插件接入声明与入口
    // ==========================================================================

    // 声明本插件依赖宿主的 "slots" 服务（插槽系统），加载器据此注入 ctx.slots
    const inject = ["slots"];

    // 插件入口：宿主加载本模块后调用 apply(ctx)
    function apply(ctx) {
      // 4.1 把 ConversationTimeline 注册为会话头部操作区的 slot 组件；
      //     order: 90 控制其在同槽位多个组件中的排布顺序
      ctx.slots.inject("conversation.session.header.actions", () =>
        ctx.slots.register(
          {
            name: "conversation.session.header.actions", // 目标插槽名
            id: "conversation-timeline",                 // 本组件在该插槽内的 id
            order: 90                                    // 排序权重
          },
          ConversationTimeline
        )
      );

      // 4.2 动态定位已移入 ConversationTimeline 的 effect（见 3.9）：组件挂载 /
      //     消息变化时立即贴齐会话滚动容器，并以 ResizeObserver 持续跟随几何
      //     变化。原先在 apply() 里靠 setTimeout 探测的写法，会在宿主异步渲染
      //     完成前空转两次后放弃，导致“识别不到对话容器”、时间轴停在初始 280px。
    }

    // ---------------------------------------------------------------------------
    // 5. 导出：apply 为宿主必需入口；inject 声明依赖；组件另行导出便于测试/复用
    // ---------------------------------------------------------------------------
    exports.apply = apply;
    exports.inject = inject;
    exports.ConversationTimeline = ConversationTimeline;

    return module.exports;
  }
});
