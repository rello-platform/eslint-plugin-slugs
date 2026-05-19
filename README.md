# @rello-platform/eslint-plugin-slugs

ESLint plugin for the Rello ecosystem. Two rules:

- **`no-legacy-literal`** — forbids hardcoded legacy slug literals (`HOMEREADY`, `MarketIntel`, `oven`, …) in real platform-slug-usage positions. Complements the compile-time type guard exported by `@rello-platform/slugs`.
- **`no-wildcard-apikey-permissions`** — forbids `permissions: ["*"]` in ApiKey row construction (Prisma create / update / upsert payloads + module-scope literal rows). Layer 1 of the 3-layer defense-in-depth from `WILDCARD-APIKEY-DEPRECATION-CROSS-PLATFORM-SWEEP` (Prisma extension + Postgres CHECK constraint cover the runtime + DB surfaces).

Mechanical drift prevention at commit time.

## Why

`@rello-platform/slugs` defines the canonical hyphenated platform slug list (`home-ready`, `home-stretch`, `harvest-home`, …) and the UPPERCASE_UNDERSCORE routing-identifier form derived from it (`HOME_READY`, `HOME_STRETCH`, …). The type system catches drift in code that flows through `PlatformSlug` / `AppSlug` types — but it cannot catch string literals that bypass the type system: untyped intermediaries, dynamic `Record<AppSlug, …>` keys, switch dispatch on raw inputs, and cross-boundary I/O.

This rule closes that gap. It flags every known legacy-form string literal **in real platform-slug-usage positions** and auto-fixes it to the canonical hyphenated form.

## v0.2.0 — AST-parent-context tightening

The v0.1.0 rule fired on every string Literal whose value matched the legacy regex. Phase 5.C of the platform's permissions/slugs canonicalization surfaced **31 false positives across 2 consumers** — all on app-internal namespace literals (Scout's `ToolSlug` tuple, Harvest-Home's `PipelineStep` state-machine, HH's UTM display labels, Drumbeat's UTM source mapping) that incidentally collide with platform-app slugs.

v0.2.0 narrows fires to one of four AST-parent-context positions:

1. **Comparison/equality operator** — `slug === "homestretch"`, `"homeready" !== app`. _Long-form aliases only._
2. **Function-call / `new`-expression argument** — `getApp("homestretch")`, `new App("homeready")`. _Long-form aliases only._
3. **Switch case value** — `case "homestretch":`. _Long-form aliases only._
4. **Typed `VariableDeclarator` ancestor** — `const x: AppSlug = "homestretch"`, `const apps: Record<AppSlug, App> = { "homestretch": … }`. _Long and short forms both fire._ The walk reaches a `VariableDeclarator` through value-position-preserving containment (`Property`, `ObjectExpression`, `ArrayExpression`, `ConditionalExpression`, `TSAsExpression`, `TSNonNullExpression`, `ParenthesizedExpression`) and fires iff the binding's `typeAnnotation` references one of: `AppSlug`, `PlatformSlug`, `EngineSlug`, `SourceAppIdentifier`, including generic-parameter positions like `Record<AppSlug, X>` and `Array<PlatformSlug>`.

**Short-form narrowing.** The drop-prefix aliases (`scout`, `drumbeat`, `oven`, `newsletter`, `pathfinder`, `the-home-scout`) collide with English words (an "oven" is an appliance), Scout's own `ToolSlug` namespace (`"newsletter"` = the Newsletter Signup tool), HH's `PipelineStep` state-machine values, and UTM display labels. Cases #1-3 cannot disambiguate `slug === "newsletter"` from `currentStep === "newsletter"` without type-info, so v0.2.0 restricts short forms to case #4 only. The downstream type-checker covers any real drift in case #1-3 short-form contexts via the slug-typed signature on the receiving function or operand.

Bare untyped `const x = "homeready"` no longer fires. The trade-off: a few v0.1.0 fires on bare untyped declarations are now silent in exchange for closing the 31-false-positive class. Real platform-slug drift in those positions is caught by the downstream type system once the value flows into a `PlatformSlug`-typed signature, by the comparison/switch/CallExpression rules above when the value reaches a slug-context boundary, and by the existing `@rello-platform/slugs` compile-time exports on every consumer-side helper.

Same shape as `@rello-platform/eslint-plugin-permissions/no-string-permission` v0.2.0 (membership-only fire — R1).

## Forbidden forms

Every variant observed as drift across the 11-app, 6-engine ecosystem:

- **UPPERCASE-concat** (pre-A-013 outliers): `HOMEREADY`, `HOMESTRETCH`, `MARKETINTEL`, `NEWSLETTERSTUDIO`, `HARVESTHOME`, `OPENHOUSEHUB`, `THEHOMESCOUT`, `HOMESCOUT`, `THEDRUMBEAT`, `THEOVEN`, `PATHFINDERPRO`, `MILOENGINE`, `CONTENTENGINE`, `PROPERTYENGINE`, `JOURNEYENGINE`, `REPORTENGINE`, `DRUMBEATVIDEOENGINE`
- **concatenated-lowercase**: `homeready`, `homestretch`, `marketintel`, `newsletterstudio`, `harvesthome`, `openhousehub`, `thehomescout`, `homescout`, `thedrumbeat`, `theoven`, `pathfinderpro`, `miloengine`, `contentengine`, `propertyengine`, `journeyengine`, `reportengine`, `drumbeatvideoengine`
- **camelCase / PascalCase** (consumer apps): `HomeReady`, `HomeStretch`, `MarketIntel`, `NewsletterStudio`, `HarvestHome`, `OpenHouseHub`, `TheHomeScout`, `TheDrumbeat`, `TheOven`, `PathfinderPro`
- **Shortened / drop-prefix**: `scout`, `drumbeat`, `oven`, `newsletter`, `pathfinder`, `the-home-scout`

Legitimate UPPERCASE_UNDERSCORE routing identifiers (`HOME_READY`, `OPEN_HOUSE_HUB`, `MILO_ENGINE`, etc.) are the platform's `SourceAppIdentifier` namespace and are **never** flagged regardless of context. Derive them via `toSourceAppIdentifier(slug)` from `@rello-platform/slugs` rather than hand-writing.

## Matching

The rule matches **whole-string Literal values only**. It fires on `getApp("homeready")` but never on `"Failed to process homeready request"` or `"https://homeready.app/login"` — those are prose and URL hosts, not slug positions.

Template literals with interpolation (`` `${base}/homeready` ``) are skipped — they are runtime-constructed and may legitimately contain a legacy-named URL path. Static template literals (`` `homeready` ``) match the same context rules as plain string Literals.

Identifiers and component names (`const HomeReady = …`, `<HomeReady />`) are never matched — the rule operates on the `Literal` / `TemplateLiteral` AST nodes, not on `Identifier` or JSX element names.

## Install

```bash
npm install --save-dev github:rello-platform/eslint-plugin-slugs#v0.2.1
```

## Use (flat config)

```js
// eslint.config.mjs
import slugsPlugin from "@rello-platform/eslint-plugin-slugs";

export default [
  // ... your existing config
  {
    plugins: { "@rello-platform/slugs": slugsPlugin },
    rules: { "@rello-platform/slugs/no-legacy-literal": "error" },
  },
];
```

Or opt into the bundled recommended config:

```js
import slugsPlugin from "@rello-platform/eslint-plugin-slugs";

export default [
  // ... your existing config
  slugsPlugin.configs.recommended,
];
```

For the canonical Rello platform configuration, prefer `@rello-platform/eslint-config` (≥ v0.5.0) which wires this plugin alongside `@rello-platform/eslint-plugin-permissions` and the standard Next baseline.

## Exempting legitimate legacy literals

With v0.2.0's context-awareness, most legacy-form-but-not-slug-usage cases (UTM display labels, app-internal namespaces typed against non-AppSlug types like `ToolSlug`, state-machine union members) no longer fire. The rare remaining case is reader-side substring matchers on event-type prefix namespaces (Format 1) that are intentionally out of the canonicalization scope. For these, add an inline disable with a rationale:

```ts
// eslint-disable-next-line @rello-platform/slugs/no-legacy-literal -- Format 1 event-type namespace, intentionally out of A-013 scope (see RecentActivityCard)
if (eventType.includes("homeready")) return "HOME_READY";
```

For directory-wide exemption (test fixtures, historical documentation), use ESLint's standard `ignores` or path-scoped overrides in your flat config:

```js
{
  files: ["**/*.test.ts", "**/*.spec.ts"],
  rules: { "@rello-platform/slugs/no-legacy-literal": "off" },
}
```

## Auto-fix

All matches are auto-fixable. `npx eslint --fix src/` rewrites legacy forms to canonical. Review the diff before committing — ambiguous cases (e.g., a non-slug literal `"oven"` in slug-context where `"the-oven"` was not actually intended) should be escape-hatched with `eslint-disable-next-line` instead of silently canonicalized.

## Test

```bash
npm test
```

The test suite covers:

- All 5 must-fire AST-parent shapes (function-arg, comparison, switch case, typed `VariableDeclarator`, `Record<AppSlug, X>` key).
- All 5 must-not-fire false-positive subclasses surfaced in PERMISSIONS-CANONICALIZATION Phase 5.C: tuple/array elements with `as const`, untyped object property values, string-union type members, untyped string-array elements, untyped object keys.
- Every canonical slug, every UPPERCASE_UNDERSCORE routing identifier, identifiers, prose, URLs, comments, and interpolated template literals — all of which must remain silent.
- Every forbidden legacy form (UPPERCASE-concat, concatenated-lowercase, camelCase, drop-prefix) auto-fixing to canonical.

Tests run under both `espree` (default JS parser) and `@typescript-eslint/parser` to cover TypeScript-specific cases (typeAnnotation, `Record<AppSlug, X>`, union-type members).

## Versioning

Tracks `@rello-platform/slugs`. Bumping the canonical list (new app, new engine) requires a corresponding bump to the `FORBIDDEN` map in `lib/rules/no-legacy-literal.js` and a sibling test case. Adding a new slug type that should anchor case #4 fires (e.g., a future `TenantSlug`) requires adding it to `SLUG_TYPE_NAMES` in the same file.

---

## `no-wildcard-apikey-permissions`

Forbids `permissions: ["*"]` on ApiKey rows. Wildcard permissions bypass per-pair least-privilege isolation enforced by `validateApiKey` + `hasPermission` (see `~API-KEY-LIFECYCLE-README.md` §9). Layer 1 of the 3-layer defense-in-depth landed in `WILDCARD-APIKEY-DEPRECATION-CROSS-PLATFORM-SWEEP` DISPATCH-8. Layers 2-3 (Rello Prisma extension + Postgres CHECK constraint) cover runtime + DB surfaces that bypass static analysis (raw SQL, ORM-less inserts, scripts that construct rows from runtime values).

### Fire conditions

The rule fires when:

1. The `permissions` Property's value is an `ArrayExpression` containing a `"*"` string literal (or static template literal `` `*` ``).
2. AND the parent ObjectExpression looks like ApiKey row construction:
   - **Shape A — sibling ApiKey field names.** The enclosing object has at least one other Property whose key is one of: `appSource`, `targetApp`, `key`, `name`, `tenantId`, `isActive`, `expiresAt`, `lastUsedAt`, `id`.
   - **Shape B — Prisma write-call payload.** The enclosing object is the value of a parent Property whose key is `data`, `create`, or `update` (covers `prisma.apiKey.create`, `prisma.apiKey.update`, `prisma.apiKey.upsert`).

### Must-not-fire

Unrelated objects carrying `permissions: ["*"]` (rate-limit allow-lists, filesystem glob patterns, policy objects) are silent. The narrow parent-context match avoids false-positive collisions.

### No autofix

There is no canonical replacement — wildcard expansion requires the caller to enumerate the actual least-privilege slugs the call site needs. Import the canonical slug constants from `@rello-platform/permissions`.

### Inline exemption (rare)

If a legitimately-non-ApiKey object happens to carry the ApiKey-resembling shape (`appSource` + `permissions: ["*"]`) and your call site actually wants `"*"` to mean "all", add an inline disable with rationale:

```ts
// eslint-disable-next-line @rello-platform/slugs/no-wildcard-apikey-permissions -- not an ApiKey row; this is the engine-broadcast all-tenants fanout target
const broadcast = { appSource: "MILO_ENGINE", permissions: ["*"] };
```

### Related

- `~API-KEY-LIFECYCLE-README.md` §9.2 names the three planned defense-in-depth layers verbatim.
- `WILDCARD-APIKEY-DEPRECATION-CROSS-PLATFORM-SWEEP/ANSWERS.md` DL-SPEC-Q5 (NONE carve-outs) and DL-SPEC-Q6 (combination mechanism) lock the binding spec.
