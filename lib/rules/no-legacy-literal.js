"use strict";

/**
 * @fileoverview Flags hardcoded legacy slug literals in real platform-slug-usage
 * positions only.
 *
 * v0.2.0 — AST-parent-context tightening. The v0.1.0 implementation fired on
 * any string Literal whose value matched the legacy regex, which surfaced 31
 * false positives across 2 consumers (Scout + HH) — all on app-internal
 * namespace literals (Scout's `ToolSlug` tuple, HH's `PipelineStep`
 * state-machine, HH's UTM display labels, Drumbeat's UTM source mapping)
 * that incidentally collide with platform-app slugs. v0.2.0 fires only when
 * the literal's parent is one of:
 *
 *   1. `BinaryExpression` with a comparison operator (`===`, `!==`, `==`, `!=`).
 *   2. `CallExpression` / `NewExpression` argument.
 *   3. `SwitchCase` test value.
 *   4. A `VariableDeclarator` ancestor (reached via simple value-position
 *      containment: Property, ObjectExpression, ArrayExpression,
 *      ConditionalExpression, TSAsExpression, TSNonNullExpression,
 *      ParenthesizedExpression) whose `id.typeAnnotation` references one of
 *      the slug types from `@rello-platform/slugs`: `AppSlug`, `PlatformSlug`,
 *      `EngineSlug`, or `SourceAppIdentifier` — including generic parameter
 *      positions like `Record<AppSlug, X>`.
 *
 * Same shape as `eslint-plugin-permissions/no-string-permission` v0.2.0
 * (membership-only fire — R1 from PERMISSIONS-CANONICALIZATION Session 12).
 *
 * Canonical slugs live in `@rello-platform/slugs`. This rule is a
 * belt-and-suspenders complement to that package's compile-time type guard:
 * it catches string literals at slug-context boundaries that bypass the type
 * system (untyped intermediaries, dynamic-key lookups, switch dispatch on
 * raw inputs) and surface legacy forms at commit time rather than at
 * signal-ingest or a silent write-path drift.
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
    // collide with common English words and consumer-internal namespaces;
    // v0.2.0's context-awareness narrows fires to real slug-context use,
    // which is the load-bearing reason these short forms can stay in the
    // forbidden table without churning consumer apps.
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

const SLUG_TYPE_NAMES = Object.freeze(
  Object.assign(Object.create(null), {
    AppSlug: true,
    PlatformSlug: true,
    EngineSlug: true,
    SourceAppIdentifier: true,
  }),
);

// Walk a TS type-annotation node and check if it references any slug type —
// directly (`x: AppSlug`) or as a generic parameter (`Record<AppSlug, X>`,
// `Array<AppSlug>`, `AppSlug | null`).
function annotationReferencesSlugType(node) {
  if (!node || typeof node !== "object") return false;

  if (node.type === "TSTypeReference") {
    const id = node.typeName;
    if (
      id &&
      id.type === "Identifier" &&
      Object.prototype.hasOwnProperty.call(SLUG_TYPE_NAMES, id.name)
    ) {
      return true;
    }
    const params = node.typeArguments?.params || node.typeParameters?.params;
    if (Array.isArray(params)) {
      for (const p of params) {
        if (annotationReferencesSlugType(p)) return true;
      }
    }
  }

  if (Array.isArray(node.types)) {
    for (const t of node.types) {
      if (annotationReferencesSlugType(t)) return true;
    }
  }

  if (node.elementType && annotationReferencesSlugType(node.elementType)) {
    return true;
  }
  if (node.typeAnnotation && annotationReferencesSlugType(node.typeAnnotation)) {
    return true;
  }

  return false;
}

// AST node types that preserve "value position" — walking through them keeps
// us in the same expression position relative to a typed enclosing
// VariableDeclarator. ObjectExpression / ArrayExpression / Property cover the
// nested-literal cases (e.g., `{ "key": "value" }`, `["a", "b"]`).
const CONTAINMENT_TYPES = Object.freeze(
  Object.assign(Object.create(null), {
    Property: true,
    ObjectExpression: true,
    ArrayExpression: true,
    ConditionalExpression: true,
    TSAsExpression: true,
    TSTypeAssertion: true,
    TSNonNullExpression: true,
    ParenthesizedExpression: true,
    ChainExpression: true,
    SpreadElement: true,
  }),
);

function isContainmentType(t) {
  return Object.prototype.hasOwnProperty.call(CONTAINMENT_TYPES, t);
}

// Direct AST-parent-context check + bounded walk for typed VariableDeclarator
// ancestor.  Returns true if `node` is in real platform-slug-usage position.
function isSlugContext(node) {
  const parent = node.parent;
  if (!parent) return false;

  // Case 1 — comparison operator: `slug === "homestretch"` /
  // `"homestretch" !== slug`.
  if (
    parent.type === "BinaryExpression" &&
    (parent.operator === "===" ||
      parent.operator === "!==" ||
      parent.operator === "==" ||
      parent.operator === "!=")
  ) {
    return true;
  }

  // Case 2 — function-call argument: `getApp("homestretch")` /
  // `new App("homestretch")`.
  if (
    (parent.type === "CallExpression" || parent.type === "NewExpression") &&
    Array.isArray(parent.arguments) &&
    parent.arguments.includes(node)
  ) {
    return true;
  }

  // Case 3 — switch case value: `case "homestretch":`.
  if (parent.type === "SwitchCase" && parent.test === node) return true;

  // Case 4 — typed VariableDeclarator ancestor reached via
  // value-position-preserving containment.  Stops at the first
  // VariableDeclarator (slug-type → fire; non-slug → silent) or any
  // non-containment node (silent — outside a typed init position).
  let cursor = parent;
  while (cursor) {
    if (cursor.type === "VariableDeclarator") {
      return annotationReferencesSlugType(cursor.id?.typeAnnotation);
    }
    if (!isContainmentType(cursor.type)) return false;
    cursor = cursor.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded legacy slug literals in real platform-slug-usage positions; use canonical form from @rello-platform/slugs",
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
      if (!isSlugContext(node)) return;
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
module.exports.SLUG_TYPE_NAMES = SLUG_TYPE_NAMES;
