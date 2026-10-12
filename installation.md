# Install @mageyuki/opencode-claude-auth

These instructions are designed for AI coding agents. This is an **unofficial fork** of [`opencode-claude-auth`](https://github.com/griffinmartin/opencode-claude-auth) (by griffinmartin), maintained at [mageyuki/opencode-claude-auth](https://github.com/mageyuki/opencode-claude-auth). This version requires **OpenCode 2** — it will not load on OpenCode 1.

> **Status: prepared for npm, not yet published.** Installing `@mageyuki/opencode-claude-auth` only works after a release has actually been published to npm. Do not enable it together with the upstream `opencode-claude-auth` package: both register the same plugin id.

## Prerequisites

Before installing, verify you have OpenCode 2 and Claude Code installed and authenticated.

### Check OpenCode version

```bash
opencode --version
```

You need an OpenCode 2 build. See the [OpenCode 2 migration guide](https://opencode.ai/v2/docs/migrate-v1) if you're still on an OpenCode 1 build (`1.x`).

### Claude Code authentication

Claude Code authentication is an operator-owned prerequisite; never read, print, copy or request credential/token files to check it; credential setup/refresh is not part of this preparation.

## Installation

### Step 1: Add to OpenCode configuration

Edit the OpenCode configuration file at `~/.config/opencode/opencode.json`.

Add `@mageyuki/opencode-claude-auth@2.2.1` to the `plugins` array, keeping any existing plugin entries unchanged:

```json
{
  "plugins": ["@mageyuki/opencode-claude-auth@2.2.1"]
}
```

> OpenCode 2 uses the `plugins` key (plural). OpenCode 1 used `plugin` (singular) — using the wrong key for your OpenCode version means the plugin silently never loads.

Do not rewrite an existing `opencode.json` automatically; edit the `plugins` array by hand and preserve unrelated settings and plugin entries.

The version is pinned to the release `2.2.1` so that installs are reproducible. No manual `npm install` is needed — OpenCode installs package plugins itself (see the [OpenCode 2 plugins guide](https://opencode.ai/v2/docs/plugins)); the CLI equivalent is `opencode plugin add @mageyuki/opencode-claude-auth@2.2.1`.

### Step 2: Connect it

Future operator activity (after a release is published and installed): restart OpenCode, then in the TUI run `/connect`, choose **Anthropic**, and select **Import Claude Code subscription**. Existing Claude Code credentials in the Keychain, `~/.claude/.credentials.json`, or `$CLAUDE_CONFIG_DIR/.credentials.json` are imported without another browser login.

Use `/models` and pick a model under **Anthropic**.

### Step 3: Verification

Verify the plugin was added:

```bash
cat ~/.config/opencode/opencode.json
```

You should see `@mageyuki/opencode-claude-auth@2.2.1` in the `plugins` array. You can also confirm the plugin loaded with:

```bash
opencode plugin list
```

The list should contain `griffinmartin.claude-auth`.

## Upgrading

The exact version `2.2.1` stays pinned. `opencode plugin update` skips exact package revisions, so it does not update or reinstall this pin and must not be used as the fix. Moving to a different version is a separate, explicitly approved configuration edit, made only after that version is published and reviewed.

## Migrating from OpenCode 1

If you were previously running this plugin under OpenCode 1, this version drops OpenCode 1 support entirely — it targets OpenCode 2's plugin and auth APIs, which are not compatible with OpenCode 1. If you still need OpenCode 1, use the upstream `opencode-claude-auth` package at a release prior to its OpenCode 2 adoption instead of this fork.

The old OpenCode 1 connection isn't reused. Claude Code authentication remains an operator-owned prerequisite (see Prerequisites). After a future release is installed, restart OpenCode 2, then follow [Step 2](#step-2-connect-it) above to reconnect — this is future operator activity, not part of this preparation.

## Done

The plugin is now installed and connected. When you run OpenCode, it will automatically use your Claude Code subscription credentials — no separate login needed.

## Troubleshooting

If you encounter issues, see the [main README troubleshooting section](README.md#troubleshooting).
