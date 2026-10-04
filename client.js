/**
 * dsh-approval-gate — 自动审批审查界面（浏览器端 bundle）
 *
 * 提供两处 UI（严格按 DSH 设计语言，--dsw-alias-* tokens）：
 * 1. ✅ 自动放行提示条：conversation.input.dock（输入框上方独立行，order=30，
 *    排在 todo/goal/queue 之下；无事件时完全隐藏不占位；不随流式对话滚动）
 * 2. 「审批」历史视图：conversation.view（order=20，chat=0/trajectory=10 →
 *    tab 显示在「轨迹」右侧），展示当前会话所有自动放行的动作时间线
 *    （命令、原因、涉及文件、判定路径、时间）
 * 3. 设置页「自动审批」分区：settings.section（order=60），规则管理与一键初始化
 *
 * 文案（v0.6.0+）：所有界面文案注册在 locale 命名空间 dshApprovalGate 下
 * （ctx.locale.register(NS, { zh, en })，随 DSH 设置 → 通用 → 语言 即时切换；
 * 插槽 label 用 thunk 声明，账本投影在 locale revision 变化时经 resolveSlotLabel 重读）。
 * 老版宿主没有 locale 服务时回退 zh 词典直查（fallbackT）。
 *
 * 数据源：轮询 host 提供的 GET /api/auto-approve/events?sessionId=&since=
 * （events.jsonl 由 host 插件在每次自动放行时追加）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-approval-gate',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const CSS = `
.ag-notice{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto;flex:none}
.ag-notice-card{box-sizing:border-box;display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:6px 10px 6px 12px;box-shadow:var(--dsw-shadow-lv1)}
.ag-notice-card-pending{border-color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary)}
.ag-notice-card-manual{border-color:var(--dsw-alias-state-warn-primary)}
.ag-notice-glyph{color:var(--dsw-alias-state-success-primary);flex:none;display:inline-flex;align-items:center;justify-content:center}
.ag-notice-glyph-warn{color:var(--dsw-alias-state-warn-label);flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:16px;width:16px;height:16px}
.ag-notice-glyph-err{color:var(--dsw-alias-state-error-primary);flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:16px;width:16px;height:16px}
.ag-notice-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.ag-notice-head{display:flex;align-items:center;gap:8px;min-width:0}
.ag-notice-tool{flex:none;color:var(--dsw-alias-label-primary);font:500 12px/18px var(--ds-font-family-code)}
.ag-notice-text{flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.ag-notice-meta{display:flex;align-items:center;gap:8px}
.ag-tag{box-sizing:border-box;flex:none;height:18px;color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);border-radius:9px;align-items:center;padding:0 8px;font-size:11px;line-height:18px;display:inline-flex;letter-spacing:.02em}
.ag-tag-neutral{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform)}
.ag-tag-warn{box-sizing:border-box;flex:none;height:18px;color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);border-radius:9px;align-items:center;padding:0 8px;font-size:11px;line-height:18px;display:inline-flex;letter-spacing:.02em}
.ag-tag-err{box-sizing:border-box;flex:none;height:18px;color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger);border-radius:9px;align-items:center;padding:0 8px;font-size:11px;line-height:18px;display:inline-flex;letter-spacing:.02em}
.ag-time{flex:none;color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}
.ag-notice-close{width:24px;height:24px;flex:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:none;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0}
.ag-notice-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.ag-view{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);position:relative}
.ag-view::after{content:"";pointer-events:none;position:absolute;left:0;right:0;bottom:0;height:32px;z-index:3;background:linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-layer-1) 0%, transparent) 0px, var(--dsw-alias-bg-layer-1) 32px)}
.ag-view-head{box-sizing:border-box;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);padding:10px 14px 8px;display:flex;flex-direction:column;gap:2px}
.ag-view-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.ag-view-sub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.ag-list{flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px 14px 48px;display:flex;flex-direction:column;gap:2px}
.ag-row{box-sizing:border-box;display:flex;gap:10px;padding:9px 10px;border-radius:10px;transition:background .1s ease}
.ag-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ag-row-rail{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:2px}
.ag-row-glyph{color:var(--dsw-alias-state-success-primary);flex:none;display:inline-flex}
.ag-row-glyph-warn{color:var(--dsw-alias-state-warn-label);flex:none;display:inline-flex;font-size:12px;line-height:16px;width:14px;height:14px;align-items:center;justify-content:center}
.ag-row-glyph-err{color:var(--dsw-alias-state-error-primary);flex:none;display:inline-flex;font-size:12px;line-height:16px;width:14px;height:14px;align-items:center;justify-content:center}
.ag-row-line{flex:1 1 auto;flex:none;width:1px;background:var(--dsw-alias-border-l1);min-height:10px}
.ag-row:last-child .ag-row-line{display:none}
.ag-row-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
.ag-row-top{display:flex;align-items:center;gap:8px;min-width:0}
.ag-row-tool{flex:none;color:var(--dsw-alias-label-primary);font:500 12px/18px var(--ds-font-family-code)}
.ag-row-reason{flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;word-break:break-all;white-space:pre-wrap}
.ag-row-files{display:flex;flex-wrap:wrap;gap:4px}
.ag-file-chip{box-sizing:border-box;max-width:260px;height:20px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:5px;align-items:center;padding:0 7px;font:11px/18px var(--ds-font-family-code);display:inline-flex;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.ag-empty{flex:1 1 auto;color:var(--dsw-alias-label-tertiary);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:20px;padding:24px}
.ag-loading{flex:1 1 auto;color:var(--dsw-alias-label-tertiary);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:20px;padding:24px}
.ag-mono{font-family:var(--ds-font-family-code)}
.ag-set{box-sizing:border-box;width:100%;max-width:720px;padding:0 0 28px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}
.ag-set-title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}
.ag-set-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}
.ag-set-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;flex-direction:column;gap:12px;padding:12px 14px;display:flex}
.ag-set-card-head{flex-direction:column;gap:4px;display:flex}
.ag-set-card-title{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:14px;font-weight:500;line-height:20px;display:flex}
.ag-set-stage{box-sizing:border-box;flex:none;height:20px;color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);border-radius:10px;align-items:center;padding:0 8px;font-size:11px;font-weight:500;line-height:20px;display:inline-flex;letter-spacing:.02em}
.ag-set-card-sub{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}
.ag-set-note{color:var(--dsw-alias-state-warn-label);margin:0;font-size:13px;line-height:20px}
.ag-set-ok{color:var(--dsw-alias-state-success-primary);margin:0;font-size:13px;line-height:20px}
.ag-set-err{color:var(--dsw-alias-state-error-primary);margin:0;font-size:13px;line-height:20px}
.ag-set-row{flex-wrap:wrap;gap:8px;display:flex}
.ag-set-input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:32px;min-width:0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 10px;font-size:13px;line-height:20px;font-family:var(--ds-font-family-code)}
.ag-set-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}
.ag-set-input::placeholder{color:var(--dsw-alias-label-caption)}
.ag-set-input-num{width:96px}
.ag-set-btn{box-sizing:border-box;height:32px;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;border:1px solid var(--dsw-alias-border-l2);background:transparent;border-radius:16px;justify-content:center;align-items:center;gap:4px;padding:0 14px;font-size:13px;line-height:20px;display:inline-flex;white-space:nowrap}
.ag-set-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.ag-set-btn:disabled{opacity:.4;cursor:default}
.ag-set-btn-primary{border:none;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.ag-set-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.ag-set-btn-danger{color:var(--dsw-alias-state-error-primary)}
.ag-set-btn-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
.ag-set-list{flex-direction:column;gap:6px;display:flex}
.ag-set-item{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;align-items:center;gap:8px;padding:6px 10px;min-width:0;display:flex}
.ag-set-item-label{flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;font-family:var(--ds-font-family-code);word-break:break-all}
.ag-set-item-meta{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}
.ag-set-item-del{flex:none;width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:none;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;padding:0}
.ag-set-item-del:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.ag-set-empty{color:var(--dsw-alias-label-caption);margin:0;font-size:13px;line-height:20px;padding:4px 2px}
.ag-set-tag{box-sizing:border-box;flex:none;height:18px;border-radius:9px;align-items:center;padding:0 8px;font-size:11px;line-height:18px;display:inline-flex;letter-spacing:.02em}
.ag-set-tag-blue{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary)}
.ag-set-tag-green{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary)}
.ag-set-tag-gray{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform)}
.ag-set-tag-red{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
.ag-set-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;display:grid}
.ag-set-hc{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;color:var(--dsw-alias-label-secondary);align-items:center;justify-content:center;gap:6px;height:30px;font-size:12px;line-height:18px;display:inline-flex}
.ag-set-learn{flex-direction:column;gap:8px;display:flex}
.ag-set-learn-item{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;align-items:center;gap:8px;padding:6px 10px;min-width:0;display:flex}
.ag-set-learn-info{flex:1 1 auto;min-width:0;flex-direction:column;gap:2px;display:flex}
.ag-set-learn-key{color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;font-family:var(--ds-font-family-code);word-break:break-all}
.ag-set-learn-sub{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.ag-set-learn-stop{flex:none;height:24px;color:var(--dsw-alias-state-error-primary);cursor:pointer;font:inherit;background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-items:center;padding:0 10px;font-size:12px;line-height:24px;display:inline-flex;white-space:nowrap}
.ag-set-learn-stop:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.ag-diff-overlay{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
.ag-diff-panel{box-sizing:border-box;width:min(760px,calc(100vw - 48px));max-height:min(720px,calc(100vh - 48px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:16px;box-shadow:var(--dsw-shadow-lv3);overflow:hidden}
.ag-diff-head{box-sizing:border-box;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.ag-diff-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px;display:flex;align-items:center;gap:8px}
.ag-diff-path{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-family:var(--ds-font-family-code);word-break:break-all}
.ag-diff-stats{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.ag-diff-stats-add{color:var(--dsw-alias-state-success-primary)}
.ag-diff-stats-del{color:var(--dsw-alias-state-error-primary)}
.ag-diff-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;font-family:var(--ds-font-family-code);font-size:12px;line-height:19px}
.ag-diff-line{box-sizing:border-box;display:flex;gap:8px;padding:1px 8px;white-space:pre-wrap;word-break:break-all;min-width:0}
.ag-diff-line-add{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-label-primary)}
.ag-diff-line-del{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.ag-diff-line-ctx{background:transparent;color:var(--dsw-alias-label-secondary)}
.ag-diff-line-add .ag-diff-marker{color:var(--dsw-alias-state-success-primary)}
.ag-diff-line-del .ag-diff-marker{color:var(--dsw-alias-state-error-primary)}
.ag-diff-line-ctx .ag-diff-marker{color:var(--dsw-alias-label-tertiary)}
.ag-diff-marker{flex:none;width:16px;user-select:none}
.ag-diff-line-no{flex:none;width:52px;color:var(--dsw-alias-label-caption);text-align:right;user-select:none;font-variant-numeric:tabular-nums}
.ag-diff-text{flex:1 1 auto;min-width:0}
.ag-diff-hunk-sep{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;padding:2px 8px;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);margin:2px 0;user-select:none}
.ag-diff-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;padding:16px;text-align:center}
.ag-diff-foot{box-sizing:border-box;flex:none;border-top:1px solid var(--dsw-alias-border-l2);padding:10px 14px;display:flex;align-items:center;gap:8px;justify-content:flex-end}
.ag-file-chip-snap{cursor:pointer;border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.ag-file-chip-snap:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ag-snap-bar{flex:none;display:flex;align-items:center;gap:8px;padding:6px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;flex-wrap:wrap}
.ag-snap-bar b{color:var(--dsw-alias-label-secondary);font-weight:500}
.ag-snap-bar-spacer{flex:1 1 auto}
`

    // ================= 界面文案（locale 命名空间 dshApprovalGate，zh/en 双语） =================
    // 键名规约：common.* 通用、verdict.* 判定路径、reject.* 人工拒绝（前缀+细节组合）、
    // notice.* 提示条、diff.* 对比面板、view.* 审批历史、settings.* 设置页、api.* host 错误码。
    const NS = 'dshApprovalGate'
    const DICTS = {
      zh: {
        'common.close': '关闭',
        'common.add': '添加',
        'common.save': '保存',
        'common.remove': '删除',
        'common.loading': '加载中…',
        'common.noJustification': '(无说明)',
        'verdict.rule': '白名单规则',
        'verdict.flashSafe': 'Flash 判定安全',
        'verdict.learned': '沉淀规则',
        'verdict.fpHit': '已确认操作',
        'verdict.flashSame': 'Flash 同类验证',
        'verdict.autoFallback': '自动放行',
        'reject.prefixManual': '人工拒绝',
        'reject.prefixRejected': '已拒绝',
        'reject.detailHard': '（硬风险类别，本就永久人工）',
        'reject.detailUnknown': '（协议外类别，不升级）',
        'reject.detailDenyRule': '（永久人工规则命中）',
        'reject.detailUpgraded': ' · 已升级永久人工',
        'notice.pendingTitle': '等待人工审批：{action}',
        'notice.tagPending': '人工审批中',
        'notice.approvedTitle': '人工审批通过：{action}',
        'notice.tagLearning': '学习 {n}/{th}，满 {th} 次后自动放行',
        'notice.tagApproved': '人工审批通过',
        'notice.rejectedTitle': '已拒绝：{action}',
        'notice.tagAuto': '自动放行 · {label}',
        'notice.close': '关闭提示',
        'diff.title': '文件改动对比',
        'diff.loadFailed': '加载 diff 失败',
        'diff.loadFailedDetail': '加载 diff 失败：{detail}',
        'diff.statsSuffix': ' 行变更 · {unchanged} 行未变{missing}',
        'diff.fileGone': '（文件当前已不存在）',
        'diff.hunkSep': '{n} 行未修改',
        'diff.noChanges': '该文件无内容变化（或文件不可读）',
        'diff.revertBtn': '撤销此改动',
        'diff.revertSentBtn': '已发送撤销指令',
        'diff.revertSent': '撤销指令已发送到对话框，AI 将按指令恢复文件',
        'diff.sending': '发送中…',
        'diff.sendFailed': '发送失败',
        'diff.sendFailedDetail': '发送失败：{detail}',
        'view.tab': '审批',
        'view.title': '自动放行审批',
        'view.subtitle': '本会话中自动放行与人工审批的记录（最新在上）',
        'view.snapshots': 'diff 快照 {usage}',
        'view.snapshotsUsage': '{bytes} · {count} 条',
        'view.clearSession': '仅清本会话',
        'view.clearSessionTip': '仅清除本会话的 diff 快照（不影响其他会话）',
        'view.clearAll': '清空全部',
        'view.clearAllTip': '清空全部会话（含其他会话未查看过的）diff 快照，需二次确认',
        'view.confirmClearSession': '确定清除【本会话】的 diff 快照？仅删除本会话审批产生的改动对比数据，不影响审批记录本身。',
        'view.confirmClearAll': '确定清除【全部会话】的 diff 快照？这可能删除其他会话还没看过的改动对比记录，且不可恢复。',
        'view.loadFailed': '加载失败：{detail}',
        'view.empty': '本会话暂无审批记录',
        'view.tagLearning': '人工通过 · 学习 {n}/{th}（满 {th} 次自动放行）',
        'view.tagApproved': '人工通过',
        'view.tagAuto': '自动放行 · {label}',
        'view.chipTip': '查看该文件改动对比',
        'settings.nav': '自动审批',
        'settings.title': '自动审批',
        'settings.intro': '管理自动审批的放行与阻塞规则：查看当前判定管道、黑/白名单与学习进度，可自行添加规则（如把 edit 加入白名单后自动放行）或终止错误的学习。修改即时生效（热更新）。',
        'settings.tagDefault': '预置',
        'settings.tagLearned': '学习沉淀',
        'settings.tagUser': '用户',
        'settings.loadFailed': '加载规则失败：{detail}',
        'settings.applied': '已生效（热更新，无需重启）',
        'settings.opFailed': '操作失败',
        'settings.requestFailed': '请求失败：{detail}',
        'settings.setupTitle': '初始化权限预设',
        'settings.setupDesc': '安装后需在 profile 的 cordis.patch.yml 添加 auto-approve 权限预设（预设表在配置构造时冻结，无法自动扩展）。',
        'settings.setupConfigured': '当前已配置 ✓',
        'settings.setupNotConfigured': '当前未检测到，可一键写入。',
        'settings.setupButton': '一键配置权限预设',
        'settings.setupRecheck': '重新检查',
        'settings.setupRestartNote': '写入后需重启 dsh web 生效',
        'settings.setupAlready': '权限预设已配置，无需操作',
        'settings.setupWritten': '已写入 cordis.patch.yml，请重启 dsh web 生效（status={status}）',
        'settings.setupFailed': '初始化失败',
        'settings.setupRequestFailed': '初始化请求失败：{detail}',
        'settings.pipelineTitle': '当前判定管道',
        'settings.pipelineSub': '每次沙箱越界按下述链路判定，下面的配置卡片按管道顺序排列：',
        'settings.customSuffix': ' · 自定义',
        'settings.stageDeny': '① DENY 层',
        'settings.denyTitle': '黑名单 · 不可逆危险词',
        'settings.denySub': '管道第一步：命中即转人工（fail-safe，最高优先）。可添加自定义危险词；删除预置词有风险，请谨慎。',
        'settings.denyPlaceholder': '输入危险词，如 sudo rm',
        'settings.denyEmpty': '无黑名单词',
        'settings.presetMeta': '预置',
        'settings.denyRemoveConfirm': '删除预置危险词「{keyword}」会降低安全性，确定？',
        'settings.stageAllow': '② 白名单层',
        'settings.allowTitle': '白名单 · 自动放行规则',
        'settings.allowSub': '管道第二步：命中规则直接自动放行（不过 Flash）。示例：tool=edit + mode=danger-full-access → 所有工作区外 edit 自动放行。',
        'settings.phTool': 'tool',
        'settings.phMode': 'mode（可选）',
        'settings.phCategory': 'category（可选）',
        'settings.phContains': 'contains（可选）',
        'settings.allowEmpty': '无白名单规则',
        'settings.anyRule': '(任意)',
        'settings.stageDenyRules': '③ denyRules 层',
        'settings.denyRulesTitle': '永久人工 · 拒绝升级规则',
        'settings.denyRulesSub': '管道第三步：neutral 操作被你拒绝后自动升级到这里，命中直接转人工（永不自动放行）。硬风险类别（删除/凭据/远程/系统/批量）本身永久人工，不在此记录。可手动移除。',
        'settings.denyRulesEmpty': '无升级规则（硬风险类别本就永久人工，不在此记录）',
        'settings.stageLearn': '⑤ 学习沉淀',
        'settings.learningTitle': '正在学习',
        'settings.learningSub': '中立操作人工确认制：同一「工具|模式|类别」每确认一次计数 +1，确认满 {th} 次后，第 {next} 次起自动放行并沉淀规则。若学习有误可终止（删除计数与样本）。',
        'settings.learningEmpty': '暂无正在学习的内容',
        'settings.confirmed': '已确认 {n}/{th}{samples}',
        'settings.stopLearning': '终止',
        'settings.stopTip': '终止学习（删除计数与样本）',
        'settings.stopConfirm': '终止「{key}」的学习？将删除其确认计数与样本。',
        'settings.stageJudge': '④ Flash 判定',
        'settings.judgeTitle': '阈值与超时',
        'settings.judgeSub': '管道第四步：确认阈值 N（学习满 {th} 次后第 {next} 次自动放行）与 Flash 判断超时（超时自动重试 1 次，仍失败转人工）。',
        'settings.thresholdLabel': '确认阈值 N：',
        'settings.thresholdHint': '满 {th} 次后第 {next} 次起自动',
        'settings.timeoutLabel': 'Flash 判断超时(ms)：',
        'settings.modelProviderLabel': '判定模型 Provider：',
        'settings.modelModelLabel': '判定模型 Model：',
        'settings.modelFollowHint': '留空跟随会话默认模型',
        'settings.modelHint': '两项都填写后固定判定路由（风险预判与同类验证都走该模型，热更新即时生效）；留空跟随会话默认模型。',
        'settings.modelEffective': '当前生效路由：{route}。',
        'api.setOnly': '{kind} 使用 set 操作',
        'api.invalidValue': '无效数值',
        'api.learningRemoveOnly': 'learning 仅支持 remove',
        'api.emptyKey': 'key 不能为空',
        'api.learningNotFound': '未找到该学习项',
        'api.unknownKind': '未知规则类型: {kind}',
        'api.emptyValue': '值不能为空',
        'api.ruleObjectRequired': '规则必须是对象',
        'api.ruleFieldRequired': '规则至少需要 tool/mode/category/contains 之一',
        'api.ruleNotFound': '未找到匹配的规则',
        'api.unknownOp': '未知操作: {op}',
        'api.methodNotAllowed': '不支持的请求方法',
        'api.missingParams': '{fields} 必填',
        'api.snapshotNotFound': '该事件没有此文件的快照',
        'api.eventNotFound': '未找到该事件',
        'api.noChannel': '没有可用的消息投递通道',
        'api.noPresetsKey': 'permission 条目缺少 presets 键，请手动添加',
      },
      en: {
        'common.close': 'Close',
        'common.add': 'Add',
        'common.save': 'Save',
        'common.remove': 'Remove',
        'common.loading': 'Loading…',
        'common.noJustification': '(no justification)',
        'verdict.rule': 'Allowlist rule',
        'verdict.flashSafe': 'Flash judged safe',
        'verdict.learned': 'Learned rule',
        'verdict.fpHit': 'Confirmed operation',
        'verdict.flashSame': 'Flash similarity check',
        'verdict.autoFallback': 'Auto-approved',
        'reject.prefixManual': 'Rejected by human',
        'reject.prefixRejected': 'Rejected',
        'reject.detailHard': ' (hard-risk category — permanently human anyway)',
        'reject.detailUnknown': ' (out-of-protocol category, not upgraded)',
        'reject.detailDenyRule': ' (matched a permanent-human rule)',
        'reject.detailUpgraded': ' · upgraded to a permanent human rule',
        'notice.pendingTitle': 'Waiting for human approval: {action}',
        'notice.tagPending': 'Awaiting human approval',
        'notice.approvedTitle': 'Human approval granted: {action}',
        'notice.tagLearning': 'Learning {n}/{th} — auto-approves after {th} confirmations',
        'notice.tagApproved': 'Human approval granted',
        'notice.rejectedTitle': 'Rejected: {action}',
        'notice.tagAuto': 'Auto-approved · {label}',
        'notice.close': 'Dismiss notice',
        'diff.title': 'File change diff',
        'diff.loadFailed': 'Failed to load diff',
        'diff.loadFailedDetail': 'Failed to load diff: {detail}',
        'diff.statsSuffix': ' lines changed · {unchanged} unchanged{missing}',
        'diff.fileGone': ' (file no longer exists)',
        'diff.hunkSep': '{n} unmodified lines',
        'diff.noChanges': 'No content changes in this file (or the file is unreadable)',
        'diff.revertBtn': 'Revert this change',
        'diff.revertSentBtn': 'Revert request sent',
        'diff.revertSent': 'Revert request sent to the composer; the AI will restore the file accordingly',
        'diff.sending': 'Sending…',
        'diff.sendFailed': 'Failed to send',
        'diff.sendFailedDetail': 'Failed to send: {detail}',
        'view.tab': 'Approval',
        'view.title': 'Auto-approval history',
        'view.subtitle': 'Auto-approvals and human decisions in this session (newest first)',
        'view.snapshots': 'diff snapshots {usage}',
        'view.snapshotsUsage': '{bytes} · {count} entries',
        'view.clearSession': 'Clear this session',
        'view.clearSessionTip': 'Only clears diff snapshots of this session (other sessions are unaffected)',
        'view.clearAll': 'Clear all',
        'view.clearAllTip': 'Clears diff snapshots of all sessions (including ones you have not opened); asks for confirmation',
        'view.confirmClearSession': 'Clear the diff snapshots of THIS session? This only removes change-comparison data produced by this session and keeps the approval records themselves.',
        'view.confirmClearAll': 'Clear the diff snapshots of ALL sessions? This may delete comparison records other sessions have not been reviewed yet and cannot be undone.',
        'view.loadFailed': 'Load failed: {detail}',
        'view.empty': 'No approval records in this session yet',
        'view.tagLearning': 'Human-approved · learning {n}/{th} (auto-approves after {th})',
        'view.tagApproved': 'Human-approved',
        'view.tagAuto': 'Auto-approved · {label}',
        'view.chipTip': 'View the diff of this file',
        'settings.nav': 'Auto Approval',
        'settings.title': 'Auto Approval',
        'settings.intro': 'Manage the allow and block rules of auto approval: inspect the active decision pipeline, the deny/allow lists and learning progress, add your own rules (e.g. allowlist edit to auto-approve it) or stop wrong learning. Changes apply immediately (hot reload).',
        'settings.tagDefault': 'Built-in',
        'settings.tagLearned': 'Learned',
        'settings.tagUser': 'User',
        'settings.loadFailed': 'Failed to load rules: {detail}',
        'settings.applied': 'Applied (hot reload, no restart needed)',
        'settings.opFailed': 'Operation failed',
        'settings.requestFailed': 'Request failed: {detail}',
        'settings.setupTitle': 'Initialize permission preset',
        'settings.setupDesc': 'After install, the auto-approve permission preset must be added to the profile\'s cordis.patch.yml (the preset table is frozen at config construction and cannot be extended automatically).',
        'settings.setupConfigured': 'Configured ✓',
        'settings.setupNotConfigured': 'Not detected yet — write it with one click.',
        'settings.setupButton': 'Configure the permission preset',
        'settings.setupRecheck': 'Re-check',
        'settings.setupRestartNote': 'Restart dsh web after writing for it to take effect',
        'settings.setupAlready': 'The permission preset is already configured — nothing to do',
        'settings.setupWritten': 'Written to cordis.patch.yml — restart dsh web for it to take effect (status={status})',
        'settings.setupFailed': 'Initialization failed',
        'settings.setupRequestFailed': 'Initialization request failed: {detail}',
        'settings.pipelineTitle': 'Active decision pipeline',
        'settings.pipelineSub': 'Every sandbox escalation is judged along this chain; the config cards below are listed in pipeline order:',
        'settings.customSuffix': ' · custom',
        'settings.stageDeny': '① DENY stage',
        'settings.denyTitle': 'Deny list · irreversible danger keywords',
        'settings.denySub': 'Pipeline step one: a hit goes to a human (fail-safe, highest priority). Custom keywords can be added; removing built-in ones is risky — be careful.',
        'settings.denyPlaceholder': 'Enter a danger keyword, e.g. sudo rm',
        'settings.denyEmpty': 'No deny keywords',
        'settings.presetMeta': 'Built-in',
        'settings.denyRemoveConfirm': 'Removing the built-in danger keyword "{keyword}" reduces safety. Continue?',
        'settings.stageAllow': '② Allowlist stage',
        'settings.allowTitle': 'Allowlist · auto-approve rules',
        'settings.allowSub': 'Pipeline step two: a matched rule auto-approves directly (Flash is skipped). Example: tool=edit + mode=danger-full-access → all out-of-workspace edits auto-approve.',
        'settings.phTool': 'tool',
        'settings.phMode': 'mode (optional)',
        'settings.phCategory': 'category (optional)',
        'settings.phContains': 'contains (optional)',
        'settings.allowEmpty': 'No allow rules',
        'settings.anyRule': '(any)',
        'settings.stageDenyRules': '③ denyRules stage',
        'settings.denyRulesTitle': 'Permanent human · reject-upgraded rules',
        'settings.denyRulesSub': 'Pipeline step three: neutral operations you rejected are upgraded here automatically; a hit goes straight to a human (never auto-approved). Hard-risk categories (deletion/credential/remote/system/bulk) are permanently human on their own and are not listed here. Entries can be removed manually.',
        'settings.denyRulesEmpty': 'No upgraded rules (hard-risk categories are permanently human anyway and not listed here)',
        'settings.stageLearn': '⑤ Learning',
        'settings.learningTitle': 'Currently learning',
        'settings.learningSub': 'Confirmation-based learning for neutral operations: each confirmation of the same "tool|mode|category" counts +1; after {th} confirmations the {next}th onwards auto-approves and persists a rule. Stop learning if it went wrong (removes the counter and samples).',
        'settings.learningEmpty': 'Nothing is being learned right now',
        'settings.confirmed': 'Confirmed {n}/{th}{samples}',
        'settings.stopLearning': 'Stop',
        'settings.stopTip': 'Stop learning (removes the counter and samples)',
        'settings.stopConfirm': 'Stop learning "{key}"? Its confirmation counter and samples will be removed.',
        'settings.stageJudge': '④ Flash judgment',
        'settings.judgeTitle': 'Threshold and timeout',
        'settings.judgeSub': 'Pipeline step four: the confirmation threshold N (the {next}th call auto-approves once learned {th} times) and the Flash judgment timeout (one automatic retry, then a human on failure).',
        'settings.thresholdLabel': 'Confirmation threshold N:',
        'settings.thresholdHint': 'After {th} confirmations, the {next}th onwards auto-approves',
        'settings.timeoutLabel': 'Flash judgment timeout (ms):',
        'settings.modelProviderLabel': 'Judge model provider:',
        'settings.modelModelLabel': 'Judge model model:',
        'settings.modelFollowHint': 'empty = follow the session agent model',
        'settings.modelHint': 'Set both fields to pin the judge route (risk judgment and similarity verification both use it; hot reload applies immediately); leave empty to follow the session agent model.',
        'settings.modelEffective': 'Effective route: {route}.',
        'api.setOnly': '{kind} only supports the set operation',
        'api.invalidValue': 'Invalid number',
        'api.learningRemoveOnly': 'learning only supports remove',
        'api.emptyKey': 'key must not be empty',
        'api.learningNotFound': 'Learning entry not found',
        'api.unknownKind': 'Unknown rule kind: {kind}',
        'api.emptyValue': 'Value must not be empty',
        'api.ruleObjectRequired': 'The rule must be an object',
        'api.ruleFieldRequired': 'The rule needs at least one of tool/mode/category/contains',
        'api.ruleNotFound': 'No matching rule found',
        'api.unknownOp': 'Unknown operation: {op}',
        'api.methodNotAllowed': 'Method not allowed',
        'api.missingParams': '{fields} are required',
        'api.snapshotNotFound': 'No snapshot of this file for that event',
        'api.eventNotFound': 'Event not found',
        'api.noChannel': 'No available message delivery channel',
        'api.noPresetsKey': 'The permission entry lacks a presets key — please add it manually',
      },
    }

    /** 与 locale 服务一致的 {name} 插值（fallbackT 直查 zh 词典时使用） */
    function interpolate(template, params) {
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
    }

    /** 老版宿主无 locale 服务时的回退翻译：直查 zh 词典，缺失回退键名 */
    function fallbackT(key, params) {
      const dict = DICTS.zh
      return interpolate(dict && dict[key] !== undefined ? dict[key] : key, params)
    }

    /** 组件内取 t：优先插槽注入的标准 locale 席位（props.t），缺失回退 fallbackT */
    function pickT(props) {
      return typeof props.t === 'function' ? props.t : fallbackT
    }

    /**
     * host API 错误文案：host 带 code 时按码翻译（api.* 键，params 随响应），
     * 未登记的码 / 无 code（网络异常等）回退原始 error 文本，再回退调用方给的缺省文案。
     */
    function apiErrorText(t, res, fallback) {
      if (!res) return fallback
      if (res.code && t('api.' + res.code) !== 'api.' + res.code) return t('api.' + res.code, res.params)
      return res.error || fallback
    }

    /** verdict → 文案键（verdict 值未知时回退「自动放行」） */
    const VERDICT_KEYS = {
      rule: 'verdict.rule',
      'flash-safe': 'verdict.flashSafe',
      learned: 'verdict.learned',
      fpHit: 'verdict.fpHit',
      'flash-same': 'verdict.flashSame',
    }
    const VERDICT_NEUTRAL = new Set(['rule', 'learned', 'fpHit', 'flash-same'])
    const HARD_CATEGORIES = new Set(['deletion', 'credential', 'remote', 'system', 'bulk'])

    /** verdict 的展示文案；未登记的 verdict 值原样展示，彻底缺省回退「自动放行」 */
    function verdictLabel(t, verdict) {
      const key = VERDICT_KEYS[verdict]
      return key ? t(key) : (verdict || t('verdict.autoFallback'))
    }

    // 拒绝记录文案：按 host 记录的 path（判定路径）精确分类；
    // 前缀与细节拆开，提示条（已拒绝…）与历史视图（人工拒绝…）共用细节
    function rejectLabel(t, ev, forNotice) {
      const p = ev && ev.path
      const prefix = t(forNotice ? 'reject.prefixRejected' : 'reject.prefixManual')
      if (p === 'hard-category') return prefix + t('reject.detailHard')
      if (p === 'unknown-category') return prefix + t('reject.detailUnknown')
      if (p === 'deny-rule') return prefix + t('reject.detailDenyRule')
      if (p === 'neutral-reject' || (ev && ev.category === 'neutral')) return prefix + t('reject.detailUpgraded')
      // 兜底：旧事件无 path——按 category 兼容
      if (ev && HARD_CATEGORIES.has(ev.category)) return prefix + t('reject.detailHard')
      return prefix
    }

    function fmtTime(iso) {
      try {
        const d = new Date(iso)
        const p = (n) => String(n).padStart(2, '0')
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
      } catch (e) { return String(iso || '') }
    }

    function GlyphCheck() {
      return React.createElement('svg', {
        width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true,
      },
        React.createElement('circle', { cx: 8, cy: 8, r: 7, fill: 'var(--dsw-alias-state-success-tertiary)' }),
        React.createElement('path', { d: 'M5 8.3L7.1 10.4L11 6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function resolveFrame(sp) {
      let sessionId = (sp && sp.sessionId) || null
      try {
        if (!sessionId && sp && typeof sp.useSessions === 'function') {
          const state = sp.useSessions(function (s) { return s })
          sessionId = (state && state.current) || null
        }
      } catch (e) {}
      return { sessionId }
    }

    function fetchEvents(sessionId, since) {
      const q = '/api/auto-approve/events?sessionId=' + encodeURIComponent(sessionId || '') + (since ? '&since=' + since : '')
      return fetch(q, { headers: { 'cache-control': 'no-cache' } }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      }).then(function (data) {
        return (data && Array.isArray(data.events)) ? data.events : []
      })
    }

    // ================= ✅ 自动放行提示条（conversation.input.dock，order=30） =================
    function NoticeStrip(props) {
      const t = pickT(props)
      const frame = resolveFrame(props.slotsProps || {})
      const sessionId = frame.sessionId
      const [notice, setNotice] = React.useState(null)
      const sinceRef = React.useRef(0)
      const lastShownIdRef = React.useRef(0) // 已弹过的事件最大 id（跨会话全局递增，防重复弹历史）
      const hideTimerRef = React.useRef(null)

      React.useEffect(function () {
        let alive = true
        let timer = null
        sinceRef.current = 0
        setNotice(null)
        if (!sessionId) return

        // 轮询主体：拉取游标之后的新事件；去重兜底（id 不大于已弹过的最大 id 直接跳过）
        const startPolling = function () {
          if (!alive) return
          timer = setInterval(function () {
            fetchEvents(sessionId, sinceRef.current).then(function (evs) {
              if (!alive) return
              if (evs.length === 0) return
              const last = evs[evs.length - 1]
              if (!last || last.id <= lastShownIdRef.current) return
              lastShownIdRef.current = last.id
              sinceRef.current = last.id
              const kind = last.kind || 'auto'
              setNotice(last)
              // pending（等待人工审批）不自动收起；其余按类型定时收起
              if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
              if (kind !== 'manual-pending') {
                const hold = kind === 'manual-approved' ? 5000 : 4000
                hideTimerRef.current = setTimeout(function () { setNotice(null) }, hold)
              }
            }).catch(function () {})
          }, 2000)
        }

        // 打开会话：先静默拉一次全量，仅把游标推进到最新，不弹任何历史提示；完成后再开始轮询
        fetchEvents(sessionId, 0).then(function (evs) {
          if (!alive) return
          if (evs.length > 0) sinceRef.current = evs[evs.length - 1].id
          startPolling()
        }).catch(function () {
          // 静默拉取失败：游标保持 0，靠 lastShownIdRef 去重兜底，仍启动轮询
          if (!alive) return
          startPolling()
        })

        return function () {
          alive = false
          if (timer) clearInterval(timer)
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        }
      }, [sessionId])

      if (!notice) return null
      const kind = notice.kind || 'auto'
      const isPending = kind === 'manual-pending'
      const isManual = kind === 'manual-approved' || kind === 'manual-rejected'
      const action = notice.justification || notice.reason || ''
      // 文案
      let title = ''
      let tagText = ''
      let glyph = null
      if (isPending) {
        title = t('notice.pendingTitle', { action })
        tagText = t('notice.tagPending')
        glyph = React.createElement('span', { className: 'ag-notice-glyph-warn' }, '◔')
      } else if (kind === 'manual-approved') {
        const lc = notice.learningCount !== undefined ? notice.learningCount : null
        const th = notice.threshold || 3
        title = t('notice.approvedTitle', { action })
        tagText = lc !== null ? t('notice.tagLearning', { n: lc, th }) : t('notice.tagApproved')
        glyph = React.createElement('span', { className: 'ag-notice-glyph-warn' }, '✓')
      } else if (kind === 'manual-rejected') {
        title = t('notice.rejectedTitle', { action })
        tagText = rejectLabel(t, notice, true)
        glyph = React.createElement('span', { className: 'ag-notice-glyph-err' }, '✕')
      } else {
        title = action
        tagText = t('notice.tagAuto', { label: verdictLabel(t, notice.verdict) })
        glyph = React.createElement(GlyphCheck, null)
      }
      const cardCls = 'ag-notice-card' + (isPending ? ' ag-notice-card-pending' : isManual ? ' ag-notice-card-manual' : '')
      return React.createElement('div', { className: 'ag-notice' },
        React.createElement('div', { className: cardCls },
          React.createElement('span', { className: 'ag-notice-glyph' }, glyph),
          React.createElement('div', { className: 'ag-notice-body' },
            React.createElement('div', { className: 'ag-notice-head' },
              React.createElement('span', { className: 'ag-notice-tool' }, notice.tool || 'tool'),
              React.createElement('span', { className: 'ag-notice-text' }, title),
            ),
            React.createElement('div', { className: 'ag-notice-meta' },
              React.createElement('span', { className: isPending ? 'ag-tag-warn' : kind === 'manual-rejected' ? 'ag-tag-err' : kind === 'manual-approved' ? 'ag-tag-warn' : 'ag-tag' + (VERDICT_NEUTRAL.has(notice.verdict) ? ' ag-tag-neutral' : '') }, tagText),
              React.createElement('span', { className: 'ag-time' }, fmtTime(notice.ts)),
            ),
          ),
          React.createElement('button', {
            type: 'button',
            className: 'ag-notice-close',
            title: t('notice.close'),
            'aria-label': t('notice.close'),
            onClick: function () { setNotice(null) },
          }, '✕'),
        ),
      )
    }

    // ================= diff 面板（审批记录文件改动查看 + 撤销） =================
    function fmtBytes(n) {
      if (n < 1024) return n + ' B'
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
      return (n / 1024 / 1024).toFixed(2) + ' MB'
    }

    function DiffPanel(props) {
      const t = pickT(props)
      const sessionId = props.sessionId
      const eventId = props.eventId
      const path = props.path
      const onClose = props.onClose
      const [data, setData] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [revertMsg, setRevertMsg] = React.useState(null) // { text, ok }
      const [reverting, setReverting] = React.useState(false)
      const [revertDone, setRevertDone] = React.useState(false)

      React.useEffect(function () {
        setData(null)
        setError(null)
        setRevertDone(false)
        fetch('/api/auto-approve/diff?eventId=' + eventId + '&path=' + encodeURIComponent(path), { headers: { 'cache-control': 'no-cache' } })
          .then(function (r) { return r.json() })
          .then(function (res) {
            if (res && res.ok) setData(res)
            else setError(apiErrorText(t, res, t('diff.loadFailed')))
          })
          .catch(function (e) { setError(t('diff.loadFailedDetail', { detail: String((e && e.message) || e) })) })
      }, [eventId, path])

      const doRevert = function () {
        // 防重复：同一事件只允许投递一次撤销指令（v0.5.0 事故中同一 event 被重复撤销 4 次）
        if (reverting || revertDone) return
        setReverting(true)
        setRevertMsg(null)
        fetch('/api/auto-approve/revert', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId, eventId: eventId }),
        }).then(function (r) { return r.json() }).then(function (res) {
          if (res && res.ok) {
            setRevertMsg({ text: t('diff.revertSent'), ok: true })
            setRevertDone(true)
          } else {
            setRevertMsg({ text: apiErrorText(t, res, t('diff.sendFailed')), ok: false })
          }
        }).catch(function (e) {
          setRevertMsg({ text: t('diff.sendFailedDetail', { detail: String((e && e.message) || e) }), ok: false })
        }).finally(function () {
          setReverting(false)
        })
      }

      const changedLines = data ? (data.changedLines || []) : []
      const hunks = data && Array.isArray(data.hunks) ? data.hunks : null
      const stats = data ? (data.stats || {}) : null

      return React.createElement('div', { className: 'ag-diff-overlay', onClick: function (e) { if (e.target === e.currentTarget) onClose() } },
        React.createElement('div', { className: 'ag-diff-panel' },
          React.createElement('div', { className: 'ag-diff-head' },
            React.createElement('div', { className: 'ag-diff-title' },
              React.createElement('span', null, t('diff.title')),
              React.createElement('button', { type: 'button', className: 'ag-notice-close', title: t('common.close'), 'aria-label': t('common.close'), onClick: onClose }, '✕'),
            ),
            React.createElement('div', { className: 'ag-diff-path' }, path),
            stats
              ? React.createElement('div', { className: 'ag-diff-stats' },
                  React.createElement('span', { className: 'ag-diff-stats-add' }, '+' + stats.added),
                  ' / ',
                  React.createElement('span', { className: 'ag-diff-stats-del' }, '-' + stats.removed),
                  t('diff.statsSuffix', { unchanged: stats.contextLines, missing: data.afterExists === false ? t('diff.fileGone') : '' }),
                )
              : null,
          ),
          React.createElement('div', { className: 'ag-diff-body' },
            error
              ? React.createElement('div', { className: 'ag-diff-empty' }, error)
              : !data
                ? React.createElement('div', { className: 'ag-diff-empty' }, t('common.loading'))
                : hunks
                  ? hunks.map(function (h, hi) {
                      return React.createElement('div', { key: 'hunk' + hi },
                        h.hiddenBefore > 0
                          ? React.createElement('div', { className: 'ag-diff-hunk-sep' }, t('diff.hunkSep', { n: h.hiddenBefore }))
                          : null,
                        h.lines.map(function (c, i) {
                          const isAdd = c.type === 'add'
                          const isDel = c.type === 'del'
                          const cls = isAdd ? 'ag-diff-line-add' : (isDel ? 'ag-diff-line-del' : 'ag-diff-line-ctx')
                          const marker = isAdd ? '+' : (isDel ? '-' : ' ')
                          const aNo = c.aNo != null ? String(c.aNo) : ''
                          const bNo = c.bNo != null ? String(c.bNo) : ''
                          return React.createElement('div', { className: 'ag-diff-line ' + cls, key: 'hl' + i },
                            React.createElement('span', { className: 'ag-diff-marker' }, marker),
                            React.createElement('span', { className: 'ag-diff-line-no' }, aNo + (aNo && bNo ? ' ' : '') + bNo),
                            React.createElement('span', { className: 'ag-diff-text' }, c.text),
                          )
                        }),
                      )
                    })
                  : changedLines.length === 0
                    ? React.createElement('div', { className: 'ag-diff-empty' }, t('diff.noChanges'))
                    : changedLines.map(function (c, i) {
                        return React.createElement('div', {
                          className: 'ag-diff-line ' + (c.type === 'add' ? 'ag-diff-line-add' : 'ag-diff-line-del'),
                          key: i,
                        },
                          React.createElement('span', { className: 'ag-diff-marker' }, c.type === 'add' ? '+' : '-'),
                          React.createElement('span', { className: 'ag-diff-line-no' }, String(c.line)),
                          React.createElement('span', { className: 'ag-diff-text' }, c.text),
                        )
                      }),
          ),
          React.createElement('div', { className: 'ag-diff-foot' },
            revertMsg
              ? React.createElement('span', { className: revertMsg.ok ? 'ag-set-ok' : 'ag-set-err' }, revertMsg.text)
              : null,
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn ag-set-btn-primary',
              onClick: doRevert,
              disabled: reverting || revertDone,
            }, reverting ? t('diff.sending') : (revertDone ? t('diff.revertSentBtn') : t('diff.revertBtn'))),
            React.createElement('button', { type: 'button', className: 'ag-set-btn', onClick: onClose }, t('common.close')),
          ),
        ),
      )
    }

    // ================= 审批历史视图（conversation.view，order=20，轨迹右侧） =================
    function HistoryView(props) {
      const t = pickT(props)
      const sessionId = (props && (props.sessionId || (props.slotsProps && props.slotsProps.sessionId))) || null
      const [events, setEvents] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [snapStats, setSnapStats] = React.useState(null) // {count, bytes} | null
      const [snapIds, setSnapIds] = React.useState(null) // Set<eventId> | null（当前存在快照的事件）
      const [snapFiles, setSnapFiles] = React.useState(null) // {eventId: [absPath,...]} | null（文件级 diff 可点击判断）
      const [diffOpen, setDiffOpen] = React.useState(null) // {eventId, path} | null

      const loadSnapStats = function (sid) {
        const q = sid ? ('?sessionId=' + encodeURIComponent(sid)) : ''
        fetch('/api/auto-approve/snapshots-stats' + q, { headers: { 'cache-control': 'no-cache' } })
          .then(function (r) { return r.json() })
          .then(function (res) {
            if (!res || !res.ok) return
            setSnapStats({ count: res.count || 0, bytes: res.bytes || 0 })
            setSnapIds(new Set((res.ids || []).map(String)))
            // 文件级映射：eventId → 该事件有快照的文件绝对路径列表
            const fm = {}
            if (res.files && typeof res.files === 'object') {
              for (const k of Object.keys(res.files)) {
                const arr = Array.isArray(res.files[k]) ? res.files[k] : []
                if (arr.length > 0) fm[k] = arr.map(String)
              }
            }
            setSnapFiles(fm)
          })
          .catch(function () {})
      }

      // 清除快照：mode='session' 仅本会话（默认），mode='all' 清全部（含其他会话，需二次确认）
      const doClearSnapshots = function (mode) {
        const sid = mode === 'session' ? sessionId : ''
        const msg = mode === 'all' ? t('view.confirmClearAll') : t('view.confirmClearSession')
        if (!window.confirm(msg)) return
        const body = {}
        if (sid) body.sessionId = sid
        fetch('/api/auto-approve/snapshots-clear', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).then(function (r) { return r.json() }).then(function (res) {
          if (res && res.ok) {
            if (mode === 'all') { setSnapStats({ count: 0, bytes: 0 }); setSnapIds(new Set()); setSnapFiles({}) }
            else loadSnapStats(sessionId)
          }
        }).catch(function () {})
      }

      React.useEffect(function () {
        setEvents(null)
        setError(null)
        loadSnapStats(sessionId)
        if (!sessionId) { setEvents([]); return }
        let alive = true
        const load = function () {
          fetchEvents(sessionId, 0).then(function (evs) {
            if (!alive) return
            evs.sort(function (a, b) { return b.id - a.id }) // 时间倒序：最新在最上面
            setEvents(evs)
            setError(null)
          }).catch(function (e) {
            if (!alive) return
            setError(String((e && e.message) || e))
          })
          loadSnapStats(sessionId)
        }
        load()
        const timer = setInterval(load, 5000)
        return function () { alive = false; clearInterval(timer) }
      }, [sessionId])

      return React.createElement('div', { className: 'ag-view' },
        React.createElement('div', { className: 'ag-view-head' },
          React.createElement('div', { className: 'ag-view-title' }, t('view.title')),
          React.createElement('div', { className: 'ag-view-sub' }, t('view.subtitle')),
        ),
        React.createElement('div', { className: 'ag-snap-bar' },
          React.createElement('span', null,
            t('view.snapshots', { usage: '' }),
            React.createElement('b', null, snapStats ? t('view.snapshotsUsage', { bytes: fmtBytes(snapStats.bytes), count: snapStats.count }) : '…'),
          ),
          React.createElement('span', { className: 'ag-snap-bar-spacer' }),
          React.createElement('button', {
            type: 'button',
            className: 'ag-set-btn',
            onClick: function () { doClearSnapshots('session') },
            disabled: !snapStats || snapStats.count === 0,
            title: t('view.clearSessionTip'),
          }, t('view.clearSession')),
          React.createElement('button', {
            type: 'button',
            className: 'ag-set-btn ag-set-btn-danger',
            onClick: function () { doClearSnapshots('all') },
            disabled: !snapStats || snapStats.count === 0,
            title: t('view.clearAllTip'),
          }, t('view.clearAll')),
        ),
        events === null
          ? React.createElement('div', { className: 'ag-loading' }, t('common.loading'))
          : events.length === 0
            ? React.createElement('div', { className: 'ag-empty' }, error ? t('view.loadFailed', { detail: error }) : t('view.empty'))
            : React.createElement('div', { className: 'ag-list' },
                events.map(function (ev) {
                  const kind = ev.kind || 'auto'
                  // pending（等待中）不在视图展示终态记录（提示条负责）
                  if (kind === 'manual-pending') return null
                  const files = Array.isArray(ev.files) ? ev.files : []
                  // 文件级快照判断：事件有快照 且 该文件在快照文件列表中
                  // （ev.files 可能是相对/带 ~ 路径，快照 files 是绝对路径 → basename 匹配兜底）
                  const snapPaths = (snapFiles && snapFiles[String(ev.id)]) || []
                  const snapPathSet = new Set(snapPaths)
                  const snapBaseSet = new Set(snapPaths.map(function (p) { return String(p).split('/').pop() }))
                  const hasSnap = function (f) {
                    if (snapIds === null || !snapIds.has(String(ev.id))) return false
                    if (snapPathSet.has(String(f))) return true
                    const base = String(f).split('/').pop()
                    return base && snapBaseSet.has(base)
                  }
                  let tagText = ''
                  let tagCls = 'ag-tag'
                  let glyph = React.createElement(GlyphCheck, null)
                  let glyphCls = 'ag-row-glyph'
                  if (kind === 'manual-approved') {
                    const lc = ev.learningCount !== undefined ? ev.learningCount : null
                    const th = ev.threshold || 3
                    tagText = lc !== null ? t('view.tagLearning', { n: lc, th }) : t('view.tagApproved')
                    tagCls = 'ag-tag-warn'
                    glyphCls = 'ag-row-glyph-warn'
                    glyph = React.createElement('span', null, '✓')
                  } else if (kind === 'manual-rejected') {
                    // 按拒绝路径精确分类文案（reason 由 host 记录）
                    tagText = rejectLabel(t, ev, false)
                    tagCls = 'ag-tag-err'
                    glyphCls = 'ag-row-glyph-err'
                    glyph = React.createElement('span', null, '✕')
                  } else {
                    tagText = t('view.tagAuto', { label: verdictLabel(t, ev.verdict) })
                    tagCls = 'ag-tag' + (VERDICT_NEUTRAL.has(ev.verdict) ? ' ag-tag-neutral' : '')
                  }
                  return React.createElement('div', { className: 'ag-row', key: ev.id },
                    React.createElement('div', { className: 'ag-row-rail' },
                      React.createElement('span', { className: glyphCls }, glyph),
                      React.createElement('span', { className: 'ag-row-line' }),
                    ),
                    React.createElement('div', { className: 'ag-row-body' },
                      React.createElement('div', { className: 'ag-row-top' },
                        React.createElement('span', { className: 'ag-row-tool' }, ev.tool || 'tool'),
                        React.createElement('span', { className: tagCls }, tagText),
                        React.createElement('span', { className: 'ag-time' }, fmtTime(ev.ts)),
                      ),
                      React.createElement('div', { className: 'ag-row-reason' }, ev.justification || ev.reason || t('common.noJustification')),
                      files.length > 0
                        ? React.createElement('div', { className: 'ag-row-files' },
                            files.map(function (f, i) {
                              // 该事件存在快照 → 文件可点击查看改动对比
                              const chipProps = { key: i, className: 'ag-file-chip' }
                              if (hasSnap(f)) {
                                chipProps.className += ' ag-file-chip-snap'
                                chipProps.title = t('view.chipTip')
                                chipProps.role = 'button'
                                chipProps.onClick = function () { setDiffOpen({ eventId: ev.id, path: f }) }
                              }
                              // 只显示文件名本身（去重后同一文件只有一个 chip）
                              const fname = String(f).split('/').pop()
                              return React.createElement('span', chipProps, fname)
                            }),
                          )
                        : null,
                    ),
                  )
                }).filter(Boolean),
              ),
        diffOpen
          ? React.createElement(DiffPanel, {
              sessionId: sessionId,
              eventId: diffOpen.eventId,
              path: diffOpen.path,
              onClose: function () { setDiffOpen(null) },
            })
          : null,
      )
    }

    // ================= 设置页：自动审批规则管理（settings.section） =================
    // 规则来源标签（预置/学习沉淀/用户）——元素随语言即时切换，改为按 t 构造
    function ruleSourceTag(t, src) {
      const label = src === 'learned' ? t('settings.tagLearned') : src === 'user' ? t('settings.tagUser') : t('settings.tagDefault')
      const cls = src === 'learned' ? 'ag-set-tag-green' : src === 'user' ? 'ag-set-tag-gray' : 'ag-set-tag-blue'
      return React.createElement('span', { className: 'ag-set-tag ' + cls }, label)
    }
    function ruleSource(rule) {
      // 学习沉淀/用户规则由 host 写入中文描述（数据嗅探，非界面文案，保持原样）
      const d = String(rule && rule.description || '')
      if (d.indexOf('自动沉淀') === 0 || d.indexOf('人工确认后') >= 0 || d.indexOf('flash 同类') >= 0) return 'learned'
      if (d === '用户自定义') return 'user'
      return 'default'
    }

    function RulesSettings(props) {
      const t = pickT(props)
      const [snapshot, setSnapshot] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [feedback, setFeedback] = React.useState(null)
      const [newKeyword, setNewKeyword] = React.useState('')
      const [newRule, setNewRule] = React.useState({ tool: '', mode: '', category: '', contains: '' })
      const [threshold, setThreshold] = React.useState('3')
      const [timeoutMs, setTimeoutMs] = React.useState('20000')
      // 判定模型路由（留空跟随会话默认模型）+ 当前生效路由（host GET 返回）
      const [judgeProvider, setJudgeProvider] = React.useState('')
      const [judgeModel, setJudgeModel] = React.useState('')
      const [effectiveModel, setEffectiveModel] = React.useState(null)

      const load = function () {
        fetch('/api/auto-approve/rules', { headers: { 'cache-control': 'no-cache' } })
          .then(function (r) { return r.json() })
          .then(function (data) {
            if (data && data.config) {
              setSnapshot(data)
              setThreshold(String(data.config.riskyThreshold))
              setTimeoutMs(String(data.config.judgeTimeoutMs))
              setJudgeProvider(String(data.config.judgeProvider || ''))
              setJudgeModel(String(data.config.judgeModel || ''))
              setEffectiveModel(data.effectiveModel || null)
              setError(null)
            } else {
              setError(t('settings.loadFailed', { detail: JSON.stringify(data).slice(0, 200) }))
            }
          })
          .catch(function (e) { setError(t('settings.loadFailed', { detail: String((e && e.message) || e) })) })
      }
      React.useEffect(function () { load() }, [])

      const showFeedback = function (msg, ok) {
        setFeedback({ msg: String(msg), ok: ok !== false })
        setTimeout(function () { setFeedback(null) }, 4000)
      }

      const api = function (body) {
        setBusy(true)
        return fetch('/api/auto-approve/rules', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).then(function (r) { return r.json() }).then(function (res) {
          if (res && res.ok) { load(); showFeedback(t('settings.applied')); return res }
          showFeedback(apiErrorText(t, res, t('settings.opFailed')), false)
          return res
        }).catch(function (e) {
          showFeedback(t('settings.requestFailed', { detail: String((e && e.message) || e) }), false)
        }).finally(function () { setBusy(false) })
      }

      const setupNow = function () {
        setBusy(true)
        fetch('/api/auto-approve/setup', { method: 'POST' })
          .then(function (r) { return r.json() })
          .then(function (res) {
            if (res && res.ok) {
              if (res.status === 'already') showFeedback(t('settings.setupAlready'))
              else showFeedback(t('settings.setupWritten', { status: res.status }))
            } else {
              showFeedback(apiErrorText(t, res, t('settings.setupFailed')), false)
            }
            load()
          })
          .catch(function (e) { showFeedback(t('settings.setupRequestFailed', { detail: String((e && e.message) || e) }), false) })
          .finally(function () { setBusy(false) })
      }

      if (!snapshot) {
        return React.createElement('div', { className: 'ag-set' },
          React.createElement('div', { className: error ? 'ag-set-err' : 'ag-set-ok' }, error || t('common.loading')))
      }

      const cfg = snapshot.config
      const setup = snapshot.setup || { configured: false }
      const predefined = snapshot.predefined || {}
      const preDeny = new Set(predefined.denyKeywords || [])
      const preAllow = (predefined.allowRules || []).map(function (r) { return JSON.stringify(r) })
      const preHard = new Set(predefined.hardCategories || [])
      const learnStats = snapshot.learning && snapshot.learning.stats ? snapshot.learning.stats : {}
      const learnHistory = snapshot.learning && snapshot.learning.history ? snapshot.learning.history : {}
      const statKeys = Object.keys(learnStats)
      const histKeys = Object.keys(learnHistory)

      return React.createElement('div', { className: 'ag-set' },
        React.createElement('h3', { className: 'ag-set-title' }, t('settings.title')),
        React.createElement('p', { className: 'ag-set-intro' }, t('settings.intro')),

        // ---- 初始化卡片 ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' }, t('settings.setupTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' },
              t('settings.setupDesc') + (setup.configured ? t('settings.setupConfigured') : t('settings.setupNotConfigured')))),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('button', {
              type: 'button',
              className: 'ag-set-btn' + (setup.configured ? '' : ' ag-set-btn-primary'),
              disabled: busy,
              onClick: setupNow,
            }, setup.configured ? t('settings.setupRecheck') : t('settings.setupButton')),
            !setup.configured ? React.createElement('span', { className: 'ag-set-note' }, t('settings.setupRestartNote')) : null,
          ),
        ),

        // ---- 管道总览 ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' }, t('settings.pipelineTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' }, t('settings.pipelineSub'))),
          React.createElement('div', { className: 'ag-set-grid' },
            (cfg.hardCategories || []).map(function (c) {
              const isPre = preHard.has(c)
              return React.createElement('span', { className: 'ag-set-hc', key: c },
                isPre ? c : c + t('settings.customSuffix'))
            })),
        ),

        // ---- 黑名单（denyKeywords） ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' },
              React.createElement('span', { className: 'ag-set-stage' }, t('settings.stageDeny')),
              t('settings.denyTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' }, t('settings.denySub'))),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('input', {
              className: 'ag-set-input', value: newKeyword, placeholder: t('settings.denyPlaceholder'),
              onChange: function (e) { setNewKeyword(e.target.value) },
              onKeyDown: function (e) { if (e.key === 'Enter' && newKeyword.trim()) { api({ op: 'add', kind: 'denyKeywords', value: newKeyword.trim() }); setNewKeyword('') } },
            }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn', disabled: busy || !newKeyword.trim(),
              onClick: function () { api({ op: 'add', kind: 'denyKeywords', value: newKeyword.trim() }); setNewKeyword('') },
            }, t('common.add')),
          ),
          (cfg.denyKeywords || []).length === 0
            ? React.createElement('div', { className: 'ag-set-empty' }, t('settings.denyEmpty'))
            : React.createElement('div', { className: 'ag-set-list' },
                cfg.denyKeywords.map(function (kw) {
                  return React.createElement('div', { className: 'ag-set-item', key: kw },
                    React.createElement('span', { className: 'ag-set-item-label' }, kw),
                    preDeny.has(kw)
                      ? React.createElement('span', { className: 'ag-set-item-meta' }, t('settings.presetMeta'))
                      : null,
                    React.createElement('button', {
                      type: 'button', className: 'ag-set-item-del', title: t('common.remove'), 'aria-label': t('common.remove') + ' ' + kw,
                      onClick: function () {
                        if (preDeny.has(kw) && !window.confirm(t('settings.denyRemoveConfirm', { keyword: kw }))) return
                        api({ op: 'remove', kind: 'denyKeywords', value: kw })
                      },
                    }, '✕'),
                  )
                }),
              ),
        ),

        // ---- 白名单（allowRules） ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' },
              React.createElement('span', { className: 'ag-set-stage' }, t('settings.stageAllow')),
              t('settings.allowTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' }, t('settings.allowSub'))),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('input', { className: 'ag-set-input', style: { width: 110 }, placeholder: t('settings.phTool'), value: newRule.tool, onChange: function (e) { setNewRule(Object.assign({}, newRule, { tool: e.target.value })) } }),
            React.createElement('input', { className: 'ag-set-input', style: { width: 150 }, placeholder: t('settings.phMode'), value: newRule.mode, onChange: function (e) { setNewRule(Object.assign({}, newRule, { mode: e.target.value })) } }),
            React.createElement('input', { className: 'ag-set-input', style: { width: 110 }, placeholder: t('settings.phCategory'), value: newRule.category, onChange: function (e) { setNewRule(Object.assign({}, newRule, { category: e.target.value })) } }),
            React.createElement('input', { className: 'ag-set-input', style: { width: 130 }, placeholder: t('settings.phContains'), value: newRule.contains, onChange: function (e) { setNewRule(Object.assign({}, newRule, { contains: e.target.value })) } }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn ag-set-btn-primary', disabled: busy || !(newRule.tool || newRule.mode || newRule.category || newRule.contains),
              onClick: function () {
                api({ op: 'add', kind: 'allowRules', value: newRule })
                setNewRule({ tool: '', mode: '', category: '', contains: '' })
              },
            }, t('common.add')),
          ),
          (cfg.allowRules || []).length === 0
            ? React.createElement('div', { className: 'ag-set-empty' }, t('settings.allowEmpty'))
            : React.createElement('div', { className: 'ag-set-list' },
                cfg.allowRules.map(function (rule, idx) {
                  const parts = []
                  if (rule.tool) parts.push('tool=' + rule.tool)
                  if (rule.mode) parts.push('mode=' + rule.mode)
                  if (rule.category) parts.push('category=' + rule.category)
                  if (rule.contains) parts.push('contains=' + rule.contains)
                  const label = parts.join('  ') || t('settings.anyRule')
                  const src = ruleSource(rule)
                  const isPre = preAllow.indexOf(JSON.stringify({ mode: rule.mode, description: rule.description })) >= 0 || (rule.mode === 'workspace-write' && !rule.tool && !rule.category && !rule.contains)
                  return React.createElement('div', { className: 'ag-set-item', key: idx },
                    React.createElement('span', { className: 'ag-set-item-label' }, label),
                    rule.description ? React.createElement('span', { className: 'ag-set-item-meta' }, rule.description) : null,
                    ruleSourceTag(t, src),
                    React.createElement('button', {
                      type: 'button', className: 'ag-set-item-del', title: t('common.remove'), 'aria-label': t('common.remove'),
                      onClick: function () {
                        api({ op: 'remove', kind: 'allowRules', value: { tool: rule.tool, mode: rule.mode, category: rule.category, contains: rule.contains } })
                      },
                    }, '✕'),
                  )
                }),
              ),
        ),

        // ---- 永久人工（denyRules） ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' },
              React.createElement('span', { className: 'ag-set-stage' }, t('settings.stageDenyRules')),
              t('settings.denyRulesTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' }, t('settings.denyRulesSub'))),
          (cfg.denyRules || []).length === 0
            ? React.createElement('div', { className: 'ag-set-empty' }, t('settings.denyRulesEmpty'))
            : React.createElement('div', { className: 'ag-set-list' },
                cfg.denyRules.map(function (rule, idx) {
                  const parts = []
                  if (rule.tool) parts.push('tool=' + rule.tool)
                  if (rule.mode) parts.push('mode=' + rule.mode)
                  if (rule.category) parts.push('category=' + rule.category)
                  if (rule.contains) parts.push('contains=' + rule.contains)
                  return React.createElement('div', { className: 'ag-set-item', key: idx },
                    React.createElement('span', { className: 'ag-set-item-label' }, parts.join('  ') || t('settings.anyRule')),
                    React.createElement('button', {
                      type: 'button', className: 'ag-set-item-del', title: t('common.remove'), 'aria-label': t('common.remove'),
                      onClick: function () {
                        api({ op: 'remove', kind: 'denyRules', value: { tool: rule.tool, mode: rule.mode, category: rule.category, contains: rule.contains } })
                      },
                    }, '✕'),
                  )
                }),
              ),
        ),

        // ---- 学习状态（⑤ 学习沉淀） ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' },
              React.createElement('span', { className: 'ag-set-stage' }, t('settings.stageLearn')),
              t('settings.learningTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' },
              t('settings.learningSub', { th: cfg.riskyThreshold, next: cfg.riskyThreshold + 1 }))),
          statKeys.length === 0
            ? React.createElement('div', { className: 'ag-set-empty' }, t('settings.learningEmpty'))
            : React.createElement('div', { className: 'ag-set-learn' },
                statKeys.map(function (k) {
                  const samples = (learnHistory[k] || []).map(function (s) { return (s && (s.fp || s.ctx)) || '' }).join(' / ').slice(0, 160)
                  return React.createElement('div', { className: 'ag-set-learn-item', key: k },
                    React.createElement('div', { className: 'ag-set-learn-info' },
                      React.createElement('span', { className: 'ag-set-learn-key' }, k),
                      React.createElement('span', { className: 'ag-set-learn-sub' },
                        t('settings.confirmed', { n: learnStats[k], th: cfg.riskyThreshold, samples: samples ? ' · ' + samples : '' })),
                    ),
                    React.createElement('button', {
                      type: 'button', className: 'ag-set-learn-stop', title: t('settings.stopTip'),
                      onClick: function () {
                        if (!window.confirm(t('settings.stopConfirm', { key: k }))) return
                        api({ op: 'remove', kind: 'learning', value: k })
                      },
                    }, t('settings.stopLearning')),
                  )
                }),
              ),
        ),

        // ---- 阈值 / 超时（④ Flash 判定参数） ----
        React.createElement('div', { className: 'ag-set-card' },
          React.createElement('div', { className: 'ag-set-card-head' },
            React.createElement('div', { className: 'ag-set-card-title' },
              React.createElement('span', { className: 'ag-set-stage' }, t('settings.stageJudge')),
              t('settings.judgeTitle')),
            React.createElement('p', { className: 'ag-set-card-sub' },
              t('settings.judgeSub', { th: cfg.riskyThreshold, next: cfg.riskyThreshold + 1 }))),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('span', { className: 'ag-set-item-meta' }, t('settings.thresholdLabel')),
            React.createElement('input', {
              className: 'ag-set-input ag-set-input-num', type: 'number', min: 1, value: threshold,
              onChange: function (e) { setThreshold(e.target.value) },
            }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn', disabled: busy,
              onClick: function () { api({ op: 'set', kind: 'riskyThreshold', value: Number(threshold) }) },
            }, t('common.save')),
            React.createElement('span', { className: 'ag-set-item-meta' },
              t('settings.thresholdHint', { th: Number(threshold), next: Number(threshold) + 1 })),
          ),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('span', { className: 'ag-set-item-meta' }, t('settings.timeoutLabel')),
            React.createElement('input', {
              className: 'ag-set-input ag-set-input-num', type: 'number', min: 1000, value: timeoutMs,
              onChange: function (e) { setTimeoutMs(e.target.value) },
            }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn', disabled: busy,
              onClick: function () { api({ op: 'set', kind: 'judgeTimeoutMs', value: Number(timeoutMs) }) },
            }, t('common.save')),
          ),
          // ---- 判定模型路由（v0.6.0+，类似 dsh-smart-title 的可配置模型）：留空跟随会话默认模型 ----
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('span', { className: 'ag-set-item-meta' }, t('settings.modelProviderLabel')),
            React.createElement('input', {
              className: 'ag-set-input', style: { width: 180 }, value: judgeProvider,
              placeholder: t('settings.modelFollowHint'), spellCheck: false,
              onChange: function (e) { setJudgeProvider(e.target.value) },
            }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn', disabled: busy,
              onClick: function () { api({ op: 'set', kind: 'judgeProvider', value: judgeProvider.trim() }) },
            }, t('common.save')),
          ),
          React.createElement('div', { className: 'ag-set-row' },
            React.createElement('span', { className: 'ag-set-item-meta' }, t('settings.modelModelLabel')),
            React.createElement('input', {
              className: 'ag-set-input', style: { width: 180 }, value: judgeModel,
              placeholder: t('settings.modelFollowHint'), spellCheck: false,
              onChange: function (e) { setJudgeModel(e.target.value) },
            }),
            React.createElement('button', {
              type: 'button', className: 'ag-set-btn', disabled: busy,
              onClick: function () { api({ op: 'set', kind: 'judgeModel', value: judgeModel.trim() }) },
            }, t('common.save')),
          ),
          React.createElement('p', { className: 'ag-set-card-sub' },
            t('settings.modelHint') + (effectiveModel && effectiveModel.provider && effectiveModel.model
              ? t('settings.modelEffective', { route: effectiveModel.provider + '/' + effectiveModel.model })
              : '')),
        ),

        // ---- 反馈 ----
        feedback
          ? React.createElement('div', { className: feedback.ok ? 'ag-set-ok' : 'ag-set-err' }, feedback.msg)
          : null,
      )
    }

    const plugin = {
      inject: ['timer', 'locale'],
      async apply(ctx) {
        const slots = ctx.get('slots')
        if (slots === undefined) return

        // 界面文案：注册 zh/en 词典到共享 locale 注册表（跟随 DSH 设置 → 通用 → 语言 即时切换）。
        // 老版宿主没有 locale 服务时注册失败 → 回退 fallbackT（zh 词典直查），UI 行为不变。
        ctx.effect(() => {
          try {
            if (!ctx.locale || typeof ctx.locale.register !== 'function') return function () {}
            return ctx.locale.register(NS, DICTS)
          } catch (e) {
            console.error('[dsh-approval-gate] 注册界面文案失败：' + String((e && e.message) || e))
            return function () {}
          }
        }, 'dsh-approval-gate: dictionaries')
        // 翻译函数：优先共享 locale 服务的 bind（跟随语言切换），缺失回退 fallbackT。
        // 插槽 label 用 thunk 引用这里的 t，账本投影在 locale revision 变化时经 resolveSlotLabel 重读。
        const t = (ctx.locale && typeof ctx.locale.bind === 'function') ? ctx.locale.bind(NS) : fallbackT

        let styleEl = null
        try {
          styleEl = document.createElement('style')
          styleEl.setAttribute('data-plugin-css', 'dsh-approval-gate')
          styleEl.textContent = CSS
          document.head.appendChild(styleEl)
        } catch (e) {
          console.error('[dsh-approval-gate] 注入样式失败：' + String((e && e.message) || e))
        }
        ctx.effect(() => {
          return () => {
            if (styleEl && styleEl.parentNode) {
              try { styleEl.parentNode.removeChild(styleEl) } catch (e) {}
            }
          }
        })

        // ✅ 自动放行提示条：输入框上方独立行（order=30，排在 todo/goal/queue 之下，天然不重叠）。
        // locale: NS 声明后渲染器注入标准 t 席位（props.t），语言切换时出口自动重渲染。
        slots.inject('conversation.input.dock', function () {
          return slots.register(
            { name: 'conversation.input.dock', id: 'dsh-approval-gate.notice', order: 30, locale: NS },
            function (props) { return React.createElement(NoticeStrip, { slotsProps: props, t: props.t }) },
          )
        })

        // 审批历史视图：conversation.view（order=20，位于轨迹 order=10 右侧）。
        // label 为 thunk → 账本投影经 resolveSlotLabel 在语言切换时重读。
        slots.inject('conversation.view', function () {
          return slots.register(
            {
              name: 'conversation.view',
              id: 'dsh-approval-gate.history',
              order: 20,
              locale: NS,
              label: function () { return t('view.tab') },
              inject: (sessionId) => ({ sessionId }),
            },
            function (props) { return React.createElement(HistoryView, { slotsProps: props, t: props.t }) },
          )
        })

        // 设置页：自动审批规则管理（settings.section）
        slots.inject('settings.section', function () {
          return slots.register(
            {
              name: 'settings.section',
              id: 'dsh-approval-gate.settings',
              order: 60,
              locale: NS,
              label: function () { return t('settings.nav') },
            },
            function (props) { return React.createElement(RulesSettings, { slotsProps: props, t: props.t }) },
          )
        })
      },
    }

    exports.default = plugin
    exports.apply = plugin.apply
    exports.inject = plugin.inject
    return module.exports
  },
})
