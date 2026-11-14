# Install @mageyuki/opencode-claude-auth

These instructions are designed for AI coding agents. This is an **unofficial fork** of [`opencode-claude-auth`](https://github.com/griffinmartin/opencode-claude-auth) (by griffinmartin), maintained at [mageyuki/opencode-claude-auth](https://github.com/mageyuki/opencode-claude-auth). This version requires **OpenCode 2** — it will not load on OpenCode 1. For OpenCode 1, use the upstream package `opencode-claude-auth@2.2.1` (see [Migrating from OpenCode 1](#migrating-from-opencode-1)).

> Do not enable this package together with the upstream `opencode-claude-auth` package: both register the same plugin id.

## Prerequisites

Before installing, verify you have OpenCode 2 and Claude Code installed.

### Check OpenCode version

```bash
opencode --version
```

You need an OpenCode 2 build. See the [OpenCode 2 migration guide](https://opencode.ai/v2/docs/migrate-v1) if you're still on an OpenCode 1 build (`1.x`).

### Claude Code authentication

Claude Code must already be signed in; the user does this by running `claude`. Do not read, print, copy or ask for the Claude Code credential or token files (Keychain entry, `~/.claude/.credentials.json`, `$CLAUDE_CONFIG_DIR/.credentials.json`) to check this — they contain secrets. If the user is not signed in, ask them to run `claude` themselves.

## Installation

### Step 1: Add to OpenCode configuration

Edit the OpenCode configuration file at `~/.config/opencode/opencode.json`.

Add `@mageyuki/opencode-claude-auth@3.0.2` to the `plugins` array, keeping any existing plugin entries unchanged:

```json
{
  "plugins": ["@mageyuki/opencode-claude-auth@3.0.2"]
}
```

> OpenCode 2 uses the `plugins` key (plural). OpenCode 1 used `plugin` (singular).

Do not rewrite an existing `opencode.json` automatically; edit the `plugins` array by hand and preserve unrelated settings and plugin entries. If an older `@mageyuki/opencode-claude-auth@…` entry is already present, replace it instead of adding a second one.

The version is pinned to the release `3.0.2` so that installs are reproducible. No manual `npm install` is needed — OpenCode installs package plugins itself (see the [OpenCode 2 plugins guide](https://opencode.ai/v2/docs/plugins)); the CLI equivalent is `opencode plugin add @mageyuki/opencode-claude-auth@3.0.2`.

### Step 2: Connect it

Restart OpenCode, then in the TUI run `/connect`, choose **Anthropic**, and select **Import Claude Code subscription**. Existing Claude Code credentials in the Keychain, `~/.claude/.credentials.json`, or `$CLAUDE_CONFIG_DIR/.credentials.json` are imported without another browser login.

Use `/models` and pick a model under **Anthropic**.

### Step 3: Verification

Verify the plugin was added:

```bash
cat ~/.config/opencode/opencode.json
```

You should see `@mageyuki/opencode-claude-auth@3.0.2` in the `plugins` array. You can also confirm the plugin loaded with:

```bash
opencode plugin list
```

The list should contain `griffinmartin.claude-auth`.

## Upgrading

The exact version stays pinned, so OpenCode does not move to a newer release on its own. To upgrade, change the version in the `@mageyuki/opencode-claude-auth@…` entry of the `plugins` array to the newer published release and restart OpenCode.

## Migrating from OpenCode 1

If you were previously running upstream `opencode-claude-auth` under OpenCode 1, note that this fork (like upstream 3.0.0 and later) does not support OpenCode 1 — it targets OpenCode 2's plugin and auth APIs, which are not compatible with OpenCode 1.

1. Upgrade OpenCode — see the [OpenCode 2 migration guide](https://opencode.ai/v2/docs/migrate-v1).
2. Remove `opencode-claude-auth` from the `plugin` key (OpenCode 1) and add `@mageyuki/opencode-claude-auth@3.0.2` to the `plugins` key (OpenCode 2), as in [Step 1](#step-1-add-to-opencode-configuration).
3. The old OpenCode 1 connection isn't reused. Run `claude` if Claude Code isn't already signed in, restart OpenCode 2, then follow [Step 2](#step-2-connect-it) above to reconnect.

If you still need OpenCode 1, use the upstream package pinned to **2.2.1** — the last upstream release that supports it — instead of this fork:

```json
{
  "plugin": ["opencode-claude-auth@2.2.1"]
}
```

## Done

The plugin is now installed and connected. When you run OpenCode, it will automatically use your Claude Code subscription credentials — no separate login needed.

## Troubleshooting

If you encounter issues, see the [main README troubleshooting section](README.md#troubleshooting).
