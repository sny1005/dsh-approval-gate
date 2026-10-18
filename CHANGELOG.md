# Changelog

All notable changes to this fork are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Upstream base: [moon09300731/dsh-approval-gate](https://github.com/moon09300731/dsh-approval-gate) v0.5.2 (commit `8419bc3`).

## [0.6.2] - 2026-10-18

Judge model selection is now a first-class settings surface instead of two free-text
inputs.

### Added

- **Model catalog API**: `GET /api/auto-approve/models` aggregates `llm.listProviders()`
  with each provider's `llm.listModels(id)` and returns `{ providers: [{ id, name, models: [{ id, name }] }] }`.
  Results are cached for 60 s; a provider whose adapter advertises no models (or is
  temporarily unreachable) contributes an empty list instead of failing the request.
- **Judge model card** in the settings page: a provider dropdown and a dependent model
  dropdown, populated from the live catalog, plus a single Save that writes the route
  atomically. Options show `name — id` when they differ; the session-model option
  ("Follow the session agent model") is the default. A configured value that is no
  longer advertised stays selectable, so custom/removed routes are never dropped
  silently. Failures to load the catalog degrade to the current values.
- **`judgeRoute` rule op**: `POST /api/auto-approve/rules` with
  `{ op: "set", kind: "judgeRoute", value: { provider, model } }` writes
  `judgeProvider` + `judgeModel` in one atomic update. Partial routes (one side empty)
  are rejected with the stable code `routeIncomplete`; `judgeProvider` / `judgeModel`
  single-key ops remain supported for scripts.

### Changed

- The model inputs moved out of the ④ card into their own card (no pipeline renumbering).
- Settings copy for the judge route now describes dropdown selection; zh/en dictionaries
  and GUIDE/README updated.

## [0.6.1] - 2026-10-18

Fork identity + DSH plugin-manifest compliance. No behavior change in the
approval pipeline.

### Changed

- Renamed the package, loader row id and display title to `dsh-approval-gate-plus` /「自动审批门控 Plus」/ "Approval Gate Plus" so the fork is distinguishable from upstream.
- `client.js`: the `window.__ModuleLoader__.load` id, slot ids, injected style marker, debug prefixes and locale namespace now use the new identity. DSH serves the browser half from `/plugins/<package name>/client.js`, so the loader id must equal `package.json.name`.
- `src/index.mjs`: `NAME` and abort labels use the new identity.
- `locale/zh.json` / `locale/en.json`: plugin title and description updated for the fork.
- README / GUIDE: install from `github:sny1005/dsh-approval-gate#main`, fork-vs-upstream comparison, and the "do not install both" note. The data directory intentionally stays `$DSH_HOME/auto-approve/` for a drop-in switch from upstream.

### Added

- `package.json` DSH metadata now standard-compliant: `dsh.manifestVersion: 1`, `engines.dsh` (`>=0.2.0-rc.1 <0.3.0-0 || >=0.2.1-0 <0.3.0-0` — the union is required because strict SemVer excludes `0.2.1-rc.x` prereleases from a range whose only prerelease comparator is on `0.2.0`), `engines.node` (`>=22.19.0`), `files` / `exports` covering the client bundle, locale dictionaries and docs, plus repository/homepage/bugs and upstream contributor attribution.
- `cordis.patch.yml`: documented why the row `name` must equal the package name, and that the permission preset still has to be configured per profile.
- `scripts/check-manifest.mjs` (`npm test` / `npm run check:manifest`): asserts package name/version/engines, patch row name, client loader id, locale service injection and locale metadata stay in sync.

## [0.6.0] - fork feature batch (based on upstream v0.5.2)

### Added

- **Configurable judge model**: `judgeProvider` + `judgeModel` in `allowlist.json`; when both are set, risk judgment and similarity verification use that route (hot reload, editable from the settings page). Empty follows the session agent model, then falls back to `deepseek-official` / `deepseek-flash`.
- **Bilingual UI**: all client copy is registered through the DSH client locale service (`ctx.locale.register`) and switches live with Settings → General → Language; `locale/*.json` localizes the plugin's display title and description.
- Host rule API failures now return a stable `code` (+`params`) so the client can localize errors while keeping the raw `error` text.
- Settings page shows the effective judge route (`effectiveModel`).

### Fixed

- **DSH 0.2.x profile path**: the one-click permission-preset setup wrote to a hard-coded `profiles/web`; it now follows `DSH_PROFILE_DIR` / `DSH_PROFILE` (fixes the desktop profile).
- **Approval gate never engaged on 0.2.x**: `permissionPresets.current(session.events)` was passed the wrong argument; now uses `permissionPresets.current(session)`.
- **Fallback model id**: aligned to the default catalog's `deepseek-flash` (was `deepseek-v4-flash`).
- **Relay/custom providers without `reasoningEffort: 'off'`**: the Flash call degrades once by dropping the parameter; other errors still fail safe.

## [0.5.2] - upstream base

See the [upstream changelog/history](https://github.com/moon09300731/dsh-approval-gate/commits/main).
