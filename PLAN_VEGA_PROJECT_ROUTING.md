# Plan: Project Routing Implementation for Vega Visualizations

## Overview
This plan outlines the implementation of project_routing support for Vega visualizations, following the patterns established in Discover and Dashboard implementations.

## Current State Analysis

### What Already Exists
1. **Vega SearchAPI** (`src/platform/plugins/private/vis_types/vega/public/data_model/search_api.ts`):
   - Already accepts `projectRouting` parameter in constructor
   - Already applies `project_routing` to ES requests (lines 90-94)
   - Uses `sanitizeProjectRoutingForES` utility

2. **CPS Access Control** (`src/platform/plugins/shared/cps/public/services/access_control.ts`):
   - Already configured to enable project routing for Vega visualizations
   - Route pattern: `/type:vega/` with `EDITABLE` access level

### What's Missing
1. **Saved Object Schema**: Visualization saved object doesn't include `project_routing` field
2. **State Management**: No mechanism to track and persist project routing state
3. **UI Integration**: No project picker or save modal integration
4. **Restoration Logic**: No logic to restore saved project routing when loading a visualization
5. **CPS Manager Integration**: No subscription to CPS manager for project routing changes

## Implementation Plan

### Phase 1: Server-Side Schema & Migrations

#### 1.1 Update Visualization Saved Object Schema
**File**: `src/platform/plugins/shared/visualizations/common/content_management/v1/types.ts`
- Add `project_routing?: ProjectRouting | null;` to `VisualizationSavedObjectAttributes`
- Import `ProjectRouting` type from `@kbn/es-query`

#### 1.2 Update Server Schema
**File**: `src/platform/plugins/shared/visualizations/server/content_management/v1/cm_services.ts`
- Add `project_routing: schema.maybe(schema.nullable(schema.string()))` to `visualizeAttributesSchema`

#### 1.3 Update Saved Object Type Schema
**File**: `src/platform/plugins/shared/visualizations/server/saved_objects/visualization.ts`
- Add `project_routing` to the schema object (line 47-55)

#### 1.4 Create Migration
**File**: `src/platform/plugins/shared/visualizations/server/migrations/visualization_saved_object_migrations.ts`
- Add migration to handle `project_routing` field (if needed for backward compatibility)

### Phase 2: Client-Side State Management

#### 2.1 Create Project Routing Manager
**New File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/project_routing_manager.ts`
- Similar to `dashboard_api/project_routing_manager.ts`
- Functions:
  - Initialize with saved visualization's `project_routing` or default
  - Subscribe to CPS manager changes
  - Provide state getter for save operations
  - Provide comparators for unsaved changes detection
  - Reset functionality

#### 2.2 Integrate with Visualize App State
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/use/use_visualize_app_state.tsx`
- Initialize project routing manager when visualization instance is loaded
- Subscribe to CPS manager for project routing changes
- Update visualization's search source with current project routing

#### 2.3 Update Visualization Editor
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/components/visualize_editor.tsx`
- Initialize project routing manager
- Pass project routing to visualization instance
- Clean up subscriptions on unmount

### Phase 3: UI Integration

#### 3.1 Add Project Picker to Editor
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/components/visualize_editor.tsx`
- Import `ProjectPickerButton` from `@kbn/cps-utils`
- Add project picker to the editor UI (likely in top nav or sidebar)
- Only show for Vega visualizations (check `vis.type.name === 'vega'`)

#### 3.2 Update Save Modal
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/get_top_nav_config.tsx`
- In `doSave` function, check if visualization is Vega type
- Pass `showStoreProjectRoutingOnSave` prop to save modal
- Pass `projectRoutingRestore` based on saved visualization state
- Include `project_routing` in saved attributes when saving

#### 3.3 Update Save Utilities
**File**: `src/platform/plugins/shared/visualizations/public/utils/saved_visualize_utils.ts`
- In `saveVisualization` function, include `project_routing` in attributes
- Read from project routing manager or saved object

### Phase 4: Search Source Integration

#### 4.1 Update Visualization Instance
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/get_visualization_instance.ts`
- When creating/loading visualization, extract `project_routing` from saved object
- Set project routing on search source if available
- Pass to Vega SearchAPI when rendering

#### 4.2 Update Vega Renderer
**File**: `src/platform/plugins/private/vis_types/vega/public/vega_vis_renderer.tsx` (or similar)
- Ensure project routing from visualization state is passed to SearchAPI
- Update when project routing changes

### Phase 5: Loading & Restoration

#### 5.1 Restore on Load
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/get_visualization_instance.ts`
- When loading saved visualization:
  - Extract `project_routing` from saved object attributes
  - Initialize CPS manager with saved value or default
  - Set project routing on search source

#### 5.2 Handle Project Routing Changes
**File**: `src/platform/plugins/shared/visualizations/public/visualize_app/utils/use/use_editor_updates.ts`
- Subscribe to project routing changes
- Update visualization's search source when project routing changes
- Trigger visualization reload

### Phase 6: Testing & Edge Cases

#### 6.1 Unit Tests
- Test project routing manager initialization
- Test save/load with project routing
- Test CPS manager subscription
- Test unsaved changes detection

#### 6.2 Integration Tests
- Test Vega visualization with project routing
- Test save modal with project routing toggle
- Test restoration of saved project routing
- Test switching between visualizations

#### 6.3 Edge Cases
- Handle undefined/null project routing
- Handle migration from old visualizations without project routing
- Handle CPS manager not available
- Handle non-Vega visualizations (should not show picker)

## Key Files to Modify

### Server-Side
1. `src/platform/plugins/shared/visualizations/common/content_management/v1/types.ts`
2. `src/platform/plugins/shared/visualizations/server/content_management/v1/cm_services.ts`
3. `src/platform/plugins/shared/visualizations/server/saved_objects/visualization.ts`
4. `src/platform/plugins/shared/visualizations/server/migrations/visualization_saved_object_migrations.ts`

### Client-Side
1. `src/platform/plugins/shared/visualizations/public/visualize_app/utils/project_routing_manager.ts` (NEW)
2. `src/platform/plugins/shared/visualizations/public/visualize_app/utils/use/use_visualize_app_state.tsx`
3. `src/platform/plugins/shared/visualizations/public/visualize_app/components/visualize_editor.tsx`
4. `src/platform/plugins/shared/visualizations/public/visualize_app/utils/get_top_nav_config.tsx`
5. `src/platform/plugins/shared/visualizations/public/utils/saved_visualize_utils.ts`
6. `src/platform/plugins/shared/visualizations/public/visualize_app/utils/get_visualization_instance.ts`
7. `src/platform/plugins/shared/visualizations/public/visualize_app/utils/use/use_editor_updates.ts`

### Vega-Specific
1. `src/platform/plugins/private/vis_types/vega/public/vega_vis_renderer.tsx` (or wherever SearchAPI is instantiated)

## Implementation Order

1. **Phase 1** (Server Schema): Foundation for storing project routing
2. **Phase 2** (State Management): Core logic for managing project routing state
3. **Phase 4** (Search Integration): Ensure project routing is applied to searches
4. **Phase 3** (UI): User-facing components
5. **Phase 5** (Restoration): Complete the save/load cycle
6. **Phase 6** (Testing): Ensure everything works correctly

## Dependencies

- `@kbn/cps-utils` - For project picker UI and CPS manager
- `@kbn/es-query` - For `ProjectRouting` type and `sanitizeProjectRoutingForES`
- `@kbn/presentation-publishing` - For state comparators (if following dashboard pattern)

## Notes

- Vega visualizations are accessed via the `visualize` app with route pattern `/type:vega/`
- The CPS access control is already configured for Vega
- SearchAPI already supports project routing, just needs to be wired up
- Follow the Discover pattern for session-level project routing (stored per visualization)
- Consider backward compatibility: old visualizations without project_routing should default to ALL

## Success Criteria

1. ✅ Project picker appears in Vega visualization editor
2. ✅ Project routing is applied to all ES search requests
3. ✅ Project routing can be saved with visualization
4. ✅ Saved project routing is restored when loading visualization
5. ✅ Unsaved changes detection works for project routing
6. ✅ Save modal shows toggle for storing project routing
7. ✅ Works correctly when CPS manager is not available
8. ✅ Non-Vega visualizations are unaffected

