# src/lib/components — module map

Svelte components shared across routes, by family. Scene-specific ones live with their scene (`surface-scene/`, `lab/`); pure logic lives in `$lib/orbital`, `$lib/universe`, `$lib/surface-map`.

- **Root-layout shell** — `Nav`, `CommandPalette`, `DebugPanel`, `AudioOverlay`, `LanguageSuggestion`, `ExhibitOverlay`. `SensorySheet` is the unified settings sheet Nav opens; `LocalePicker`, `TargetEnvSwitcher` also sit in Nav.
- **Detail panels** — `Panel.svelte` is the shell (right drawer, mobile bottom sheet; props `grabFocus`, `zIndex`, `mobileSheet`). Content panels wrap it: `PlanetPanel`, `SmallBodyPanel`, `SatellitePanel`, `SunPanel`, `BeltPanel`, `MessagePanel`, `StarPanel`, `MissionPanel`, `FleetEntryPanel`, `StationModulePanel`, `PhasePanel`, `RegimePanel`, and the /explore-scale `MilkyWay` / `LocalGroup` / `LocalSheet` / `Virgo` / `Laniakea` / `CosmicWeb` / `DeepSky` / `Exoplanet` / `BlackHole` panels. Parts: `PanelTabRow`, `PanelHeroImage`, `PanelLightbox`, `AgencyRow`, `ScienceCard`, `ScienceChip`.
- **Named `*Panel` but NOT on the shell** — `ConicSectionPanel` (/fly overlay), `ScienceLayersPanel` (Science Lens), `SiteStoryPanel` (surface site story). `EarthObjectPanel`, `MuseumPanel`, `ObservatoryPanel` live in `surface-scene/`.
- **/fly** — `LaunchScene` / `CoastScene` / `DescentScene` (the flight acts; math in `$lib/orbital`), `LaunchTelemetry`, `AscentLosses`, `SpacecraftInfoCard`, `FlightDirectorBanner`; `PhaseMarkerLabel` (cislunar markers) vs `FdPhaseMarkerLabel` (the four FlightDirector stages).
- **/explore v2** — `StarIndex`, `StarPortrait`, `ConstellationFinder`, `HrDiagram`, `MassPeriodChart`, `CausalityMap`, `ExploreScalePicker`, `ExploreBodyIndex`.
- **Surface HUD** (used by `SurfaceScene`) — `ViewToggleButton`, `View3dControls`, `LayerChipRow`, `HotspotsLodChip`, `TierContextCard`, `TacticalScan`, `LensLegend`, `Panorama*`. **Stations** — `StationBlueprint`, `StationAssemblyControl`, `StationTimelineStrip`, `StationOrbitBanner`.
- **Look-alikes** — `EpochTimelineStrip` (/missions, /fleet) vs `TimelineNavigator` (/missions year window); `MediaPlayer` (modal) vs `VideoThumb` (resting tile).
- **Debug** — `DebugPanel` (`?debug=1`) shows page tabs registered via `DebugPanelRegistrar` / `debug-panel-context.ts`; also `RenderingDebugRegistrar`, `FlybyDebugViewer`, `AscentCameraDebug`.
- **Attribution/links** — `ImageCredit`, `LinkCredit`, `LearnLink` (ADR-051 rules).

Pointers: TA.md §components · AGENTS.md (i18n, mobile-first). No doc states why panels share one shell; the `Panel.svelte` prop comments are the only record.
