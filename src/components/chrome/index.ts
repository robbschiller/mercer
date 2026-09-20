/**
 * Page chrome: the layer between shadcn primitives (`@/components/ui`) and
 * feature components. Index pages compose PageContainer → PageHeader →
 * FilterChipRow → Toolbar → TableFrame → Pagination; child pages swap the
 * eyebrow for a BackLink. See docs/design-system.md §3.
 */
export { PageContainer } from "./page-container";
export { PageHeader, BackLink } from "./page-header";
export { PageError, PageNotice } from "./page-feedback";
export { FilterChipRow, FilterChip } from "./filter-chips";
export { Segmented, SegmentedLink } from "./segmented";
export { Toolbar, SearchForm, ToolbarSelect, ResultSummary } from "./toolbar";
export { TableControls, ActiveFilters, type ActiveFilter } from "./table-controls";
export { FilterMenu, type MenuOption, type MenuGroup } from "./table-menu";
export { SortableHeader, type SortDirection } from "./sortable-header";
export { TableFrame, TABLE_HEAD_CELL, TABLE_HEAD_ROW } from "./table-frame";
export { Pagination } from "./pagination";
export { EmptyState } from "./empty-state";
