# @rello-platform/eslint-plugin-slugs

ESLint plugin that forbids hardcoded legacy slug literals in Rello-ecosystem source. Mechanical drift prevention at commit time, complementing the compile-time type guard exported by `@rello-platform/slugs`.

## Why

`@rello-platform/slugs` defines the canonical hyphenated platform slug list (`home-ready`, `home-stretch`, `harvest-home`, …) and the UPPERCASE_UNDERSCORE routing-identifier form derived from it (`HOME_READY`, `HOME_STRETCH`, …). The type system catches drift in code that flows through `PlatformSlug` / `AppSlug` types — but it cannot catch string literals that bypass the type system: untyped map keys, JSON config, cross-boundary I/O, `.includes()` substring checks, etc.

This rule closes that gap. It flags every known legacy-form string literal and auto-fixes it to the canonical hyphenated form.

## Forbidden forms

Every variant observed as drift across the 11-app, 6-engine ecosystem:

- **UPPERCASE-concat** (pre-A-013 outliers): `HOMEREADY`, `HOMESTRETCH`, `MARKETINTEL`, `NEWSLETTERSTUDIO`, `HARVESTHOME`, `OPENHOUSEHUB`, `THEHOMESCOUT`, `HOMESCOUT`, `THEDRUMBEAT`, `THEOVEN`, `PATHFINDERPRO`, `MILOENGINE`, `CONTENTENGINE`, `PROPERTYENGINE`, `JOURNEYENGINE`, `REPORTENGINE`, `DRUMBEATVIDEOENGINE`
- **concatenated-lowercase**: `homeready`, `homestretch`, `marketintel`, `newsletterstudio`, `harvesthome`, `openhousehub`, `thehomescout`, `homescout`, `thedrumbeat`, `theoven`, `pathfinderpro`, `miloengine`, `contentengine`, `propertyengine`, `journeyengine`, `reportengine`, `drumbeatvideoengine`
- **camelCase / PascalCase** (consumer apps): `HomeReady`, `HomeStretch`, `MarketIntel`, `NewsletterStudio`, `HarvestHome`, `OpenHouseHub`, `TheHomeScout`, `TheDrumbeat`, `TheOven`, `PathfinderPro`
- **Shortened / drop-prefix**: `scout`, `drumbeat`, `oven`, `newsletter`, `pathfinder`, `the-home-scout`

Legitimate UPPERCASE_UNDERSCORE routing identifiers (`HOME_READY`, `OPEN_HOUSE_HUB`, `MILO_ENGINE`, etc.) are the platform's `SourceAppIdentifier` namespace and are **never** flagged. Derive them via `toSourceAppIdentifier(slug)` from `@rello-platform/slugs` rather than hand-writing.

## Matching

The rule matches **whole-string Literal values only**. It fires on `"homeready"` but not on `"Failed to process homeready request"` or `"https://homeready.app/login"`. This keeps error-message prose, URL hosts, and human-readable copy out of scope.

Template literals with interpolation (`` `${base}/homeready` ``) are skipped — they are runtime-constructed and may legitimately contain a legacy-named URL path. Static template literals (`` `homeready` ``) are matched.

Identifiers and component names (`const HomeReady = …`, `<HomeReady />`) are never matched — the rule operates on the `Literal` / `TemplateLiteral` AST nodes, not on `Identifier` or JSX element names.

## Install

```bash
npm install --save-dev github:rello-platform/eslint-plugin-slugs#v0.1.0
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

## Exempting legitimate legacy literals

Some production code must keep legacy forms for backward compatibility — e.g., reader-side substring matchers on event-type prefix namespaces (Format 1) that are intentionally out of the canonicalization scope. For these, add an inline disable with a rationale:

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

All matches are auto-fixable. `npx eslint --fix src/` rewrites legacy forms to canonical. Review the diff before committing — ambiguous cases (e.g., a non-slug literal `"oven"` meaning kitchen appliance) should be escape-hatched with `eslint-disable-next-line` instead of silently canonicalized.

## Test

```bash
node tests/no-legacy-literal.test.js
```

Valid cases cover every canonical slug, every UPPERCASE_UNDERSCORE routing identifier, identifiers, prose, URLs, comments, and interpolated template literals. Invalid cases cover every forbidden form with expected auto-fix output.

## Versioning

Tracks `@rello-platform/slugs`. Bumping the canonical list (new app, new engine) requires a corresponding bump to the FORBIDDEN map in `lib/rules/no-legacy-literal.js`.
