"use strict";

const { RuleTester } = require("eslint");
const tsParser = require("@typescript-eslint/parser");
const rule = require("../lib/rules/no-wildcard-apikey-permissions");

// JS tester — covers all parent-context fire shapes without TS-specific AST.
const jsTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// TS tester — covers Prisma typed call shapes
// `prisma.apiKey.create({ data: { permissions: ["*"] } })`.
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
// JS-only tests. Covers must-fire ApiKey-shape parent contexts + must-not-fire
// unrelated `permissions` ObjectExpressions.
// ---------------------------------------------------------------------------
jsTester.run("no-wildcard-apikey-permissions (js)", rule, {
  valid: [
    // === Canonical least-privilege slugs — never fire ===
    {
      code: `
        const row = {
          name: "Test Key",
          appSource: "RELLO",
          targetApp: "HARVEST_HOME",
          permissions: ["intake:write"],
        };
      `,
    },
    {
      code: `
        const row = {
          name: "Test Key",
          appSource: "RELLO",
          targetApp: "MILO_ENGINE",
          permissions: ["engine:access", "signals:write"],
        };
      `,
    },

    // === Unrelated permissions array carrying "*" — must NOT fire ===
    // No ApiKey-shaped siblings + not inside a `data` Property.
    {
      code: `
        const rateLimits = {
          path: "/api/v1/*",
          permissions: ["*"],
          rateLimit: 100,
        };
      `,
    },
    {
      code: `
        const globPattern = { permissions: ["*"] };
      `,
    },
    {
      code: `
        const filesystemRule = {
          owner: "service",
          group: "service",
          permissions: ["*"],
        };
      `,
    },

    // === permissions array but no wildcard "*" — never fires ===
    {
      code: `
        const row = {
          appSource: "RELLO",
          targetApp: "HOME_READY",
          permissions: ["lead:read", "lead:write"],
        };
      `,
    },

    // === permissions: [] (empty array) — never fires ===
    {
      code: `
        const row = {
          appSource: "RELLO",
          targetApp: "HOME_READY",
          permissions: [],
        };
      `,
    },

    // === permissions not an ArrayExpression — never fires ===
    {
      code: `
        const row = {
          appSource: "RELLO",
          permissions: somePermsVariable,
        };
      `,
    },
  ],

  invalid: [
    // === MUST-FIRE SHAPE #1 — ApiKey row literal at module scope ===
    {
      code: `
        const row = {
          name: "Test Key",
          appSource: "RELLO",
          targetApp: "HARVEST_HOME",
          permissions: ["*"],
        };
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #2 — Prisma create call: data: { permissions: ["*"] } ===
    {
      code: `
        prisma.apiKey.create({ data: { permissions: ["*"] } });
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #3 — Prisma update call ===
    {
      code: `
        prisma.apiKey.update({
          where: { id: "abc" },
          data: { permissions: ["*"] },
        });
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #4 — Prisma upsert call ===
    {
      code: `
        prisma.apiKey.upsert({
          where: { id: "abc" },
          create: { permissions: ["*"] },
          update: { permissions: ["leads:read"] },
        });
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #5 — wildcard mixed with other slugs in same array ===
    {
      code: `
        const row = {
          appSource: "RELLO",
          permissions: ["leads:read", "*", "signals:write"],
        };
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #6 — wildcard via static template literal ===
    {
      code: "const row = { appSource: \"RELLO\", permissions: [`*`] };",
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #7 — only `name` sibling (single ApiKey field counts) ===
    {
      code: `
        const row = {
          name: "Provisioned Key",
          permissions: ["*"],
        };
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // === MUST-FIRE SHAPE #8 — wildcard + SpreadElement (still has wildcard) ===
    {
      code: `
        const others = ["leads:read"];
        const row = {
          appSource: "RELLO",
          permissions: ["*", ...others],
        };
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },
  ],
});

// ---------------------------------------------------------------------------
// TS-only tests. Mirrors Prisma write call shapes that show up in real Rello
// codebase calls.
// ---------------------------------------------------------------------------
tsTester.run("no-wildcard-apikey-permissions (ts)", rule, {
  valid: [
    // Canonical least-privilege Prisma create — never fires.
    {
      code: `
        await prisma.apiKey.create({
          data: {
            name: "Engine Key",
            appSource: "RELLO",
            targetApp: "MILO_ENGINE",
            permissions: ["engine:access"],
            isActive: true,
          },
        });
      `,
    },
    // Unrelated TS object literal with permissions: ["*"] — never fires.
    {
      code: `
        const policy: { path: string; permissions: string[] } = {
          path: "/admin/*",
          permissions: ["*"],
        };
      `,
    },
  ],

  invalid: [
    // Typed Prisma create call — fires via Prisma data property context.
    {
      code: `
        await prisma.apiKey.create({
          data: {
            name: "Wildcard Key",
            appSource: "RELLO",
            permissions: ["*"],
            isActive: true,
          },
        });
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },

    // Typed Prisma update call — fires.
    {
      code: `
        await prisma.apiKey.update({
          where: { id: "x" },
          data: {
            permissions: ["*"],
          },
        });
      `,
      errors: [{ messageId: "wildcardForbidden" }],
    },
  ],
});

console.log("all no-wildcard-apikey-permissions tests passed");
