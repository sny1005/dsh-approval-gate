[简体中文](README.md) | **English**

# dsh-approval-gate-plus

**Auto-approval gate for DeepSeek Harness (enhanced fork) — minimal human intervention: safe operations auto-approve, risky ones go to a human (fail-safe).**

A Flash model pre-judges every sandbox escalation: routine operations auto-approve, hard-risk operations (deletion / credentials / remote / system / bulk) always require human confirmation; learned rules only ever cover operations you confirmed, with an in-app human review UI.

> This project is an enhanced fork of [moon09300731/dsh-approval-gate](https://github.com/moon09300731/dsh-approval-gate), maintained from upstream v0.5.2. The package name, loader row id and display title are `dsh-approval-gate-plus` / "Approval Gate Plus" to keep it distinguishable from upstream. The data directory stays `$DSH_HOME/auto-approve/`, so upstream rules and learning records carry over unchanged.
>
> ⚠️ This fork registers the same host API prefix (`/api/auto-approve/*`) and approval waterfall hook as upstream — **do not install both into the same profile**.

## ✨ Features

- ⚡ **Flash risk pre-judgment**: every sandbox escalation is judged by a Flash model (`SAFE` / `RISKY:<category>`); recoverable operations auto-approve
- 🛡️ **Hard risks are always human**: deletion, credentials, remote/production, system paths, and bulk irreversible operations go directly to human — no counting, no learning
- 🎯 **Confirmation-based learning**: after N-1 human confirmations of the same operation, it auto-approves; persisted rules carry an **operation fingerprint**, so only operations you confirmed are auto-approved
- 🧠 **Semantic similarity verification**: operations with different wording but the same intent are judged by Flash against your confirmed samples — no keyword dependency
- 📄 **File diff & revert** (v0.5.0+): click a file in an approval record to view a **unified diff** — changed lines with ±5 context lines, multiple changes grouped into hunks separated by gray "N unmodified lines" bars, green additions / red deletions / gray context, dual line numbers; one-click **Revert** sends a command for the AI to restore the file from snapshot
- 🗂️ **Session-scoped snapshots** (v0.5.0+): snapshots belong to the event's session; the approval view shows only the current session's snapshot stats; clearing supports "this session only" vs "clear all" to avoid wiping other sessions' unviewed diffs
- 🔧 **Hot-reloadable config**: `allowlist.json` edits take effect immediately, no restart
- ✅ **Human review UI**: a green notice appears above the composer on auto-approval; the "Approval" view (right of Trajectory) shows the current session's full auto-approval timeline
- 🎛️ **Configurable judge model** (v0.6.0+, dropdowns in v0.6.2+): a dedicated "Judge model" settings section with **provider and model dropdowns** populated from the providers/models DSH actually has configured (`llm.listProviders()` / `llm.listModels()`); the pin is stored as `judgeProvider` / `judgeModel` and hot-reloads, empty follows the session agent model
- 🌐 **Bilingual UI** (v0.6.0+): UI copy follows the DSH language setting and switches live (built-in 简体中文 / English); the plugin's display title and description on the Plugins page are localized too

## 🔀 Major differences from upstream (v0.5.2)

| Area | Upstream | This fork (`-plus`) |
|------|----------|---------------------|
| Judge model | Always follows the session agent model | Dedicated settings card with provider/model **dropdowns** fed by the configured model catalog (v0.6.2+); pin stored as `judgeProvider` + `judgeModel` (hot reload); falls back to the session model → built-in Flash |
| UI language | Chinese only, hard-coded | All copy goes through the DSH client locale service (zh/en live switch); `locale/*.json` localizes the plugin's display title/description |
| DSH 0.2.x support | Profile path hard-coded to `profiles/web`; `permissionPresets.current(session.events)` is always `undefined` on 0.2.x, so the gate silently never engages | Profile path reads `DSH_PROFILE_DIR` / `DSH_PROFILE`; uses `permissionPresets.current(session)`; built-in fallback model aligned to `deepseek-flash` |
| Flash call resilience | Always sends `reasoningEffort: 'off'`; relay/custom providers that reject it fail outright | On "does not support reasoning effort", retries once without the parameter (all other errors still fail safe) |
| Error feedback | Chinese `error` strings only | Host returns stable `code`/`params`; the client localizes them for the active language |
| Plugin identity | `dsh-approval-gate` / "Auto-Approval Gate" | `dsh-approval-gate-plus` / "Approval Gate Plus" |

> 0.6.1 is a DSH manifest-compliance release: `package.json` now declares `dsh.manifestVersion`, `engines.dsh` / `engines.node`, `files` / `exports`, repository and contributor info; the `cordis.patch.yml` row `name` strictly equals the package name (the browser half is served from `/plugins/<name>/client.js`).

## 📸 Interface Overview

### ① Approval View

![Approval View](docs/screenshots/approval-view.png)

The "Approval" tab (right of Trace) lists the current session's auto-allowed and manually-approved actions in reverse-chronological order: each record shows the tool (`bash` / `edit`), a verdict tag ("Auto-allowed · Flash safe", "Approved" etc.), timestamp and description. The top bar shows this session's **diff snapshot usage** (`2.9 KB · 3 items`) with two cleanup options: **"This session only"** (removes only the current session's snapshots, never touching other sessions' unviewed diffs) and **"Clear all"** (double-confirmed, clears every session).

### ② File Diff

![Diff Dialog](docs/screenshots/diff-panel.png)

Click a file in an approval record to open the diff dialog: a **unified diff** with green additions (`+`), red deletions (`-`) and gray context lines; dual **old/new line numbers** on the left; multiple changes grouped into **hunks** with gray "`6 unmodified lines`" separators folding unchanged regions. The header shows `+2 / -2 changed · 20 unchanged`. The **Revert** button at the bottom sends an undo command to the conversation so the AI restores the file from the pre-approval snapshot.

### ③ Settings · Auto-approval

![Settings Auto-approval](docs/screenshots/settings-auto-approve.png)

The "Auto-approval" section in Settings provides full configuration: **preset initialization** (one-click write of the `auto-approve` preset into `cordis.patch.yml`), **pipeline overview** (DENY → allowlist → denyRules → Flash → learning), **deny-keyword blacklist** (built-in entries + custom add), and hot-reload notes (changes take effect immediately, no restart).

## 🚀 Quick Start

```sh
# Install from this repository (not published to npm)
dsh plugin --profile web add "github:sny1005/dsh-approval-gate#main"
```

1. **Add the permission preset**: append the `auto-approve` preset to the profile's `cordis.patch.yml` ([see guide](docs/GUIDE.en.md#%E2%9A%A0%EF%B8%8F-manual-permission-preset-required-after-install))
2. **Restart** `dsh web` (or restart the desktop app)
3. **Select the preset**: choose "Auto Approval (Flash)" in the session's permission dropdown

Data files stay in the upstream directory `$DSH_HOME/auto-approve/` (default `~/.dsh/auto-approve/`), so switching from upstream needs no migration: remove upstream, then install this fork.

## 📖 Docs

- [Full Guide (pipeline / configuration / security / review UI)](docs/GUIDE.en.md) · [中文指南](docs/GUIDE.md)
- [Changelog](CHANGELOG.md) · [Upstream project](https://github.com/moon09300731/dsh-approval-gate)

## 📄 License

MIT
