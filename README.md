**简体中文** | [English](README.en.md)

# dsh-approval-gate-plus

**DeepSeek Harness 自动审批门控（增强分支）—— 最小人工介入，安全自动放行、危险转人工（fail-safe）。**

Flash 模型预判每次沙箱越界：常规操作自动放行，硬风险操作（删除 / 凭据 / 远程 / 系统 / 批量）永远转人工确认；学习沉淀只针对你确认过的操作，并提供界面化人工审查入口。

> 本项目是 [moon09300731/dsh-approval-gate](https://github.com/moon09300731/dsh-approval-gate) 的增强分支（fork），从上游 v0.5.2 继续维护。包名、loader 行 id 与展示名改为 `dsh-approval-gate-plus` /「自动审批门控 Plus」，以便与上游并存识别；配置目录仍为 `$DSH_HOME/auto-approve/`，可直接沿用上游的规则与学习记录。
>
> ⚠️ 本分支与上游注册相同的宿主 API 前缀（`/api/auto-approve/*`）和审批瀑布钩子，**不要在同一个 profile 里同时安装两者**。

## ✨ 特性

- ⚡ **Flash 风险预判**：每次沙箱越界由 Flash 模型判定（`SAFE` / `RISKY:<类别>`），可回补操作自动放行
- 🛡️ **硬风险永远人工**：删除、凭据、远程/生产、系统路径、批量不可回补五类操作直接转人工，不计数、不学习
- 🎯 **确认制学习**：同一操作确认 N-1 次后自动放行；沉淀规则携带**操作指纹**，只放行你确认过的操作
- 🧠 **语义同类验证**：措辞变化但意图相同的操作，由 Flash 对照你的确认样本语义判断，不再依赖关键词
- 🔧 **配置热更新**：`allowlist.json` 修改即时生效，无需重启
- ✅ **人工审查 UI**：自动放行时输入框上方出现绿色提示；「审批」视图（轨迹右侧）展示当前会话完整放行时间线
- 📄 **文件改动对比与撤销**（v0.5.0+）：审批涉及的文件可点击查看 **unified diff**——变动行带上下 5 行上下文、多处修改按 hunk 分区并以「N unmodified lines」分隔条折叠、绿加红删灰上下文、双行号；一键「撤销此改动」投递指令让 AI 按快照恢复文件
- 🗂️ **会话级快照管理**（v0.5.0+）：快照按事件归属会话，审批视图按当前会话统计；清理支持「仅清本会话」与「清空全部」两档，避免误删其他会话未查看的 diff 记录
- 🎛️ **判定模型可配置**（v0.6.0+）：`judgeProvider` / `judgeModel` 热更新配置（设置页直接修改），两项都填写时风险预判与同类验证固定走该模型，留空跟随会话默认模型
- 🌐 **界面双语**（v0.6.0+）：界面文案跟随 DSH 语言设置即时切换（内置简体中文 / English），插件管理页的展示名称与描述同步本地化

## 🔀 与上游（v0.5.2）的主要差异

| 方向 | 上游 | 本分支（`-plus`） |
|------|------|------------------|
| 判定模型 | 固定跟随会话默认模型 | `judgeProvider` + `judgeModel` 可配置（设置页 + 热更新），失败回退会话模型 → 内置 Flash |
| 界面语言 | 仅中文硬编码 | 全量文案走 DSH client locale（zh/en 即时切换），`locale/*.json` 提供插件展示名/描述本地化 |
| DSH 0.2.x 适配 | profile 路径写死 `profiles/web`；`permissionPresets.current(session.events)` 在 0.2.x 恒为 `undefined`，门控静默失效 | profile 路径读 `DSH_PROFILE_DIR` / `DSH_PROFILE`；改用 `permissionPresets.current(session)`；内置兜底模型对齐 `deepseek-flash` |
| Flash 调用健壮性 | 固定发送 `reasoningEffort: 'off'`，中转/自定义 provider 不支持时直接失败 | 被拒「不支持 reasoning effort」时去掉该参数重试一次（其余错误仍 fail-safe 抛错） |
| 错误反馈 | 仅中文 `error` 字符串 | host 返回稳定 `code`/`params`，客户端按当前语言本地化 |
| 插件标识 | `dsh-approval-gate` / 「自动审批门控」 | `dsh-approval-gate-plus` /「自动审批门控 Plus」 |

> 0.6.1 起为 DSH 插件规范整理：`package.json` 补充 `dsh.manifestVersion`、`engines.dsh`/`engines.node`、`files`/`exports`、仓库与贡献者信息；`cordis.patch.yml` 的 `name` 严格等于包名（客户端 bundle 走 `/plugins/<name>/client.js`）。

## 📸 界面速览

### ① 审批视图

![审批视图](docs/screenshots/approval-view.png)

「审批」标签页（轨迹右侧）按时间倒序展示当前会话的自动放行与人工审批记录：每条记录含工具名（`bash` / `edit`）、判定标签（「自动放行 · Flash 判定安全」「人工通过」等）、时间与操作说明。顶部统计栏显示本会话的 **diff 快照占用**（`2.9 KB · 3 条`），并提供两个清理入口：**「仅清本会话」**（只删除当前会话的快照，不影响其他会话未查看的 diff）与 **「清空全部」**（二次确认后清空所有会话，防止误删）。

### ② 文件改动对比（diff）

![diff 对话框](docs/screenshots/diff-panel.png)

点击审批记录中的文件即可打开对比面板：以 **unified diff** 展示改动前后差异——新增行绿底（`+`）、删除行红底（`-`）、上下文行灰底；左侧显示**原/新双行号**；多处修改按 **hunk 分区**，块间以灰色「`6 unmodified lines`」分隔条折叠未变更区间。顶部统计 `+2 / -2 行变更 · 20 行未变`。底部 **「撤销此改动」** 一键向对话投递撤销指令，AI 将按审批前的快照恢复文件。

### ③ 设置 · 自动审批

![设置-自动审批](docs/screenshots/settings-auto-approve.png)

设置页「自动审批」分区提供完整配置：**初始化权限预设**（一键写入 `cordis.patch.yml` 的 `auto-approve` 预设）、**当前判定管道总览**（DENY → 白名单 → denyRules → Flash → 学习）、**危险词黑名单**（预置条目 + 自定义添加）、以及热更新说明（修改即时生效，无需重启）。

## 🚀 快速开始

```sh
# 从本仓库安装（尚未发布到 npm）
dsh plugin --profile web add "github:sny1005/dsh-approval-gate#main"
```

1. **配置权限预设**：在 profile 的 `cordis.patch.yml` 添加 `auto-approve` 预设（[详见指南](docs/GUIDE.md#%E5%AE%89%E8%A3%85%E5%90%8E%E5%BF%85%E9%A1%BB%E6%89%8B%E5%8A%A8%E9%85%8D%E7%BD%AE%E6%9D%83%E9%99%90%E9%A2%84%E8%AE%BE%E5%85%B3%E9%94%AE%E6%AD%A5%E9%AA%A4)）
2. **重启** `dsh web`（或重启桌面端）
3. **选择预设**：会话权限下拉选中「自动审批（Flash）」

数据文件沿用上游目录 `$DSH_HOME/auto-approve/`（默认 `~/.dsh/auto-approve/`），因此从上游切换过来无需迁移配置；卸载上游后再安装本分支即可。

## 📖 文档

- [完整指南（管道 / 配置 / 安全设计 / 审查 UI）](docs/GUIDE.md) · [English Guide](docs/GUIDE.en.md)
- [变更记录](CHANGELOG.md) · [上游项目](https://github.com/moon09300731/dsh-approval-gate)

## 📄 License

MIT
