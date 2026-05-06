# ISS 3D proxy — credits

## V1 diagrammatic model

The `/iss` screen uses a **code-generated proxy** (`src/lib/iss-proxy-model.ts`): simple boxes and truss geometry in Three.js so every pressurised module + Canadarm2 remains **individually pickable** without shipping a multi‑MB mesh or running Blender in CI.

## NASA reference (future mesh swap)

High-fidelity ISS GLTF/GLB assets are published under permissive terms via **NASA 3D Resources** (e.g. [International Space Station (ISS) (A)](https://science.nasa.gov/3d-resources/international-space-station-iss-a/)). A future slice may replace this proxy with a NASA-derived, Blender-simplified GLB per **ADR-040**, retaining the same `moduleId` naming contract.

## Earth backdrop texture

The Earth limb uses the project’s existing `static/textures/2k_earth_clouds.jpg` (same asset family as `/explore`).
