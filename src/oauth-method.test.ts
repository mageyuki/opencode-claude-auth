import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ClaudeAccount } from "./keychain.ts"
import {
  authorizeOAuth,
  buildOAuthCredential,
  CLAUDE_CODE_OAUTH_METADATA_KEY,
  CLAUDE_CODE_OAUTH_METADATA_VALUE,
  labelOAuthCredential,
  oauthMethodDescriptor,
  refreshOAuthCredential,
  resolveAuthorizeSource,
  type OAuthDeps,
} from "./oauth-method.ts"

function account(overrides: Partial<ClaudeAccount> = {}): ClaudeAccount {
  return {
    label: "Claude Pro",
    source: "Claude Code-credentials",
    credentials: {
      accessToken: "sk-ant-oat01-access",
      refreshToken: "sk-ant-ort01-refresh",
      expiresAt: Date.now() + 3_600_000,
    },
    ...overrides,
  }
}

function makeDeps(overrides: Partial<OAuthDeps> = {}): OAuthDeps & {
  calls: Record<string, unknown[]>
} {
  const calls: Record<string, unknown[]> = {
    setActiveAccountSource: [],
    saveAccountSource: [],
    log: [],
  }
  return {
    calls,
    refreshAccountsList: () => [account()],
    getAccountBySource: (source) =>
      source === "acct"
        ? account({
            source,
            configDir: "/tmp/claude",
            credentials: {
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: 1,
            },
          })
        : null,
    refreshIfNeeded: async () => null,
    loadPersistedAccountSource: () => null,
    getCachedCredentials: async () => null,
    setActiveAccountSource: (source) => {
      calls.setActiveAccountSource.push(source)
    },
    saveAccountSource: (source) => {
      calls.saveAccountSource.push(source)
    },
    log: (event, data) => {
      calls.log.push([event, data])
    },
    ...overrides,
  }
}

describe("oauthMethodDescriptor", () => {
  it("omits the chooser for a single account", () => {
    const descriptor = oauthMethodDescriptor([account()])
    assert.equal(descriptor.id, "claude-code")
    assert.equal(descriptor.type, "oauth")
    assert.equal(descriptor.label, "Import Claude Code subscription")
    assert.equal(descriptor.form, undefined)
  })

  it("omits the chooser for zero accounts", () => {
    assert.equal(oauthMethodDescriptor([]).form, undefined)
  })

  it("offers every account through a pick-list form field", () => {
    const descriptor = oauthMethodDescriptor([
      account({ label: "Claude Pro", source: "a" }),
      account({ label: "Claude Max", source: "b" }),
    ])
    // A chooser is a `string` field carrying `options`; OpenCode has no
    // `select` field type, and a field without `options` renders as free text.
    assert.equal(descriptor.form?.length, 1)
    const field = descriptor.form?.[0]
    assert.equal(field?.type, "string")
    assert.equal(field?.key, "account")
    assert.equal(field?.title, "Select a Claude Code account")
    assert.equal(field?.required, true)
    assert.deepEqual(field?.type === "string" ? field.options : undefined, [
      { value: "a", label: "Claude Pro", description: "a" },
      { value: "b", label: "Claude Max", description: "b" },
    ])
    // Without `custom` the host only accepts one of the listed accounts.
    assert.equal(field?.type === "string" ? field.custom : undefined, undefined)
  })

  it("collects the answer under the key resolveAuthorizeSource reads", () => {
    const accounts = [
      account({ label: "Claude Pro", source: "a" }),
      account({ label: "Claude Max", source: "b" }),
    ]
    const field = oauthMethodDescriptor(accounts).form?.[0]
    assert.ok(field)
    const answer = { [field.key]: "b" }
    assert.equal(
      resolveAuthorizeSource(answer, accounts, {
        refreshAccountsList: () => accounts,
        loadPersistedAccountSource: () => "a",
      }),
      "b",
    )
  })
})

describe("resolveAuthorizeSource", () => {
  it("prefers inputs.account over everything else", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "latest" })],
      loadPersistedAccountSource: () => "persisted",
    })
    const source = resolveAuthorizeSource(
      { account: "explicit" },
      [account({ source: "fallback" })],
      deps,
    )
    assert.equal(source, "explicit")
  })

  it("falls back to the persisted account source", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "latest" })],
      loadPersistedAccountSource: () => "persisted",
    })
    const source = resolveAuthorizeSource(
      {},
      [account({ source: "fallback" })],
      deps,
    )
    assert.equal(source, "persisted")
  })

  it("falls back to the first freshly-listed account", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "latest" })],
      loadPersistedAccountSource: () => null,
    })
    const source = resolveAuthorizeSource(
      {},
      [account({ source: "fallback" })],
      deps,
    )
    assert.equal(source, "latest")
  })

  it("falls back to the first account from the original snapshot", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [],
      loadPersistedAccountSource: () => null,
    })
    const source = resolveAuthorizeSource(
      {},
      [account({ source: "fallback" })],
      deps,
    )
    assert.equal(source, "fallback")
  })

  it("returns undefined when nothing is available", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [],
      loadPersistedAccountSource: () => null,
    })
    const source = resolveAuthorizeSource({}, [], deps)
    assert.equal(source, undefined)
  })

  it("ignores a non-string inputs.account", () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "latest" })],
      loadPersistedAccountSource: () => null,
    })
    const source = resolveAuthorizeSource({ account: 42 }, [], deps)
    assert.equal(source, "latest")
  })
})

describe("buildOAuthCredential", () => {
  it("builds a credential for the matching account", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [
        account({ source: "a", label: "A" }),
        account({ source: "b", label: "B" }),
      ],
    })
    const value = await buildOAuthCredential("b", deps)
    assert.equal(value.type, "oauth")
    assert.equal(value.methodID, "claude-code")
    assert.equal(value.metadata?.source, "b")
    assert.equal(value.metadata?.label, "B")
    assert.equal(
      value.metadata?.[CLAUDE_CODE_OAUTH_METADATA_KEY],
      CLAUDE_CODE_OAUTH_METADATA_VALUE,
    )
  })

  it("falls back to the first account when the source doesn't match any", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "only" })],
    })
    const value = await buildOAuthCredential("missing", deps)
    assert.equal(value.metadata?.source, "only")
  })

  it("throws when there are no accounts at all", async () => {
    const deps = makeDeps({ refreshAccountsList: () => [] })
    await assert.rejects(
      () => buildOAuthCredential("anything", deps),
      /Run `claude` to authenticate first/,
    )
  })

  it("prefers cached credentials over the account's stored credentials", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "a" })],
      getCachedCredentials: async () => ({
        accessToken: "cached-access",
        refreshToken: "cached-refresh",
        expiresAt: 123,
      }),
    })
    const value = await buildOAuthCredential("a", deps)
    assert.equal(value.access, "cached-access")
    assert.equal(value.refresh, "cached-refresh")
    assert.equal(value.expires, 123)
  })

  it("falls back to the account's stored credentials when nothing is cached", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [
        account({
          source: "a",
          credentials: {
            accessToken: "stored-access",
            refreshToken: "stored-refresh",
            expiresAt: 456,
          },
        }),
      ],
      getCachedCredentials: async () => null,
    })
    const value = await buildOAuthCredential("a", deps)
    assert.equal(value.access, "stored-access")
    assert.equal(value.refresh, "stored-refresh")
    assert.equal(value.expires, 456)
  })

  it("includes configDir in metadata only when present", async () => {
    const withConfigDir = makeDeps({
      refreshAccountsList: () => [
        account({ source: "a", configDir: "/tmp/claude" }),
      ],
    })
    const without = makeDeps({
      refreshAccountsList: () => [account({ source: "a" })],
    })
    assert.equal(
      (await buildOAuthCredential("a", withConfigDir)).metadata?.configDir,
      "/tmp/claude",
    )
    assert.equal(
      "configDir" in (await buildOAuthCredential("a", without)).metadata!,
      false,
    )
  })

  it("includes subscriptionType in metadata only when present", async () => {
    const withType = makeDeps({
      refreshAccountsList: () => [
        account({
          source: "a",
          credentials: {
            accessToken: "x",
            refreshToken: "y",
            expiresAt: 1,
            subscriptionType: "team",
          },
        }),
      ],
    })
    const without = makeDeps({
      refreshAccountsList: () => [account({ source: "a" })],
    })
    assert.equal(
      (await buildOAuthCredential("a", withType)).metadata?.subscriptionType,
      "team",
    )
    assert.equal(
      "subscriptionType" in
        (await buildOAuthCredential("a", without)).metadata!,
      false,
    )
  })

  it("marks the resolved account as active and persists the selection", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "chosen" })],
    })
    await buildOAuthCredential("chosen", deps)
    assert.deepEqual(deps.calls.setActiveAccountSource, ["chosen"])
    assert.deepEqual(deps.calls.saveAccountSource, ["chosen"])
  })
})

describe("authorizeOAuth", () => {
  it("builds a credential for the resolved source", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [account({ source: "resolved" })],
      loadPersistedAccountSource: () => "resolved",
    })
    const value = await authorizeOAuth({}, [], deps)
    assert.equal(value.metadata?.source, "resolved")
  })

  it("throws a clear error when no source can be resolved", async () => {
    const deps = makeDeps({
      refreshAccountsList: () => [],
      loadPersistedAccountSource: () => null,
    })
    await assert.rejects(
      () => authorizeOAuth({}, [], deps),
      /Run `claude` to authenticate first/,
    )
  })
})

describe("refreshOAuthCredential", () => {
  const value = {
    type: "oauth" as const,
    access: "old-access",
    refresh: "old-refresh",
    expires: Date.now() + 120_000,
    metadata: { source: "acct", configDir: "/tmp/claude" },
  }

  it("keeps a still-valid account token and its real expiry after a transient refresh failure", async () => {
    const deps = makeDeps({
      getAccountBySource: () => null,
      refreshIfNeeded: async () => null,
    })
    const result = await refreshOAuthCredential(value, deps)
    assert.equal(result.access, "old-access")
    assert.equal(result.refresh, "old-refresh")
    assert.equal(result.expires, value.expires)
    assert.equal(result.metadata?.source, "acct")
    assert.equal(result.methodID, "claude-code")
  })

  it("resyncs from the keychain instead of hitting the network when it disagrees", async () => {
    let coordinated = false
    const deps = makeDeps({
      refreshIfNeeded: async () => {
        coordinated = true
        return {
          accessToken: "fresh-access",
          refreshToken: "fresh-refresh",
          expiresAt: value.expires + 3_600_000,
        }
      },
    })
    const result = await refreshOAuthCredential(value, deps)
    assert.equal(result.access, "fresh-access")
    assert.equal(result.refresh, "fresh-refresh")
    assert.equal(result.expires, value.expires + 3_600_000)
    assert.equal(coordinated, true)
  })

  it("preserves the Claude Code OAuth marker across refresh", async () => {
    const deps = makeDeps({
      refreshIfNeeded: async () => ({
        accessToken: "refreshed-access",
        refreshToken: "refreshed-refresh",
        expiresAt: Date.now() + 3_600_000,
      }),
    })
    const result = await refreshOAuthCredential(
      {
        ...value,
        metadata: {
          ...value.metadata,
          [CLAUDE_CODE_OAUTH_METADATA_KEY]: CLAUDE_CODE_OAUTH_METADATA_VALUE,
        },
      },
      deps,
    )
    assert.equal(
      result.metadata?.[CLAUDE_CODE_OAUTH_METADATA_KEY],
      CLAUDE_CODE_OAUTH_METADATA_VALUE,
    )
  })

  it("rejects an expired account token if coordinated refresh fails", async () => {
    const deps = makeDeps({ getAccountBySource: () => null })
    await assert.rejects(
      () => refreshOAuthCredential({ ...value, expires: Date.now() - 1 }, deps),
      /Run `claude` to re-authenticate/,
    )
  })

  it("resolves only the connection's account without changing active selection", async () => {
    const chosen = account({
      source: "acct",
      credentials: {
        accessToken: "own-access",
        refreshToken: "own-refresh",
        expiresAt: Date.now() + 60_000,
      },
    })
    const deps = makeDeps({
      getAccountBySource: (source) => (source === "acct" ? chosen : null),
      refreshIfNeeded: async (target, threshold) => {
        assert.equal(target, chosen)
        assert.equal(threshold, 5 * 60_000)
        return chosen.credentials
      },
    })
    const result = await refreshOAuthCredential(value, deps)
    assert.equal(result.access, "own-access")
    assert.equal(result.metadata?.source, "acct")
    assert.deepEqual(deps.calls.setActiveAccountSource, [])
  })

  it("rejects missing source rather than refreshing a different account", async () => {
    const deps = makeDeps()
    await assert.rejects(
      () =>
        refreshOAuthCredential(
          {
            type: "oauth",
            access: "a",
            refresh: "r",
            expires: Date.now() + 1000,
          },
          deps,
        ),
      /account source/,
    )
    assert.deepEqual(deps.calls.setActiveAccountSource, [])
  })
})

describe("labelOAuthCredential", () => {
  it("returns the label when it is a string", () => {
    assert.equal(
      labelOAuthCredential({ metadata: { label: "Claude Pro" } }),
      "Claude Pro",
    )
  })

  it("returns undefined when metadata is absent", () => {
    assert.equal(labelOAuthCredential({}), undefined)
  })

  it("returns undefined when the label is not a string", () => {
    assert.equal(labelOAuthCredential({ metadata: { label: 42 } }), undefined)
  })
})
