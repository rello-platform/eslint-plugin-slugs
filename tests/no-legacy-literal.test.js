"use strict";

const { RuleTester } = require("eslint");
const tsParser = require("@typescript-eslint/parser");
const rule = require("../lib/rules/no-legacy-literal");

// Default JS-only tester (espree). Covers comparisons, function args,
// switch cases — none of which need TS-specific AST.
const jsTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// TS tester. Covers VariableDeclarator typeAnnotation cases (case 4 of
// AST-parent-context) — `const x: AppSlug = "..."`,
// `const apps: Record<AppSlug, App> = { "...": ... }`.
const tsTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// ---------------------------------------------------------------------------
// JS-only tests (espree). Covers must-fire cases 1-3 + must-not-fire prose,
// URLs, identifiers, and most array/object position cases.
// ---------------------------------------------------------------------------
jsTester.run("no-legacy-literal (js)", rule, {
  valid: [
    // === Canonical slugs — must never fire regardless of context ===
    { code: `getApp("home-ready");` },
    { code: `getApp("home-stretch");` },
    { code: `getApp("harvest-home");` },
    { code: `getApp("home-scout");` },
    { code: `getApp("market-intel");` },
    { code: `getApp("newsletter-studio");` },
    { code: `getApp("the-drumbeat");` },
    { code: `getApp("the-oven");` },
    { code: `getApp("open-house-hub");` },
    { code: `getApp("pathfinder-pro");` },
    { code: `getApp("milo-engine");` },
    { code: `getApp("rello");` },

    // === Legitimate UPPERCASE_UNDERSCORE routing identifiers ===
    { code: `send("HOME_READY");` },
    { code: `send("HOME_STRETCH");` },
    { code: `send("MARKET_INTEL");` },
    { code: `send("OPEN_HOUSE_HUB");` },

    // === v0.1.0 → v0.2.0 narrowing: untyped VariableDeclarator does NOT fire ===
    // The bare `const x = "homeready"` shape was the bulk of v0.1.0 invalid
    // cases. v0.2.0 narrows: literal must be in a real platform-slug-usage
    // position (function arg / comparison / switch / typed VariableDeclarator).
    // A bare untyped `const x = "homeready"` could equally be a string for any
    // purpose — the type system would have caught real platform-slug drift,
    // and we trade those v0.1.0 fires for the 31 false positives from
    // PERMISSIONS-CANONICALIZATION Session 13.
    { code: `const x = "homeready";` },
    { code: `const x = "HOMEREADY";` },
    { code: `const x = "HomeReady";` },
    { code: `const x = "homestretch";` },
    { code: `const x = "scout";` },
    { code: `const x = "newsletter";` },
    { code: `const x = "drumbeat";` },
    { code: `const x = "oven";` },

    // === Identifiers / component names — never matched (not Literal nodes) ===
    { code: `import HomeReady from "./HomeReady";` },
    { code: `const HomeReady = 1;` },
    { code: `function HomeReady() {}` },
    { code: `const { HomeReady } = require("./x");` },

    // === Non-whole-string occurrences (prose, URLs) — not matched at all ===
    { code: `const msg = "Failed to process homeready request";` },
    { code: `const msg = "User clicked HomeReady button";` },
    { code: `const url = "https://homeready.app/login";` },

    // === Template literals with interpolation — skipped (runtime-constructed) ===
    { code: "const x = `${base}/homeready`;" },
    { code: "const x = `prefix-${y}-homeready`;" },

    // === Static template literal in untyped position — v0.2.0 doesn't fire ===
    // (v0.1.0 fired on `const x = \`homeready\`;`. v0.2.0 only fires on static
    // templates in slug-context positions. See must-fire #1 below for a
    // CallExpression-arg static-template invalid case.)
    { code: "const x = `homeready`;" },

    // === Comments — not Literal nodes ===
    {
      code: `
        // This handler reads legacy "homeready" sourceApp values for backward compat.
        const canonical = normalizeSlug(raw);
      `,
    },
    {
      code: `
        /**
         * @param app "homeready" or "homestretch"
         */
        function x(app) { return app; }
      `,
    },

    // === Numbers and regex — not strings ===
    { code: `const n = 123;` },
    { code: `const re = /homeready/;` },

    // === FALSE-POSITIVE SUBCLASS #1 (Session 13 Drift Class 1) ===
    // Tuple/array element in `as const` literal — Scout's ToolSlug tuple.
    // Literal "newsletter" is an ArrayExpression element inside a
    // VariableDeclarator with no AppSlug-typed annotation (type is inferred
    // via `as const`). Must NOT fire.
    {
      code: `
        export const TOOL_SLUGS = [
          "whats-my-home-worth",
          "neighborhood-report",
          "newsletter",
          "rate-watch",
        ];
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #2 ===
    // Object property value where key isn't typed against AppSlug — HH UTM
    // display labels: `{ OVEN_SYNC: "oven" }`, Drumbeat's UTM source mapping:
    // `{ EMAIL: "newsletter" }`. Untyped object literal — must NOT fire.
    {
      code: `
        const UTM_SOURCES = {
          OVEN_SYNC: "oven",
          EMAIL: "newsletter",
        };
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #4 ===
    // Array element in a string-array literal that isn't typed against
    // AppSlug — HH SSA baby-name dataset. Must NOT fire.
    {
      code: `
        const BABY_NAMES = ["scout", "river", "sage", "harper"];
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #5 (mirror of #2 from key angle) ===
    // Object key where the object's value type isn't AppSlug-related.
    {
      code: `
        const labels = {
          "scout": "Home Scout",
          "drumbeat": "The Drumbeat",
        };
      `,
    },

    // === Equality with non-comparison binary ops — must NOT fire ===
    // (only ===, !==, ==, != are slug-context comparisons; `+` is concat).
    { code: `const x = "prefix-" + "homeready";` },
  ],

  invalid: [
    // === MUST-FIRE SHAPE #1 — function-call argument ===
    // Covers every legacy form via the simplest must-fire shape.
    // UPPERCASE-concat
    {
      code: `getApp("HOMEREADY");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-ready");`,
    },
    {
      code: `getApp("HOMESTRETCH");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-stretch");`,
    },
    {
      code: `getApp("MARKETINTEL");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("market-intel");`,
    },
    {
      code: `getApp("HARVESTHOME");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("harvest-home");`,
    },
    {
      code: `getApp("OPENHOUSEHUB");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("open-house-hub");`,
    },
    {
      code: `getApp("THEHOMESCOUT");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("HOMESCOUT");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("THEDRUMBEAT");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-drumbeat");`,
    },
    {
      code: `getApp("THEOVEN");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-oven");`,
    },
    {
      code: `getApp("PATHFINDERPRO");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("pathfinder-pro");`,
    },
    {
      code: `getApp("NEWSLETTERSTUDIO");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("newsletter-studio");`,
    },
    {
      code: `getApp("MILOENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("milo-engine");`,
    },
    {
      code: `getApp("CONTENTENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("content-engine");`,
    },
    {
      code: `getApp("PROPERTYENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("property-engine");`,
    },
    {
      code: `getApp("JOURNEYENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("journey-engine");`,
    },
    {
      code: `getApp("REPORTENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("report-engine");`,
    },
    {
      code: `getApp("DRUMBEATVIDEOENGINE");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("drumbeat-video-engine");`,
    },

    // concatenated-lowercase
    {
      code: `getApp("homeready");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-ready");`,
    },
    {
      code: `getApp('homestretch');`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp('home-stretch');`,
    },
    {
      code: `getApp("harvesthome");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("harvest-home");`,
    },
    {
      code: `getApp("openhousehub");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("open-house-hub");`,
    },
    {
      code: `getApp("thehomescout");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("homescout");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("thedrumbeat");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-drumbeat");`,
    },
    {
      code: `getApp("theoven");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-oven");`,
    },
    {
      code: `getApp("pathfinderpro");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("pathfinder-pro");`,
    },
    {
      code: `getApp("newsletterstudio");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("newsletter-studio");`,
    },
    {
      code: `getApp("marketintel");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("market-intel");`,
    },
    {
      code: `getApp("miloengine");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("milo-engine");`,
    },

    // camelCase (apps)
    {
      code: `getApp("HomeReady");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-ready");`,
    },
    {
      code: `getApp("HomeStretch");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-stretch");`,
    },
    {
      code: `getApp("MarketIntel");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("market-intel");`,
    },
    {
      code: `getApp("NewsletterStudio");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("newsletter-studio");`,
    },
    {
      code: `getApp("HarvestHome");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("harvest-home");`,
    },
    {
      code: `getApp("OpenHouseHub");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("open-house-hub");`,
    },
    {
      code: `getApp("TheHomeScout");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("TheDrumbeat");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-drumbeat");`,
    },
    {
      code: `getApp("TheOven");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-oven");`,
    },
    {
      code: `getApp("PathfinderPro");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("pathfinder-pro");`,
    },

    // Shortened / drop-prefix (in slug-context position only)
    {
      code: `getApp("scout");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },
    {
      code: `getApp("drumbeat");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-drumbeat");`,
    },
    {
      code: `getApp("oven");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("the-oven");`,
    },
    {
      code: `getApp("newsletter");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("newsletter-studio");`,
    },
    {
      code: `getApp("pathfinder");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("pathfinder-pro");`,
    },
    {
      code: `getApp("the-home-scout");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-scout");`,
    },

    // Function-arg with NewExpression
    {
      code: `new App("homestretch");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `new App("home-stretch");`,
    },

    // Static template literal as function-call argument
    {
      code: "getApp(`homeready`);",
      errors: [{ messageId: "legacyLiteral" }],
      output: "getApp(`home-ready`);",
    },

    // === MUST-FIRE SHAPE #2 — comparison/equality operator ===
    {
      code: `if (slug === "homestretch") {}`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `if (slug === "home-stretch") {}`,
    },
    {
      code: `if (slug !== "MarketIntel") {}`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `if (slug !== "market-intel") {}`,
    },
    {
      code: `if ("homeready" === app) {}`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `if ("home-ready" === app) {}`,
    },
    {
      code: `if (slug == "marketintel") {}`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `if (slug == "market-intel") {}`,
    },

    // === MUST-FIRE SHAPE #3 — switch case value ===
    {
      code: `switch (slug) { case "homestretch": break; }`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `switch (slug) { case "home-stretch": break; }`,
    },
    {
      code: `switch (slug) { case "MarketIntel": break; }`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `switch (slug) { case "market-intel": break; }`,
    },
  ],
});

// ---------------------------------------------------------------------------
// TS-only tests (@typescript-eslint/parser). Covers must-fire case #4 — typed
// VariableDeclarator ancestor — and the corresponding must-not-fire subclasses
// where the same shape carries a non-AppSlug type (Scout's ToolSlug,
// pipeline-step union, etc.).
// ---------------------------------------------------------------------------
tsTester.run("no-legacy-literal (ts)", rule, {
  valid: [
    // === FALSE-POSITIVE SUBCLASS #1 (typed via `as const`) ===
    // Scout's actual `TOOL_SLUGS = [...] as const`. Must NOT fire — type is
    // inferred via `as const`, no AppSlug annotation.
    {
      code: `
        export const TOOL_SLUGS = [
          "whats-my-home-worth",
          "neighborhood-report",
          "newsletter",
          "rate-watch",
        ] as const;
        export type ToolSlug = (typeof TOOL_SLUGS)[number];
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #1B (typed against ToolSlug, not AppSlug) ===
    // Scout's `DEFAULT_ENABLED_TOOLS: ToolSlug[]`. Must NOT fire — ToolSlug
    // is a Scout-internal type, not in SLUG_TYPE_NAMES.
    {
      code: `
        type ToolSlug = "newsletter" | "rate-watch";
        const DEFAULT_ENABLED_TOOLS: ToolSlug[] = [
          "newsletter",
          "rate-watch",
        ];
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #2 (typed Record over non-AppSlug key) ===
    // Scout's `TOOL_LABELS: Record<ToolSlug, string>` with key "newsletter".
    // Must NOT fire — Record's key type is ToolSlug, not AppSlug.
    {
      code: `
        type ToolSlug = "newsletter" | "rate-watch";
        const TOOL_LABELS: Record<ToolSlug, string> = {
          newsletter: "Newsletter Signup",
          "rate-watch": "Rate Watch Alert",
        };
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #3 (string union type member) ===
    // HH's PipelineStep state-machine values. The literal "oven_sync" lives
    // inside a TS type position (TSLiteralType inside TSUnionType), not a
    // value position. Must NOT fire.
    {
      code: `
        type PipelineStep = "scoring" | "plan" | "newsletter" | "oven_sync" | "general";
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #4 (untyped string-array) ===
    // HH's SSA baby-name dataset entry. Must NOT fire.
    {
      code: `
        const BABY_NAMES = ["scout", "river", "sage", "harper"];
      `,
    },

    // === FALSE-POSITIVE SUBCLASS #5 (UTM display label / display map) ===
    // Untyped object literal used for display labels. Must NOT fire.
    {
      code: `
        const UTM_SOURCE_LABELS = {
          OVEN_SYNC: "oven",
          EMAIL: "newsletter",
          DRUMBEAT_AD: "drumbeat",
        };
      `,
    },

    // === Untyped VariableDeclarator — never fires ===
    { code: `const x = "homeready";` },
    { code: `const x = "HomeStretch";` },
    { code: `const x = "newsletter";` },

    // === Canonical slugs in any TS position — never fires ===
    {
      code: `
        type AppSlug = "home-ready" | "home-stretch" | "newsletter-studio";
        const x: AppSlug = "home-ready";
      `,
    },
    {
      code: `
        type AppSlug = "home-ready" | "home-stretch";
        const apps: Record<AppSlug, number> = {
          "home-ready": 1,
          "home-stretch": 2,
        };
      `,
    },
  ],

  invalid: [
    // === MUST-FIRE SHAPE #4 — VariableDeclarator with AppSlug type annotation ===
    {
      code: `
        type AppSlug = string;
        const x: AppSlug = "homestretch";
      `,
      errors: [{ messageId: "legacyLiteral" }],
      output: `
        type AppSlug = string;
        const x: AppSlug = "home-stretch";
      `,
    },
    {
      code: `
        type PlatformSlug = string;
        const x: PlatformSlug = "homeready";
      `,
      errors: [{ messageId: "legacyLiteral" }],
      output: `
        type PlatformSlug = string;
        const x: PlatformSlug = "home-ready";
      `,
    },
    {
      code: `
        type AppSlug = string;
        const apps: AppSlug[] = ["homestretch", "homeready"];
      `,
      errors: [
        { messageId: "legacyLiteral" },
        { messageId: "legacyLiteral" },
      ],
      output: `
        type AppSlug = string;
        const apps: AppSlug[] = ["home-stretch", "home-ready"];
      `,
    },

    // === MUST-FIRE SHAPE #5 — Record<AppSlug, X> object key ===
    {
      code: `
        type AppSlug = string;
        const apps: Record<AppSlug, number> = {
          "homestretch": 1,
          "homeready": 2,
        };
      `,
      errors: [
        { messageId: "legacyLiteral" },
        { messageId: "legacyLiteral" },
      ],
      output: `
        type AppSlug = string;
        const apps: Record<AppSlug, number> = {
          "home-stretch": 1,
          "home-ready": 2,
        };
      `,
    },

    // EngineSlug — also in SLUG_TYPE_NAMES
    {
      code: `
        type EngineSlug = string;
        const e: EngineSlug = "miloengine";
      `,
      errors: [{ messageId: "legacyLiteral" }],
      output: `
        type EngineSlug = string;
        const e: EngineSlug = "milo-engine";
      `,
    },

    // SourceAppIdentifier — also in SLUG_TYPE_NAMES (legacy
    // UPPERCASE-concat form, NOT the canonical UPPERCASE_UNDERSCORE form).
    {
      code: `
        type SourceAppIdentifier = string;
        const s: SourceAppIdentifier = "HOMEREADY";
      `,
      errors: [{ messageId: "legacyLiteral" }],
      output: `
        type SourceAppIdentifier = string;
        const s: SourceAppIdentifier = "home-ready";
      `,
    },

    // Function-call arg also fires under TS parser
    {
      code: `getApp("homestretch");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `getApp("home-stretch");`,
    },

    // Comparison also fires under TS parser
    {
      code: `if (slug === "homestretch") {}`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `if (slug === "home-stretch") {}`,
    },
  ],
});

console.log("all tests passed");
