# Realistic Ballistics, Authentic Gunshot Audio & High-Detail Firearms

Transform the 3D combat engine into a tactile, authentic military-grade ballistics simulator with detailed multi-part firearm assemblies, procedural multi-layer gunshot acoustics (concussion thump, mechanical slide cycling, supersonic snap, environmental tail echo), and physics-driven projectile flight with bullet drop and target leading.

> [!IMPORTANT]
> **User Review & Critical Technical Directions**:
> - **Ballistic Projectile Engine**: Transition from instantaneous raycasts to physical high-speed projectile entities that experience gravity drop, aerodynamic drag, muzzle velocity, and time-of-flight target leading.
> - **Authentic Acoustic Synthesizer**: Replace generic electronic beeps with an authentic 5-layer procedural Web Audio acoustic pipeline (mechanical chamber snap, supersonic crack, low-frequency blast concussion, atmospheric environmental reverb tail, and brass shell casing ground clatter).
> - **Detailed 3D Weapon Models**: Elevate weapon meshes from basic blocks to 10–14 part modular assemblies with animated slide/bolt blowback, ejection ports, picatinny rails, tactical scopes, rifled muzzle brakes, and hot barrel heat shimmer.

---

### 1. Overview & Core Concept

- **What It Does**: Upgrades *Cyber Infinite: Zone Rush* with true-to-life ballistic gunplay and visceral audio design. Weapons look like real engineered firearms with moving mechanical parts, feel authentic through recoil spring kinematics and muzzle blasts, sound like genuine weapons through multi-stage acoustic synthesis, and require skill at distance due to bullet drop and lead compensation.
- **Target Audience**: Players who appreciate competitive, tactical first-person shooters with realistic weapon feel, physical bullet mechanics, and rich audiovisual feedback.
- **Key Value**: Delivers visceral shooting satisfaction without relying on bulky external audio or model assets, maintaining 60fps performance and zero 404 dependencies through pure procedural Web Audio and Three.js geometry.

---

### 2. User Experience & Visual Design

#### A. Firearm Visual Hierarchy & Mechanical Detailing
- **10–14 Part Procedural Weapon Assemblies**:
  - **Upper & Lower Receiver**: Machined geometry with charging handles, safety selectors, trigger guard, and tactile trigger.
  - **Barrel & Muzzle Brake**: Fluted steel barrels with multi-port muzzle brakes or flash hiders that vent directional gas particles.
  - **Moving Bolt / Slide Assembly**: Real mechanical blowback where pistol slides and rifle bolts cycle backward on fire and snap forward to chamber rounds.
  - **Optics & Rail Interface**: Picatinny tactical rails with glass holographic sights, illuminated reticles, and 8X optical sniper tubes with realistic interior depth.
  - **Magazine & Well**: Detailed textured magazines that physically drop and re-insert during animated tactical reload stages.
  - **Barrel Heat & Smoke**: Continuous rapid firing builds thermal heat that glows in the vents and releases volumetric muzzle smoke wisps.

#### B. Authentic Gunfire Sound Pipeline (Web Audio API)
Every trigger pull synthesizes an instant multi-frequency acoustic event:
1. **Initial Concussion (0–40ms)**: Sub-bass impulse (40–120Hz) delivering physical low-end chest thump.
2. **Supersonic Transient Crack (0–20ms)**: High-pressure noise burst through a resonant steep bandpass filter (2.4kHz–4.5kHz) emulating the supersonic bullet exit.
3. **Mechanical Action (20–90ms)**: Metallic slide kick, chamber unseating, and spring recoil cycle.
4. **Environmental Tail & Slapback Echo (80–800ms)**: Dual delay nodes with lowpass damping producing canyon/building echo reflections tailored to the map environment.
5. **Spent Shell Ground Clatter**: Physical brass casings bounce with multiple randomized high-frequency metallic pings.
6. **Supersonic Flyby Whip**: Bot bullets that whiz close past the player trigger a distinct spatial supersonic snap.

#### C. Realistic Ballistics & Physical Projectiles
- **Muzzle Velocity**: Caliber-specific speeds (Pistol: 380 m/s, Shotgun: 420 m/s, Assault Rifle: 720 m/s, Sniper Rifle: 980 m/s).
- **Parabolic Bullet Drop**: Continuous downward gravity acceleration ($g = 9.81\text{ m/s}^2$, scaled for game feel) requiring players to compensate with scope elevation crosshairs.
- **Target Leading**: Hits take flight time to arrive at long distances; leading running bots is required.
- **Dynamic Spread Bloom**: Cone of fire expands when sprinting, jumping, or hip-firing, and tightens when Aiming Down Sights (ADS) or stationary.
- **Impact Reactions**: Caliber-scaled dirt bursts on ground, metal sparks on buildings, wood chips on barricades, and directional flesh impacts.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Physical Continuous Projectiles vs Raycasting**
  - *Chosen Approach*: Continuous sub-step projectile simulation using pooled projectile structs with line-segment ray intersection per frame.
  - *Why*: Enables true bullet drop, lead time, visible glowing tracers with smoke ribbons, and close-miss supersonic audio whizzes, providing genuine tactical depth.
  - *Alternatives Considered*: Pure raycast hitscan (cheap, but lacks ballistic realism and bullet drop at distance).
- **Decision 2: Procedural Multi-Node Web Audio vs Sample Audio Files**
  - *Chosen Approach*: 100% procedural multi-layer audio synthesis using Web Audio API (Oscillators, BufferSource noise, BiquadFilters, Waveshaper distortion, StereoPanner, and Convolution/Delay feedback).
  - *Why*: Eliminates all external 404 dependencies, allows infinite variation in acoustic pitch and reverb reflections based on distance, and guarantees instant zero-latency playback.
- **Decision 3: Modular React + Three.js Engine Architecture**
  - *Chosen Approach*: Mount the Three.js canvas in an isolated container with a dedicated simulation clock, separating React UI state (ammo, health, shop) from the 60fps render loop.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          App Container (React)                         │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │    DOM HUD Overlays   │  │   Three.js 60fps Game Loop & Canvas   │  │
│  │  - Reticle & ADS Scope│  │   ┌────────────────────────────────┐  │  │
│  │  - Compass & Minimap  │  │   │  Physics & Ballistics Manager  │  │  │
│  │  - Health, Ammo, Wood │  │   │  - Projectiles (Drop & Drag)   │  │  │
│  │  - Weapon Shop & Skins│  │   │  - Shell Casings & Sparks      │  │  │
│  └───────────────────────┘  │   └───────────────┬────────────────┘  │  │
│                             │                   │                   │  │
│                             │   ┌───────────────▼────────────────┐  │  │
│                             │   │ 3D Weapon Models & Viewmodel   │  │  │
│                             │   │ - Animated Slide & Bolt Blow   │  │  │
│                             │   │ - 12-Part Procedural Geometry  │  │  │
│                             │   │ - Muzzle Gas & Ejection Smoke  │  │  │
│                             │   └───────────────┬────────────────┘  │  │
│                             │                   │                   │  │
│                             │   ┌───────────────▼────────────────┐  │  │
│                             │   │ Realistic Audio Synthesizer    │  │  │
│                             │   │ - 5-Layer Gunfire Acoustics    │  │  │
│                             │   │ - Distance Rolloff & Reverb    │  │  │
│                             │   │ - Supersonic Bullet Whiz       │  │  │
│                             │   └────────────────────────────────┘  │  │
│                             └───────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Ballistics State & Projectile Pool
- `Projectiles`: Array of active bullets `{ pos, vel, prevPos, gravity, damage, caliber, color, owner, lifetime }`.
- `Sub-Stepping`: At high muzzle velocities (e.g. 900 m/s), each frame performs segmented ray tests between `prevPos` and `pos` to prevent tunneling through enemies or terrain.
- `Acoustic Layers`: Dedicated synthesis functions for `Pistol`, `SMG`, `Rifle`, `Shotgun`, `Heavy Sniper`, and `Plasma/Energy` weapon classes.

---

### 5. Verification Plan

- Verify compilation via `compile_applet` to ensure error-free TypeScript execution.
- Test firing mechanics across all 28 weapon types:
  - Slide/bolt blowback motion and shell ejection.
  - Muzzle velocity and visible gravity drop over 50m–150m distances.
  - Multi-layer audio impact with subwoofer thump and stereo reverb tail.
  - ADS sight alignment and 8X optical reticle view.
- Confirm 60fps stability with multiple active bots and active projectile pools.
