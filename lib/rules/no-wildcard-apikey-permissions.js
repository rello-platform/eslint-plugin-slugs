"use strict";

/**
 * @fileoverview Forbid `permissions: ["*"]` (or any array containing the "*"
 * wildcard literal) in real ApiKey-row-construction positions. Wildcard
 * permissions bypass per-pair least-privilege isolation enforced by
 * `validateApiKey` + `hasPermission` (see ~API-KEY-LIFECYCLE-README.md §9).
 *
 * Layer 1 of the 3-layer defense-in-depth landed in
 * WILDCARD-APIKEY-DEPRECATION-CROSS-PLATFORM-SWEEP DISPATCH-8. Layers 2-3
 * (Rello Prisma extension + Postgres CHECK constraint) cover runtime + DB
 * surfaces that bypass static analysis (raw SQL, ORM-less inserts, scripts
 * that construct rows from runtime values).
 *
 * Like `no-legacy-literal`, this rule narrows on AST parent context to avoid
 * false-positive collisions with unrelated `permissions` keys that happen to
 * carry a `"*"` literal. The fire conditions are:
 *
 *   1. The literal `"*"` appears inside an ArrayExpression that is the value
 *      of a `permissions` Property.
 *   2. That `permissions` Property lives inside an enclosing ObjectExpression
 *      whose shape resembles ApiKey row construction OR Prisma write args:
 *      sibling `appSource` / `targetApp` / `key` / `name` / `tenantId` Properties
 *      (any ApiKey field), OR the enclosing object is the value of a parent
 *      Property whose key is `data`, `create`, or `update` (Prisma create /
 *      update / upsert payload shape).
 *
 * If neither shape matches, the rule does not fire — keeps the rule quiet for
 * `permissions: ["*"]` in unrelated contexts (rate-limit allow-lists,
 * filesystem glob patterns, etc.).
 *
 * No autofix: there is no canonical replacement — the fix is to enumerate the
 * least-privilege slugs the call site actually needs from
 * `@rello-platform/permissions`.
 */

const APIKEY_FIELD_NAMES = Object.freeze(
  Object.assign(Object.create(null), {
    appSource: true,
    targetApp: true,
    key: true,
    name: true,
    tenantId: true,
    isActive: true,
    permissions: true,
    expiresAt: true,
    lastUsedAt: true,
    id: true,
  }),
);

function propertyKeyName(prop) {
  if (!prop || prop.type !== "Property") return null;
  const key = prop.key;
  if (!key) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

// An ObjectExpression "looks like" ApiKey row construction if any sibling
// Property keys (other than `permissions` itself) are ApiKey field names.
function objectLooksLikeApiKeyRow(objNode) {
  if (!objNode || objNode.type !== "ObjectExpression") return false;
  let apiKeySiblingCount = 0;
  for (const prop of objNode.properties) {
    if (prop.type !== "Property") continue;
    const name = propertyKeyName(prop);
    if (name === "permissions") continue;
    if (name && Object.prototype.hasOwnProperty.call(APIKEY_FIELD_NAMES, name)) {
      apiKeySiblingCount += 1;
    }
  }
  return apiKeySiblingCount >= 1;
}

// Prisma write-call top-level property keys whose value ObjectExpression
// represents a row payload: `data` (create / update / createMany), plus
// `create` and `update` (upsert). Adding `permissions: ["*"]` under any of
// these is structurally a wildcard ApiKey row.
const PRISMA_WRITE_PARENT_KEYS = Object.freeze(
  Object.assign(Object.create(null), {
    data: true,
    create: true,
    update: true,
  }),
);

// The immediate parent of an ObjectExpression that is a Property value is
// the Property itself; walk one level. This catches Prisma write shapes:
// `prisma.apiKey.create({ data: { permissions: ... } })` and
// `prisma.apiKey.upsert({ where, create: { permissions: ... }, update: { permissions: ... } })`.
function objectIsInsidePrismaWriteProperty(objNode) {
  const cursor = objNode.parent;
  if (!cursor || cursor.type !== "Property") return false;
  const name = propertyKeyName(cursor);
  return (
    name !== null &&
    Object.prototype.hasOwnProperty.call(PRISMA_WRITE_PARENT_KEYS, name)
  );
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `permissions: ['*']` (or any array including the '*' wildcard) in ApiKey row construction. Wildcard permissions bypass per-pair least-privilege isolation; use canonical permission slugs from @rello-platform/permissions.",
      recommended: true,
      url: "https://github.com/rello-platform/eslint-plugin-slugs#no-wildcard-apikey-permissions",
    },
    fixable: null,
    schema: [],
    messages: {
      wildcardForbidden:
        "`permissions: ['*']` is forbidden on ApiKey rows. Use canonical least-privilege slugs from @rello-platform/permissions. See ~API-KEY-LIFECYCLE-README.md §13 forbidden patterns + DL-SPEC-Q5/Q6.",
    },
  },

  create(context) {
    return {
      Property(node) {
        // Only fire on `permissions: [...]` where the value is an ArrayExpression.
        const keyName = propertyKeyName(node);
        if (keyName !== "permissions") return;
        const value = node.value;
        if (!value || value.type !== "ArrayExpression") return;

        // Array must contain a "*" string literal somewhere.
        const hasWildcard = value.elements.some(
          (el) =>
            el != null &&
            ((el.type === "Literal" && el.value === "*") ||
              (el.type === "TemplateLiteral" &&
                el.expressions.length === 0 &&
                el.quasis.length === 1 &&
                el.quasis[0].value.cooked === "*")),
        );
        if (!hasWildcard) return;

        // Parent context — must be ApiKey-shaped to fire.
        const enclosingObj = node.parent;
        if (!enclosingObj || enclosingObj.type !== "ObjectExpression") return;
        const isApiKeyShape =
          objectLooksLikeApiKeyRow(enclosingObj) ||
          objectIsInsidePrismaWriteProperty(enclosingObj);
        if (!isApiKeyShape) return;

        context.report({
          node,
          messageId: "wildcardForbidden",
        });
      },
    };
  },
};

module.exports.APIKEY_FIELD_NAMES = APIKEY_FIELD_NAMES;
