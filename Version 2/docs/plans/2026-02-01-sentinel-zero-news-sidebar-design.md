## Overview

Add a collapsible left-side news sidebar that overlays the map, replaces the bottom ticker, and presents a scrolling feed that feels real-time. The feed should reveal new items at a steady cadence (around every 60 seconds) by staging items already available from the API/socket stream. Strong white panel borders should be removed across the UI to avoid harsh visual separations.

## Goals

- Show news in a left overlay sidebar that can collapse to a slim tab.
- Present news as a vertically scrollable feed that updates about once per minute.
- Remove strong white borders from panels and overlays; keep a softer separation.
- Preserve existing news fetching and socket update plumbing.

## Non-Goals

- Rework backend news ingestion or API schema.
- Add search, filtering, or bookmarking for news items.
- Build a fully animated "ticker" across the UI.

## UI/UX Design

- **Placement**: The news panel sits on the left over the map (absolute positioned), independent of the right-side `DetailPanel`.
- **Collapse**: A toggle button pins to the left edge. Collapsed state shows a slim tab with an icon and "News" label.
- **Feed Layout**: A column list of cards with title, source, optional timestamp/category, and a subtle accent marker.
- **Scrolling**: The list container is `overflow-y-auto` with a max height; new items prepend and the list scrolls naturally.
- **Borders**: Replace bright borders with softer shadows or faint separators (e.g., subtle `ring` or translucent dividers).

## Data Flow

- `App` continues to fetch and subscribe to news, storing `news` in state.
- `NewsSidebar` receives `news` as props and manages a local display pipeline:
  - `visibleItems`: currently shown items.
  - `queueItems`: items to be revealed over time.
  - Every 60s, move one item from `queueItems` into `visibleItems`.
  - If `queueItems` is empty, recycle from `news` to keep the feed moving.
- Socket updates still prepend to `news` in `App`; `NewsSidebar` re-seeds queue when the list changes.

## Error Handling

- If `news` is empty, show a compact "Loading news feed..." placeholder.
- If `news` fetch fails (existing behavior), surface a muted error text in the sidebar.
- Handle missing optional fields (timestamp/category) gracefully.

## Testing Plan

- Unit test the staging logic to ensure:
  - Initial visible count respects the configured max.
  - Timer moves one item per interval from queue to visible.
  - Re-seeding works when new `news` arrives.
- UI sanity check in the browser:
  - Sidebar collapses and expands without shifting the map.
  - No harsh borders appear across panels.
  - Feed scrolls and shows a new item every ~60s.

## Implementation Steps

1. Create `NewsSidebar` component and styles.
2. Replace `NewsTicker` usage in `App` with `NewsSidebar`.
3. Add staging logic for periodic updates in `NewsSidebar`.
4. Soften/remove border styles on panels and overlays.
5. Add/adjust tests for the staging behavior.
