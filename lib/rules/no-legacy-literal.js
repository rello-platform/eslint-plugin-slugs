"use strict";

/**
 * @fileoverview Flags hardcoded legacy slug literals in Rello-ecosystem source.
 *
 * Canonical slugs live in `@rello-platform/slugs`. This rule is a belt-and-
 * suspenders complement to that package's compile-time type guard: it catches
 * string literals that bypass the type system (arbitrary strings, map keys,
 * external I/O, etc.) and surface legacy forms at commit time rather than at
 * signal-ingest or a silent write-path drift.
 *
 * Reports whole-string matches only — e.g., `"homeready"` fires but the
 * sentence `"Failed to process homeready request"` does not. This keeps the
 * rule from blowing up on English prose and error messages.
 *
 * Exemption: consumers should add this rule to path-scoped overrides in their
 * ESLint config (e.g., skip `**\/*.test.ts`, skip documentation fixtures).
 * The rule itself is path-agnostic — legitimate in-source exceptions must use
 * an explicit `// eslint-disable-next-line @rello-platform/slugs/no-legacy-literal -- <rationale>`.
 */

const FORBIDDEN = Object.freeze(
  Object.assign(Object.create(null), {
    // UPPERCASE-concat (no underscore) — pre-A-013 outlier namespace.
    // Canonical UPPERCASE_UNDERSCORE (HOME_READY, MARKET_INTEL, OPEN_HOUSE_HUB,
    // etc.) is the legitimate routing-identifier form and is NOT flagged.
    HOMEREADY: "home-ready",
    HOMESTRETCH: "home-stretch",
    MARKETINTEL: "market-intel",
    NEWSLETTERSTUDIO: "newsletter-studio",
    HARVESTHOME: "harvest-home",
    OPENHOUSEHUB: "open-house-hub",
    THEHOMESCOUT: "home-scout",
    HOMESCOUT: "home-scout",
    THEDRUMBEAT: "the-drumbeat",
    THEOVEN: "the-oven",
    PATHFINDERPRO: "pathfinder-pro",
    MILOENGINE: "milo-engine",
    CONTENTENGINE: "content-engine",
    PROPERTYENGINE: "property-engine",
    JOURNEYENGINE: "journey-engine",
    REPORTENGINE: "report-engine",
    DRUMBEATVIDEOENGINE: "drumbeat-video-engine",

    // concatenated-lowercase
    homeready: "home-ready",
    homestretch: "home-stretch",
    marketintel: "market-intel",
    newsletterstudio: "newsletter-studio",
    harvesthome: "harvest-home",
    openhousehub: "open-house-hub",
    thehomescout: "home-scout",
    homescout: "home-scout",
    thedrumbeat: "the-drumbeat",
    theoven: "the-oven",
    pathfinderpro: "pathfinder-pro",
    miloengine: "milo-engine",
    contentengine: "content-engine",
    propertyengine: "property-engine",
    journeyengine: "journey-engine",
    reportengine: "report-engine",
    drumbeatvideoengine: "drumbeat-video-engine",

    // camelCase / PascalCase (consumer apps)
    HomeReady: "home-ready",
    HomeStretch: "home-stretch",
    MarketIntel: "market-intel",
    NewsletterStudio: "newsletter-studio",
    HarvestHome: "harvest-home",
    OpenHouseHub: "open-house-hub",
    TheHomeScout: "home-scout",
    TheDrumbeat: "the-drumbeat",
    TheOven: "the-oven",
    PathfinderPro: "pathfinder-pro",

    // Shortened / drop-prefix — sourced from LEGACY_ALIASES in
    // @rello-platform/slugs. Higher false-positive risk because these
    // collide with common English words; guarded by whole-string match
    // and consumers can always escape-hatch with a disable-line.
    scout: "home-scout",
    drumbeat: "the-drumbeat",
    oven: "the-oven",
    newsletter: "newsletter-studio",
    pathfinder: "pathfinder-pro",
    "the-home-scout": "home-scout",
  }),
);

function lookupCanonical(value) {
  return Object.prototype.hasOwnProperty.call(FORBIDDEN, value)
    ? FORBIDDEN[value]
    : null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded legacy slug literals; use canonical form from @rello-platform/slugs",
      recommended: true,
      url: "https://github.com/rello-platform/eslint-plugin-slugs#no-legacy-literal",
    },
    fixable: "code",
    schema: [],
    messages: {
      legacyLiteral:
        "Legacy slug literal '{{literal}}' is forbidden. Use canonical '{{canonical}}' or import APP_SLUGS / PLATFORM_SLUGS from @rello-platform/slugs.",
    },
  },

  create(context) {
    function reportLiteral(node, literal) {
      const canonical = lookupCanonical(literal);
      if (canonical === null) return;
      context.report({
        node,
        messageId: "legacyLiteral",
        data: { literal, canonical },
        fix(fixer) {
          const raw = context.sourceCode.getText(node);
          const firstChar = raw.charAt(0);
          const quote =
            firstChar === "'" || firstChar === '"' || firstChar === "`"
              ? firstChar
              : '"';
          return fixer.replaceText(node, `${quote}${canonical}${quote}`);
        },
      });
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        reportLiteral(node, node.value);
      },
      // Static template literals (no interpolation) — e.g., `homeready`.
      TemplateLiteral(node) {
        if (node.expressions.length !== 0) return;
        if (node.quasis.length !== 1) return;
        const cooked = node.quasis[0].value.cooked;
        if (typeof cooked !== "string") return;
        reportLiteral(node, cooked);
      },
    };
  },
};

module.exports.FORBIDDEN = FORBIDDEN;
