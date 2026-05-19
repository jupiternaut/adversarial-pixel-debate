import * as THREE from "three";
import type { RoleId, RoleStatus } from "../../shared/debate";
import { atlasUrls, getAtlasCell, getAtlasDefinition, getRoleStatusFrame, type AtlasCell } from "./assets";
import { roleSeats, statusVisuals, type WarRoomSceneState } from "./sceneState";

interface RoleNode {
  id: RoleId;
  group: THREE.Group;
  avatar: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  character: THREE.Group;
  body: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  link: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  light: THREE.PointLight;
  status: RoleStatus;
  active: boolean;
  phase: number;
}

const roleArt: Record<RoleId, { hair: string; accent: string; jacket: string; pants: string }> = {
  bull: { hair: "#d8793b", accent: "#f2b84b", jacket: "#7c3fb0", pants: "#263238" },
  bear: { hair: "#a8323f", accent: "#70c84f", jacket: "#bb4151", pants: "#24313a" },
  engineer: { hair: "#8a5a35", accent: "#4da3ff", jacket: "#253443", pants: "#18232c" },
  moderator: { hair: "#e0a12b", accent: "#d89a18", jacket: "#674d9b", pants: "#28323c" }
};

export interface WarRoomSceneApi {
  resize(width: number, height: number): void;
  sync(state: WarRoomSceneState): void;
  renderAt(time: number): void;
  dispose(): void;
}

export function createWarRoomScene(canvas: HTMLCanvasElement): WarRoomSceneApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#08111f");
  scene.fog = new THREE.Fog("#08111f", 12, 24);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(7.2, 6.1, 7.4);
  camera.lookAt(0, 0.35, 0);

  const textureRegistry = createTextureRegistry();
  const roleNodes = new Map<RoleId, RoleNode>();
  const disposableMaterials: THREE.Material[] = [];
  const disposableGeometries: THREE.BufferGeometry[] = [];

  const root = new THREE.Group();
  root.rotation.y = -0.08;
  scene.add(root);

  scene.add(new THREE.HemisphereLight("#dff7ff", "#1b2637", 1.85));
  const keyLight = new THREE.DirectionalLight("#e7f7ff", 2.7);
  keyLight.position.set(-4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.mapSize.set(2048, 2048);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight("#70e8ff", 1.4, 14);
  fillLight.position.set(0, 3.8, -2.2);
  scene.add(fillLight);

  const floorMaterial = material({
    color: "#172338",
    roughness: 0.78,
    metalness: 0.14,
    map: textureRegistry.cellTexture(getAtlasCell("floor-grid"))
  });
  const floor = mesh(new THREE.PlaneGeometry(14.8, 10.2), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const backWall = mesh(
    new THREE.BoxGeometry(12.6, 3.1, 0.18),
    material({
      color: "#0e1a2b",
      roughness: 0.42,
      metalness: 0.22,
      emissive: "#10243a",
      emissiveIntensity: 0.34
    })
  );
  backWall.position.set(0, 1.55, -4.35);
  backWall.receiveShadow = true;
  root.add(backWall);

  const dataWall = mesh(
    new THREE.PlaneGeometry(5.4, 2.7),
    material({
      color: "#ffffff",
      roughness: 0.24,
      metalness: 0.16,
      emissive: "#70e8ff",
      emissiveIntensity: 0.52,
      map: textureRegistry.cellTexture(getAtlasCell("data-wall"))
    })
  );
  dataWall.position.set(-2.35, 2, -4.23);
  root.add(dataWall);

  const logoPlate = mesh(
    new THREE.PlaneGeometry(4.4, 1.65),
    material({
      color: "#ffffff",
      roughness: 0.2,
      metalness: 0.12,
      emissive: "#70e8ff",
      emissiveIntensity: 0.28,
      map: textureRegistry.cellTexture(getAtlasCell("logo-plate"))
    })
  );
  logoPlate.position.set(3.25, 2.05, -4.22);
  root.add(logoPlate);

  const tableMaterial = material({
    color: "#8fd3ff",
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.54,
    emissive: "#163a54",
    emissiveIntensity: 0.16,
    map: textureRegistry.cellTexture(getAtlasCell("table-top"))
  });
  const table = mesh(new THREE.CylinderGeometry(2.45, 2.85, 0.22, 8), tableMaterial);
  table.position.set(0, 0.58, 0.38);
  table.scale.z = 0.66;
  table.castShadow = true;
  table.receiveShadow = true;
  root.add(table);

  const core = mesh(
    new THREE.CylinderGeometry(0.48, 0.58, 0.56, 8),
    material({ color: "#101827", roughness: 0.36, metalness: 0.38, emissive: "#70e8ff", emissiveIntensity: 0.48 })
  );
  core.position.set(0, 0.98, 0.38);
  core.castShadow = true;
  root.add(core);

  const coreBeam = new THREE.PointLight("#70e8ff", 1.1, 7);
  coreBeam.position.set(0, 1.25, 0.38);
  root.add(coreBeam);

  const projectionBeam = mesh(
    new THREE.CylinderGeometry(0.28, 1.74, 1.55, 32, 1, true),
    material({
      color: "#70e8ff",
      roughness: 0.16,
      metalness: 0,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: "#70e8ff",
      emissiveIntensity: 0.4
    })
  );
  projectionBeam.position.set(0, 1.62, 0.38);
  projectionBeam.rotation.y = Math.PI / 8;
  root.add(projectionBeam);

  const panelMaterial = material({
    color: "#dff7ff",
    roughness: 0.28,
    metalness: 0.05,
    transparent: true,
    opacity: 0.68,
    map: textureRegistry.cellTexture(getAtlasCell("glass-panel"))
  });
  const leftPanel = mesh(new THREE.PlaneGeometry(2.4, 1.2), panelMaterial.clone());
  leftPanel.position.set(-4.25, 1.45, 0.88);
  leftPanel.rotation.y = Math.PI * 0.34;
  root.add(leftPanel);
  disposableMaterials.push(leftPanel.material);

  const rightPanel = mesh(new THREE.PlaneGeometry(2.4, 1.2), panelMaterial.clone());
  rightPanel.position.set(4.25, 1.45, 0.88);
  rightPanel.rotation.y = -Math.PI * 0.34;
  root.add(rightPanel);
  disposableMaterials.push(rightPanel.material);

  const sideConsoleMaterial = material({
    color: "#ffffff",
    roughness: 0.24,
    metalness: 0.12,
    emissive: "#70e8ff",
    emissiveIntensity: 0.22,
    map: textureRegistry.cellTexture(getAtlasCell("icon-strip"))
  });
  for (const [index, x] of [-5.2, 5.2].entries()) {
    const consolePanel = mesh(new THREE.PlaneGeometry(1.6, 0.8), sideConsoleMaterial.clone());
    consolePanel.position.set(x, 1.22, -2.35);
    consolePanel.rotation.y = x < 0 ? Math.PI * 0.18 : -Math.PI * 0.18;
    consolePanel.rotation.z = index === 0 ? -0.02 : 0.02;
    root.add(consolePanel);
    disposableMaterials.push(consolePanel.material);
  }

  for (const [roleId, seat] of Object.entries(roleSeats) as Array<[RoleId, (typeof roleSeats)[RoleId]]>) {
    const roleNode = createRoleNode(roleId, seat.heading, createRoleLink(seat.x, seat.z));
    roleNode.group.position.set(seat.x, 0, seat.z);
    roleNode.group.lookAt(0, 0, 0.25);
    roleNode.phase = roleId.length * 0.71;
    roleNodes.set(roleId, roleNode);
    root.add(roleNode.link);
    root.add(roleNode.group);
  }

  function material(parameters: THREE.MeshStandardMaterialParameters) {
    const item = new THREE.MeshStandardMaterial(parameters);
    disposableMaterials.push(item);
    return item;
  }

  function mesh<TGeometry extends THREE.BufferGeometry, TMaterial extends THREE.Material>(geometry: TGeometry, itemMaterial: TMaterial) {
    disposableGeometries.push(geometry);
    return new THREE.Mesh(geometry, itemMaterial);
  }

  function createRoleNode(
    roleId: RoleId,
    heading: number,
    link: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  ): RoleNode {
    const group = new THREE.Group();
    group.rotation.y = heading;
    const art = roleArt[roleId];

    const ringMaterial = material({
      color: statusVisuals.idle.color,
      roughness: 0.26,
      metalness: 0.38,
      emissive: statusVisuals.idle.color,
      emissiveIntensity: 0.36
    });
    const ring = mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    const pedestal = mesh(
      new THREE.CylinderGeometry(0.42, 0.54, 0.24, 6),
      material({ color: "#172338", roughness: 0.48, metalness: 0.32 })
    );
    pedestal.position.y = 0.13;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    const character = new THREE.Group();
    group.add(character);

    const bodyMaterial = material({
      color: art.jacket,
      roughness: 0.44,
      metalness: 0.12,
      emissive: art.accent,
      emissiveIntensity: 0.14
    });
    const body = mesh(new THREE.BoxGeometry(0.52, 0.52, 0.3), bodyMaterial);
    body.position.y = 0.56;
    body.castShadow = true;
    character.add(body);

    const shirt = mesh(
      new THREE.BoxGeometry(0.18, 0.44, 0.04),
      material({ color: "#f8fafc", roughness: 0.42, metalness: 0.04, emissive: art.accent, emissiveIntensity: 0.05 })
    );
    shirt.position.set(0, 0.58, 0.18);
    character.add(shirt);

    const badge = mesh(
      new THREE.BoxGeometry(0.11, 0.08, 0.04),
      material({ color: art.accent, roughness: 0.32, metalness: 0.18, emissive: art.accent, emissiveIntensity: 0.28 })
    );
    badge.position.set(0.14, 0.7, 0.2);
    character.add(badge);

    const leftArm = mesh(
      new THREE.BoxGeometry(0.12, 0.4, 0.16),
      material({ color: "#f1bf78", roughness: 0.48, metalness: 0.02 })
    );
    leftArm.position.set(-0.34, 0.55, 0.02);
    character.add(leftArm);

    const rightArm = mesh(leftArm.geometry.clone(), leftArm.material.clone());
    disposableMaterials.push(rightArm.material);
    rightArm.position.set(0.34, 0.55, 0.02);
    character.add(rightArm);

    const leftLeg = mesh(
      new THREE.BoxGeometry(0.17, 0.3, 0.18),
      material({ color: art.pants, roughness: 0.5, metalness: 0.08 })
    );
    leftLeg.position.set(-0.13, 0.15, 0);
    character.add(leftLeg);

    const rightLeg = mesh(leftLeg.geometry.clone(), leftLeg.material.clone());
    disposableMaterials.push(rightLeg.material);
    rightLeg.position.set(0.13, 0.15, 0);
    character.add(rightLeg);

    const head = mesh(
      new THREE.BoxGeometry(0.5, 0.42, 0.38),
      material({ color: "#f1bf78", roughness: 0.5, metalness: 0.02 })
    );
    head.position.y = 1.05;
    head.castShadow = true;
    character.add(head);

    const hair = mesh(
      new THREE.BoxGeometry(0.58, 0.18, 0.42),
      material({ color: art.hair, roughness: 0.48, metalness: 0.04, emissive: art.hair, emissiveIntensity: 0.06 })
    );
    hair.position.set(0, 1.3, -0.01);
    hair.castShadow = true;
    character.add(hair);

    const hairSide = mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.4),
      material({ color: art.hair, roughness: 0.48, metalness: 0.04 })
    );
    hairSide.position.set(-0.3, 1.12, -0.01);
    character.add(hairSide);

    const hairSideRight = mesh(hairSide.geometry.clone(), hairSide.material.clone());
    disposableMaterials.push(hairSideRight.material);
    hairSideRight.position.set(0.3, 1.12, -0.01);
    character.add(hairSideRight);

    const face = mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.035),
      material({ color: "#111827", roughness: 0.4, metalness: 0.04 })
    );
    face.position.set(0, 1.06, 0.22);
    character.add(face);

    const avatarMaterial = material({
      color: "#ffffff",
      roughness: 0.18,
      metalness: 0.04,
      transparent: true,
      opacity: 0.86,
      map: textureRegistry.cellTexture(getRoleStatusFrame(roleId, "idle")),
      emissive: "#70e8ff",
      emissiveIntensity: 0.08
    });
    const avatar = mesh(new THREE.PlaneGeometry(1.55, 1.24), avatarMaterial);
    avatar.position.set(0, 1.82, 0.48);
    group.add(avatar);

    const light = new THREE.PointLight(statusVisuals.idle.color, statusVisuals.idle.lightIntensity, 3.8);
    light.position.set(0, 0.92, 0.25);
    group.add(light);

    return {
      id: roleId,
      group,
      avatar,
      character,
      body,
      ring,
      link,
      light,
      status: "idle",
      active: false,
      phase: 0
    };
  }

  function createRoleLink(x: number, z: number): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.14, 0.38),
      new THREE.Vector3(x * 0.48, 0.12, (z + 0.38) * 0.48),
      new THREE.Vector3(x, 0.1, z)
    ]);
    disposableGeometries.push(geometry);
    const linkMaterial = new THREE.LineBasicMaterial({
      color: statusVisuals.idle.color,
      transparent: true,
      opacity: 0.18
    });
    disposableMaterials.push(linkMaterial);
    return new THREE.Line(geometry, linkMaterial);
  }

  function sync(state: WarRoomSceneState) {
    for (const role of state.roles) {
      const node = roleNodes.get(role.id);
      if (!node) {
        continue;
      }
      const visual = statusVisuals[role.status];
      node.status = role.status;
      node.active = role.active;
      node.avatar.material.map = textureRegistry.cellTexture(getRoleStatusFrame(role.id, role.status));
      node.avatar.material.opacity = visual.panelOpacity;
      node.avatar.material.emissive.set(visual.color);
      node.avatar.material.emissiveIntensity = role.active ? 0.28 : 0.12;
      node.avatar.material.needsUpdate = true;
      node.body.material.emissive.set(visual.color);
      node.body.material.emissiveIntensity = role.active || role.status === "speaking" ? 0.38 : 0.14;
      node.ring.material.color.set(visual.color);
      node.ring.material.emissive.set(visual.color);
      node.link.material.color.set(visual.color);
      node.link.material.opacity = role.active || role.status === "speaking" ? 0.9 : role.status === "done" ? 0.42 : 0.2;
      node.light.color.set(visual.color);
    }
    coreBeam.intensity = 1.1 + state.allOutputs * 0.18;
  }

  function renderAt(time: number) {
    table.rotation.y = Math.sin(time * 0.22) * 0.018;
    core.rotation.y = time * 0.42;
    projectionBeam.rotation.y = time * 0.18;
    projectionBeam.material.opacity = 0.08 + statefulPulse(time, 0.5) * 0.04;
    fillLight.intensity = 1.25 + Math.sin(time * 0.7) * 0.12;

    for (const node of roleNodes.values()) {
      const visual = statusVisuals[node.status];
      const wave = 0.5 + Math.sin(time * visual.pulseSpeed + node.phase) * 0.5;
      const activeBoost = node.active ? 0.18 : 0;
      node.character.position.y = visual.lift + wave * activeBoost;
      node.avatar.position.y = 1.82 + visual.lift + wave * activeBoost * 0.7;
      node.avatar.scale.setScalar(1 + wave * (node.status === "speaking" ? 0.055 : 0.018));
      node.ring.scale.setScalar(1 + wave * (node.status === "speaking" || node.status === "error" ? 0.16 : 0.05));
      node.light.intensity = visual.lightIntensity + wave * (node.status === "speaking" ? 1.4 : node.status === "error" ? 0.9 : 0.18);
      node.ring.material.emissiveIntensity = 0.28 + wave * (node.status === "speaking" ? 0.76 : 0.22);
      node.link.material.opacity =
        (node.status === "speaking" ? 0.72 : node.status === "done" ? 0.34 : node.status === "queued" ? 0.24 : 0.14) +
        wave * (node.status === "speaking" ? 0.22 : 0.06);
    }

    renderer.render(scene, camera);
  }

  function resize(width: number, height: number) {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    renderAt(0);
  }

  function dispose() {
    for (const geometry of disposableGeometries) {
      geometry.dispose();
    }
    for (const itemMaterial of disposableMaterials) {
      const maybeMapped = itemMaterial as THREE.MeshStandardMaterial;
      maybeMapped.map?.dispose();
      itemMaterial.dispose();
    }
    textureRegistry.dispose();
    renderer.dispose();
  }

  return { resize, sync, renderAt, dispose };
}

function statefulPulse(time: number, speed: number): number {
  return 0.5 + Math.sin(time * speed) * 0.5;
}

function createTextureRegistry() {
  const loader = new THREE.TextureLoader();
  const atlases = new Map<string, THREE.Texture>();
  const cells = new Map<string, THREE.Texture>();

  for (const [atlasId, url] of Object.entries(atlasUrls)) {
    const texture = loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    atlases.set(atlasId, texture);
  }

  function cellTexture(cell: AtlasCell) {
    const cacheKey = `${cell.atlas}:${cell.x}:${cell.y}:${cell.width}:${cell.height}`;
    const cached = cells.get(cacheKey);
    if (cached) {
      return cached;
    }
    const atlas = getAtlasDefinition(cell.atlas);
    const baseTexture = atlases.get(cell.atlas);
    if (!baseTexture) {
      throw new Error(`Missing texture atlas: ${cell.atlas}`);
    }
    const texture = baseTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.offset.set(cell.x / atlas.width, 1 - (cell.y + cell.height) / atlas.height);
    texture.repeat.set(cell.width / atlas.width, cell.height / atlas.height);
    texture.needsUpdate = true;
    cells.set(cacheKey, texture);
    return texture;
  }

  function dispose() {
    for (const texture of cells.values()) {
      texture.dispose();
    }
    for (const texture of atlases.values()) {
      texture.dispose();
    }
  }

  return { cellTexture, dispose };
}
