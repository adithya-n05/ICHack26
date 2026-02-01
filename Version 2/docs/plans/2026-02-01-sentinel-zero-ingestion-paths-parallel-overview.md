# Sentinel-Zero Parallel Workstreams Overview

This splits the ingestion/paths plan into parallelizable workstreams.

## Parallelizable Streams

### Stream A — Schema + Shared Types
- Add Supabase schema columns + `supply_paths` table
- Add shared taxonomy + path types

### Stream B — Ingestion Core
- Overpass query builder
- Ports index parser
- Node normalization + dedupe
- Path scoring + LLM proposer

### Stream C — API + Frontend Rendering
- `/api/paths` endpoint
- `usePaths` hook
- Map arc rendering + status coloring
- Amber+ alternative hint UX

## Dependency Notes
- Stream B depends on Stream A **only for types**, not for code.
- Stream C depends on Stream A schema + Stream B ingestion output/contract.
- Ingestion script (final assembly) should be done **after A + B**.

## Individual Workstream Files
- `2026-02-01-sentinel-zero-stream-a-schema-types.md`
- `2026-02-01-sentinel-zero-stream-b-ingestion-core.md`
- `2026-02-01-sentinel-zero-stream-c-api-frontend.md`
