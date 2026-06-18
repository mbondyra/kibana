# Adding an embeddable to the dashboard as-code API

This guide complements the [embeddable README](./README.md) (which documents the registration
mechanics) with the **design decisions and gotchas** to work through when exposing an embeddable
type in the dashboard REST / "as code" API. It is distilled from the Links, Image, Lens, and Vega
integrations.

> TL;DR: the API support hinges on a single server registration —
> `embeddable.registerEmbeddableServerDefinition(type, { title, getSchema, getTransforms, throwOnUnmappedPanel })`
> — plus a matching public factory. The hard part is **agreeing on the API shape** and handling
> **back-compat** for already-stored panels.

## 1. The registration contract

Everything flows through `registerEmbeddableServerDefinition` (`server/embeddable_transforms/types.ts`):

- `title` — shown in the OpenAPI docs.
- `getSchema(getDrilldownsSchema)` — `config-schema` for the panel `config`. **This is the gate.**
  Panels whose type has no schema are dropped by `stripUnmappedKeys`
  (`dashboard/server/api/scope_tooling.ts`) with a "Panel schema not available…" warning. Required
  for API support.
- `getTransforms(drilldownTransforms)` → `{ transformIn, transformOut }` — converts between stored
  and API/runtime shape. Optional (see §4).
- `throwOnUnmappedPanel(config)` — optional; lets you **drop** a panel that has a schema but isn't
  actually supported. Use sparingly — it removes panels, it does not rescue them.

The public counterpart is `registerEmbeddablePublicDefinition(type, factory)` for runtime rendering.
The public registry requires the type to be lowercase letters + underscores only
(`TYPE_REGEX = /^[a-z_]+$/`).

## 2. Agreeing on the API shape (the cross-team conversation)

This is the part that needs alignment with the owning team (and often the Presentation team):

- **Designed shape vs. raw passthrough.** Decide whether the API mirrors a clean "as-code" shape or
  exposes internal serialized state. Prefer hiding internal wrappers (e.g. Vega hides `savedVis`).
- **Field types should be ergonomic, not storage-driven.** e.g. Vega's `spec` is exposed as a JSON
  object, not an escaped string. Ask this for every field.
- **snake_case convention.** API keys are snake_case (`hide_title`, `time_range`, `ref_id`). Reuse
  `transformTitlesOut` / `transformTimeRangeOut` / `convertCamelCasedKeysToSnakeCase` from
  `@kbn/presentation-publishing`.
- **Reuse shared sub-schemas** for consistency across panel types: `serializedTitlesSchema`,
  `serializedTimeRangeSchema` (`@kbn/presentation-publishing-schemas`), and the drilldowns schema via
  `getDrilldownsSchema(supportedTriggers)`.
- **Schema strictness tradeoffs.** Strict objects validate well and keep `oneOf` discrimination
  clean; open blobs (`recordOf` / `unknowns: 'allow'`) are flexible but can weaken `oneOf`
  discrimination and interact awkwardly with `stripUnknownKeys` (an open object can become
  effectively optional and swallow a by-reference input).
- **Datasource + render-config vs. monolithic config.** Does the embeddable's data belong *inside*
  its config (e.g. a Vega spec with embedded queries) or should it follow the Lens
  `data_source: { type: 'esql', query } + render config` pattern? This affects schema shape, ES|QL
  editor reuse, and capabilities (e.g. Vega's multi-query support does not fit a single-query model).

## 3. By-value vs by-reference

- Decide whether you support both. Express as `schema.oneOf([byValueSchema, byRefSchema])` tagged with
  `BY_VALUE_SCHEMA_META` / `BY_REF_SCHEMA_META`.
- By-reference is a `ref_id` to a saved object; it needs reference handling (§5) and the public
  factory must load it.
- Keep discrimination unambiguous — under `stripUnknownKeys`, an effectively-optional field can cause
  a by-reference input to be misclassified as by-value.

## 4. Transforms: stored ⇄ API/runtime

- `transformOut(storedState, panelReferences, containerReferences)` — read path: inject references,
  run title/time-range/drilldown out-transforms, snake_case.
- `transformIn(state)` → `{ state, references }` — write path: extract references, convert to stored
  shape.
- **If you omit transforms**, `transformPanelsOut` applies a `defaultTransform` (titles + time range)
  and validates with `stripUnknownKeys`. That is enough for a "native" embeddable whose stored shape
  already equals the API shape (e.g. Image).
- **Runtime/API unification:** prefer making the public `serializeState` emit the same shape the
  schema validates, so transforms only run at the saved-object boundary. Otherwise you maintain two
  shapes.
- If you register `transformOut`, also register it with `embeddablePublicSetup.registerLegacyURLTransform`
  (unsaved-changes-via-URL sharing).

## 5. References

- Saved-object references must be **extracted on write** and **injected on read**, never embedded as
  raw IDs in `config`. See `prefixReferencesFromPanel`, `getPanelReferences`, and the visualize
  `inject_vis_references` pattern.
- Drilldowns carry references too — that is why `getTransforms` receives `drilldownTransforms`.

## 6. Drilldowns & triggers

- Declare supported triggers (e.g. Vega: `[ON_APPLY_FILTER]`) and thread them consistently through the
  schema (`getDrilldownsSchema(triggers)`) and the runtime API (`supportedTriggers`, `HasDrilldowns`).

## 7. The type identifier & BWC type mapping

- New types usually map to themselves, but existing/legacy ones may be remapped in
  `@kbn/embeddable-plugin/common/bwc/transform_type.ts` (e.g. `visualization` → `legacy_vis`). Check
  this before assuming a type string — a legacy embeddable may surface under a different API type.

## 8. Validation & failure modes

- **Where validation happens:** as-code / REST requests validate `config` at the schema level; the
  dashboard *application* path (`isDashboardAppRequest`) uses looser validation. Know which path you
  are affecting.
- **Drop vs. fail:** schema-validation errors in `transformPanelsOut` drop the single panel with a
  `dropped_panel` warning; `stripUnmappedKeys` drops unmapped types. The `sanitize` endpoint surfaces
  these as "Unsupported properties were removed".
- **Escape hatches:** the `isDashboardAppRequest` branch (see the Lens/Vega examples in
  `dashboard/server/api/transforms/`) lets you behave differently for the app vs. the API without
  changing app rendering. Use it to contain blast radius and keep the branch minimal + `TODO`-ed.

## 9. Back-compat & migration

- Decide how already-stored panels reach the new shape: read-time remap, lazy migration on write, or a
  saved-object model-version migration. Each has a different blast radius and data-mutation profile.
- Test the **round-trip**, including the `sanitize` flow (in → out → strip → validate), not just one
  direction.

## 10. Public (runtime) side, kept in sync

- Public factory via `registerEmbeddablePublicDefinition` with `buildEmbeddable` (title / time-range /
  drilldowns managers, `serializeState`, comparators).
- `serializeState` must emit the same shape the schema validates. Pick comparators correctly
  (e.g. `deepEquality` for an object field, not `referenceEquality`).
- Ensure rendering dependencies are available even when the embeddable does not go through a legacy
  path (e.g. Vega lazily registers its expression function/renderer).

## 11. Ownership & module boundaries

- The schema and transforms live in the **owning plugin**, not in dashboard. The dashboard only knows
  panel-type strings; any type-specific branch there should be a minimal, commented escape hatch.
- Respect platform `shared` vs `private` visibility when importing constants across plugins.

---

## PR-review checklist

- [ ] `registerEmbeddableServerDefinition` called with `title` + `getSchema` (the panel is not dropped
      by `stripUnmappedKeys`).
- [ ] API shape agreed with the owning/Presentation team; internal wrappers hidden; field types are
      ergonomic.
- [ ] Keys are snake_case; shared `serializedTitlesSchema` / `serializedTimeRangeSchema` /
      drilldowns schema reused.
- [ ] by-value vs by-reference decided; `oneOf` discrimination is unambiguous under `stripUnknownKeys`.
- [ ] `transformIn` / `transformOut` provided where stored ≠ API shape; references extracted on write
      and injected on read.
- [ ] `registerLegacyURLTransform` registered if `transformOut` is registered.
- [ ] Supported triggers consistent between schema and runtime API.
- [ ] BWC type mapping (`transform_type.ts`) checked for legacy/remapped types.
- [ ] Back-compat strategy chosen for already-stored panels; round-trip incl. `sanitize` tested.
- [ ] Public factory registered; `serializeState` matches the schema; comparators correct.
- [ ] Tests: schema (valid/invalid + `stripUnknownKeys` round-trip), transforms (both directions incl.
      legacy input), and a dashboard-level "panel is not dropped" test.
- [ ] `meta.description` on fields and `title` on the definition for OpenAPI docs.
- [ ] Schema/transforms live in the owning plugin; any dashboard-side branch is a minimal, commented
      escape hatch.
