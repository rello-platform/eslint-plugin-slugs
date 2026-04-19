"use strict";

const { RuleTester } = require("eslint");
const rule = require("../lib/rules/no-legacy-literal");

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run("no-legacy-literal", rule, {
  valid: [
    // Canonical slugs — must never fire.
    { code: `const slug = "home-ready";` },
    { code: `const slug = "home-stretch";` },
    { code: `const slug = "harvest-home";` },
    { code: `const slug = "open-house-hub";` },
    { code: `const slug = "the-drumbeat";` },
    { code: `const slug = "the-oven";` },
    { code: `const slug = "home-scout";` },
    { code: `const slug = "market-intel";` },
    { code: `const slug = "newsletter-studio";` },
    { code: `const slug = "pathfinder-pro";` },
    { code: `const slug = "milo-engine";` },
    { code: `const slug = "content-engine";` },
    { code: `const slug = "property-engine";` },
    { code: `const slug = "journey-engine";` },
    { code: `const slug = "report-engine";` },
    { code: `const slug = "drumbeat-video-engine";` },
    { code: `const slug = "rello";` },

    // Legitimate UPPERCASE_UNDERSCORE routing identifiers — never flagged.
    { code: `const id = "HOME_READY";` },
    { code: `const id = "HOME_STRETCH";` },
    { code: `const id = "HARVEST_HOME";` },
    { code: `const id = "OPEN_HOUSE_HUB";` },
    { code: `const id = "THE_OVEN";` },
    { code: `const id = "THE_DRUMBEAT";` },
    { code: `const id = "HOME_SCOUT";` },
    { code: `const id = "MARKET_INTEL";` },
    { code: `const id = "NEWSLETTER_STUDIO";` },
    { code: `const id = "PATHFINDER_PRO";` },
    { code: `const id = "MILO_ENGINE";` },
    { code: `const id = "CONTENT_ENGINE";` },
    { code: `const id = "PROPERTY_ENGINE";` },
    { code: `const id = "JOURNEY_ENGINE";` },
    { code: `const id = "REPORT_ENGINE";` },
    { code: `const id = "DRUMBEAT_VIDEO_ENGINE";` },
    { code: `const id = "RELLO";` },

    // Identifiers / component names — not string literals, not flagged.
    { code: `import HomeReady from "./HomeReady";` },
    { code: `const HomeReady = 1;` },
    { code: `function HomeReady() {}` },
    { code: `const { HomeReady } = require("./x");` },

    // Non-whole-string occurrences — e.g., prose — not flagged.
    { code: `const msg = "Failed to process homeready request";` },
    { code: `const msg = "User clicked HomeReady button";` },
    { code: `const url = "https://homeready.app/login";` },

    // Template literals with interpolation — skipped (not a static slug).
    { code: "const x = `${base}/homeready`;" },
    { code: "const x = `prefix-${y}-homeready`;" },

    // Numbers and regex — not strings.
    { code: `const n = 123;` },
    { code: `const re = /homeready/;` },

    // Comments — not Literal nodes.
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
  ],

  invalid: [
    // UPPERCASE-concat
    {
      code: `const x = "HOMEREADY";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-ready";`,
    },
    {
      code: `const x = "HOMESTRETCH";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-stretch";`,
    },
    {
      code: `const x = "MARKETINTEL";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "market-intel";`,
    },
    {
      code: `const x = "HARVESTHOME";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "harvest-home";`,
    },
    {
      code: `const x = "OPENHOUSEHUB";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "open-house-hub";`,
    },
    {
      code: `const x = "THEHOMESCOUT";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "HOMESCOUT";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "THEDRUMBEAT";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-drumbeat";`,
    },
    {
      code: `const x = "THEOVEN";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-oven";`,
    },
    {
      code: `const x = "PATHFINDERPRO";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "pathfinder-pro";`,
    },
    {
      code: `const x = "NEWSLETTERSTUDIO";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "newsletter-studio";`,
    },
    {
      code: `const x = "MILOENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "milo-engine";`,
    },
    {
      code: `const x = "CONTENTENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "content-engine";`,
    },
    {
      code: `const x = "PROPERTYENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "property-engine";`,
    },
    {
      code: `const x = "JOURNEYENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "journey-engine";`,
    },
    {
      code: `const x = "REPORTENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "report-engine";`,
    },
    {
      code: `const x = "DRUMBEATVIDEOENGINE";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "drumbeat-video-engine";`,
    },

    // concatenated-lowercase
    {
      code: `const x = "homeready";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-ready";`,
    },
    {
      code: `const x = 'homestretch';`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = 'home-stretch';`,
    },
    {
      code: `const x = "harvesthome";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "harvest-home";`,
    },
    {
      code: `const x = "openhousehub";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "open-house-hub";`,
    },
    {
      code: `const x = "thehomescout";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "homescout";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "thedrumbeat";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-drumbeat";`,
    },
    {
      code: `const x = "theoven";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-oven";`,
    },
    {
      code: `const x = "pathfinderpro";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "pathfinder-pro";`,
    },
    {
      code: `const x = "newsletterstudio";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "newsletter-studio";`,
    },
    {
      code: `const x = "marketintel";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "market-intel";`,
    },
    {
      code: `const x = "miloengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "milo-engine";`,
    },
    {
      code: `const x = "contentengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "content-engine";`,
    },
    {
      code: `const x = "propertyengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "property-engine";`,
    },
    {
      code: `const x = "journeyengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "journey-engine";`,
    },
    {
      code: `const x = "reportengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "report-engine";`,
    },
    {
      code: `const x = "drumbeatvideoengine";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "drumbeat-video-engine";`,
    },

    // camelCase (apps)
    {
      code: `const x = "HomeReady";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-ready";`,
    },
    {
      code: `const x = "HomeStretch";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-stretch";`,
    },
    {
      code: `const x = "MarketIntel";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "market-intel";`,
    },
    {
      code: `const x = "NewsletterStudio";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "newsletter-studio";`,
    },
    {
      code: `const x = "HarvestHome";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "harvest-home";`,
    },
    {
      code: `const x = "OpenHouseHub";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "open-house-hub";`,
    },
    {
      code: `const x = "TheHomeScout";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "TheDrumbeat";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-drumbeat";`,
    },
    {
      code: `const x = "TheOven";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-oven";`,
    },
    {
      code: `const x = "PathfinderPro";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "pathfinder-pro";`,
    },

    // Shortened / drop-prefix
    {
      code: `const x = "scout";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },
    {
      code: `const x = "drumbeat";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-drumbeat";`,
    },
    {
      code: `const x = "oven";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "the-oven";`,
    },
    {
      code: `const x = "newsletter";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "newsletter-studio";`,
    },
    {
      code: `const x = "pathfinder";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "pathfinder-pro";`,
    },
    {
      code: `const x = "the-home-scout";`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const x = "home-scout";`,
    },

    // JSX attribute string — also a Literal, should fire.
    {
      code: `const el = <App slug="homeready" />;`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const el = <App slug="home-ready" />;`,
    },

    // Static template literal (no interpolation) — should fire.
    {
      code: "const x = `homeready`;",
      errors: [{ messageId: "legacyLiteral" }],
      output: "const x = `home-ready`;",
    },

    // Function argument
    {
      code: `send("homestretch");`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `send("home-stretch");`,
    },

    // Object property value
    {
      code: `const config = { appSlug: "marketintel" };`,
      errors: [{ messageId: "legacyLiteral" }],
      output: `const config = { appSlug: "market-intel" };`,
    },
  ],
});

console.log("all tests passed");
