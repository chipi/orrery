# RFC Index

| Doc | Title | Status | Closes into | Slice gate |
|---|---|---|---|---|
| RFC-001 | Router design | Closed · superseded by ADR-013 | ADR-013 | Pre-empted by ADR-013 (SvelteKit router) |
| RFC-002 | Mission JSON schema | Closed · superseded by ADR-020 | ADR-020 | Closed early at Slice 2 |
| RFC-003 | Lambert worker protocol | Decided · closed by ADR-022 | ADR-022 | Closed at Slice 3 (3a-8) |
| RFC-004 | Mission URL sharing | Decided · closed by ADR-024 | ADR-024 | Closed at Slice 4 (4a-6) |
| RFC-005 | Accessibility approach | Decided · closed by ADR-025 | ADR-025 | Closed at Slice 6 (6a-4) |
| RFC-006 | Porkchop plot mobile interaction | Decided · closed by ADR-023 | ADR-023 | Closed at Slice 3 (3a-8) |
| RFC-007 | Multi-destination porkchop | Decided · closed by ADR-026 | ADR-026 | v0.1.6 |
| RFC-008 | Outer planets + dwarf planets in /plan | Decided · closed by ADR-028 | ADR-028 | v0.3.0 |
| RFC-009 | Mission flight params + timeline navigator | Closed · closed by ADR-027 | ADR-027 | v0.1.9 |
| RFC-010 | Translation & internationalisation strategy | Closed · closed by ADR-031 / ADR-032 / ADR-033 | ADR-031 / 032 / 033 | v0.3.x |
| RFC-011 | Science page · render pipeline & content authoring | Closed (v0.5.0) | ADR-034 / 035 / 036 | v0.5 |
| RFC-012 | Mars Surface Map · technical strategy | Closed (v0.4.0) | ADR-037 / 038 / 039 | v0.4 |
| RFC-013 | ISS Explorer · 3D model pipeline & module pickability | Closed · closed by ADR-040 / ADR-041 / ADR-042 | ADR-040 / 041 / 042 | v0.4 |
| RFC-014 | Tiangong Explorer · 3D model pipeline & module pickability | Closed (v0.5) · closed by ADR-048 / ADR-049 / ADR-050 | ADR-048 / 049 / 050 | v0.5 |
| RFC-015 | LEARN-link rollout | Closed · closed by ADR-051 | ADR-051 | v0.5 |
| RFC-016 | Spaceflight Fleet · architecture, schema, and dataset boundaries | Closed (v0.6) · closed by ADR-052 / ADR-053 / ADR-054 | ADR-052 / 053 / 054 | v0.6 |
| RFC-017 | Surface Hotspots · LOD architecture, texture pipeline, ground-view skybox, hardware models | Closed (v0.7) · closed by ADR-059 / ADR-060 / ADR-061 / ADR-062 | ADR-059 / 060 / 061 / 062 | v0.7 |
| RFC-018 | Capacitor mobile wrapper — Android + iOS, bundle-slimming, PWA × Capacitor interaction | Draft v0.3 | PRD-015 | v0.8 |
| RFC-019 | Science Overlay & Episode System — TtsProvider abstraction, cost analysis, async pipeline, host-agnostic asset layout | Draft v0.4 — in flight (v0.7) | PRD-016 | v0.7 |
| RFC-020 | Sensory Layer — gyroscope (G-C), sonification (S-C 11-route), Capacitor haptics, audio-bus ducking under narration | Draft v0.4 | PRD-017 | v1.x |
| RFC-021 | Immersive Mode — WebXR (Android) + ARKit Capacitor Swift plugin (iPhone wrapped), Three.js whole-codebase upgrade, Exhibit Mode | Draft v0.4 | PRD-019 | v1.x |
| RFC-022 | Image Pipeline v2 — VisionProvider abstraction, sidecar manifest (ADR-047 untouched), smart-crop sharp variants, curation deny-list loop, granular CLI scope flags | Draft v0.4 | PRD-018 | v1.x |
| RFC-023 | Launches Calendar — multi-source agency-first pipeline (NASA / ESA / SpaceX direct + GCAT primary historic + LL2 augmentation), provenance_chain manifest, heuristic + curated tier overrides, CC-BY citation gate | Closed (v0.7) | PRD-020 | v0.7 |
| RFC-024 | Containerized local stack — `docker compose` web + on-demand pipeline runners + docker-e2e CI gate (VPS deploy deferred) | Closed (v0.7.x) | ADR-063 / 064 / 065 / 066 | v0.7.x |
| RFC-025 | Observability — Sentry for client-side JS errors + Grafana Cloud Agent (env-var-gated, no committed secrets, reuses podcast_scraper RFC-081 credentials) | Closed (v0.7.x) | ADR-067 / 068 | v0.7.x |
| RFC-026 | Multi-destination porkchop expansion (re-expand /plan from Mars-only to all rocky + outer destinations) | Draft | #312 | v0.8 |
| RFC-027 | List-route search on /missions + /fleet — per-route `?q=` deep-link + bidirectional filter-chip interaction | Draft | #338 | v0.7 |
| RFC-028 | data.ts split + DAL architecture review — `data-core` + `withLocaleOverlay` + per-domain modules + provenance to `$lib/provenance/` + new `galleries-data.ts` extraction | Draft | #327 | v0.7 |
| RFC-029 | Image staging ground — fetch→stage→approve→promote so `/credits` == shipped == displayed; rejects quarantined in gitignored `_staging/`, provenance walks the shipped tree only | Draft | #363 | v0.7 |
| RFC-030 | Responsive image delivery + weight reduction — WebP size ladder + `srcset` + git-LFS masters (mobile · web · Google TV) | Partially implemented (Slices 0–3 + WebP-only) · locked in ADR-080 | #383 | v0.7/v0.8 |
| RFC-031 | Keyboard-first navigation, focus model & WCAG 2.1 AA elevation — canvas keyboard-nav (ADR-025 Tier 2) + Google-TV D-pad + shared focus engine + command palette | Partially implemented (S1–S3, S5–S8; S4 camera-nav deferred) · accessibility statement live | #375 | v0.8 |
| RFC-032 | /explore v2 context/scale-shell engine + scalable universe rendering — nested contexts, zoom-within/warp-between, instanced points + impostors + device budget, physics lenses | Draft (epic kickoff) · closes PRD-030 | #TBD | v2.x |
| RFC-033 | Video & Live Feeds — `video-provenance` manifest (link-embed, zero hosted bytes) + hand-rolled click-to-load player facade + live-feed pipeline (ISS pin + launch broadcasts from `$lib/launches`, time-gated) | Draft (epic kickoff) · closes PRD-031 | #TBD | v0.8.x |
| RFC-034 | Launch / powered-ascent engine + Scene 0 — launch-site frame, multi-scale clock (pad→destination one scrub), integrated ascent EOM + CI validation, per-vehicle LaunchProfile + generic fallback, re-basing handoff into helio/cislunar; reuses #371 montage | Draft (epic kickoff) · closes PRD-032 | #412 | v2.x |
