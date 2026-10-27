import * as THREE from 'three';

// --- PROCEDURAL TERRAIN HEIGHTMAP SAMPLER ---
export function getTerrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  let h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3.8;
  h += Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.08 + 0.9) * 2.2;
  h += Math.sin(x * 0.18 + z * 0.14) * 0.8;
  const ridge = Math.pow(Math.min(1.0, d / 140), 2) * 14.0;
  h += ridge;
  if (d < 18) h *= d / 18;
  return h;
}

// --- PROCEDURAL TEXTURE GENERATORS ---
export function createRoughGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(0, 0, 1024, 1024);

  // Gravel & rock noise
  for (let i = 0; i < 75000; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.6 ? 'rgba(32, 44, 66, 0.45)' : v > 0.3 ? 'rgba(6, 9, 16, 0.55)' : 'rgba(0, 255, 204, 0.06)';
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }

  // Tactical cyber grid
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTerrainShaderMaterial(): THREE.ShaderMaterial {
  const groundTex = createRoughGroundTexture();
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: groundTex },
      time: { value: 0 },
      fogColor: { value: new THREE.Color(0x040711) },
      fogDensity: { value: 0.0095 },
      lightDir: { value: new THREE.Vector3(0.4, 0.9, 0.3).normalize() },
      cyberColor: { value: new THREE.Color(0x00ffcc) },
      ridgeColor: { value: new THREE.Color(0x1a3048) },
      valleyColor: { value: new THREE.Color(0x080c14) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vHeight;
      void main() {
        vUv = uv * 24.0;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vHeight = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogDensity;
      uniform vec3 lightDir;
      uniform vec3 cyberColor;
      uniform vec3 ridgeColor;
      uniform vec3 valleyColor;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vHeight;
      void main() {
        vec4 tex = texture2D(map, vUv);
        float hNorm = clamp((vHeight + 2.0) / 20.0, 0.0, 1.0);
        vec3 baseCol = mix(valleyColor, ridgeColor, hNorm);
        baseCol = mix(baseCol, tex.rgb, 0.55);
        float grid = max(
          step(0.97, fract(vWorldPos.x * 0.08 + time * 0.05)),
          step(0.97, fract(vWorldPos.z * 0.08 + time * 0.04))
        );
        baseCol += cyberColor * grid * 0.18;
        float NdotL = max(dot(vNormal, lightDir), 0.15);
        vec3 lit = baseCol * (0.35 + 0.65 * NdotL);
        float rim = 1.0 - max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0);
        lit += cyberColor * pow(rim, 3.0) * 0.12;
        float dist = length(vWorldPos.xz);
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * dist * dist * 0.6);
        lit = mix(lit, fogColor, clamp(fogFactor, 0.0, 0.85));
        gl_FragColor = vec4(lit, 1.0);
      }
    `,
    lights: false,
    fog: false,
  });
}

export function createBuildingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0e1320';
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 15; y < 500; y += 32) {
    for (let x = 15; x < 240; x += 30) {
      if (Math.random() > 0.4) {
        const glow = Math.random();
        ctx.fillStyle =
          glow > 0.65
            ? 'rgba(0, 255, 204, 0.85)'
            : glow > 0.35
            ? 'rgba(255, 215, 0, 0.75)'
            : 'rgba(80, 160, 255, 0.7)';
      } else {
        ctx.fillStyle = '#172033';
      }
      ctx.fillRect(x, y, 20, 22);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7a4b27';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 48) {
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(0, y, 256, 4);
  }

  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,200,120,0.1)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 28, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCamoTexture(c1 = '#182030', c2 = '#26344d', c3 = '#0d121c'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = c2;
  for (let i = 0; i < 45; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = c3;
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 16, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SkinTextureCache: Record<string, THREE.CanvasTexture> = {};

export function getSkinTexture(skinId: string): THREE.CanvasTexture {
  if (SkinTextureCache[skinId]) return SkinTextureCache[skinId];

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  if (skinId === 'default') {
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 8) {
      for (let y = 0; y < 512; y += 8) {
        ctx.fillStyle = (x + y) % 16 === 0 ? '#161c28' : '#0e121a';
        ctx.fillRect(x, y, 8, 8);
      }
    }
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      let sx = Math.random() * 512,
        sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 60, sy);
      ctx.lineTo(sx + 60, sy + (Math.random() > 0.5 ? 40 : -40));
      ctx.lineTo(sx + 120, sy + 40);
      ctx.stroke();
    }
  } else if (skinId === 'magma') {
    ctx.fillStyle = '#100806';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 22; i++) {
      let sx = Math.random() * 512,
        sy = Math.random() * 512;
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (let j = 0; j < 4; j++) {
        sx += (Math.random() - 0.5) * 110;
        sy += (Math.random() - 0.5) * 110;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else if (skinId === 'gold') {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#fce38a');
    grad.addColorStop(0.5, '#e3a934');
    grad.addColorStop(1, '#9b6c06');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(70, 45, 5, 0.45)';
    ctx.lineWidth = 2.5;
    for (let x = 32; x < 512; x += 64) {
      for (let y = 32; y < 512; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 1.5);
        ctx.stroke();
      }
    }
  } else if (skinId === 'nebula') {
    ctx.fillStyle = '#060212';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20; i++) {
      const radGrad = ctx.createRadialGradient(
        Math.random() * 512,
        Math.random() * 512,
        10,
        Math.random() * 512,
        Math.random() * 512,
        150
      );
      radGrad.addColorStop(0, i % 2 === 0 ? 'rgba(147, 51, 234, 0.55)' : 'rgba(6, 182, 212, 0.5)');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 512, 512);
    }
  } else if (skinId === 'toxic') {
    ctx.fillStyle = '#121710';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#39ff14';
    for (let x = -512; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 32 + 512, 512);
      ctx.lineTo(x + 512, 512);
      ctx.fill();
    }
  } else if (skinId === 'frost') {
    ctx.fillStyle = '#d9e8f5';
    ctx.fillRect(0, 0, 512, 512);
    const colors = ['#a0c4e2', '#6b9dc7', '#ffffff', '#2b4c6f'];
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      const x = Math.random() * 512,
        y = Math.random() * 512;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 26, y + 10);
      ctx.lineTo(x + 10, y + 32);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  SkinTextureCache[skinId] = tex;
  return tex;
}
