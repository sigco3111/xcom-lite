
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Unit, Tile, GridPosition, Allegiance, CombatState, GameOverStatus, DamageLogEntry, SavedUnitInfo, Mission, EquipmentSlots, PlayerInventoryItem, PendingActionType, AbilityDefinition, AbilityTargetType, AbilityEffectType, ActiveAbilityStatus, TemporaryAbilityEffect, SurvivedUnitCombatStats } from '../types';
import {
  GRID_SIZE_X, GRID_SIZE_Z, TILE_SIZE,
  PLAYER_COLOR, ENEMY_COLOR, TILE_COLOR,
  MOVE_HIGHLIGHT_TILE_COLOR, PLAYER_ATTACK_RANGE_TILE_COLOR, ENEMY_ATTACK_RANGE_TILE_COLOR, ABILITY_TARGET_HIGHLIGHT_COLOR,
  UNIT_BASE_HEIGHT, UNIT_SIZE, CAMERA_INITIAL_POSITION,
  PLAYER_START_POSITIONS, UNIT_TEMPLATES, RANKS, ALL_ABILITIES,
  ENEMY_DRONE_COLOR, ENEMY_BRUISER_COLOR,
  HEALTH_BAR_HIGH_COLOR, HEALTH_BAR_MEDIUM_COLOR, HEALTH_BAR_LOW_COLOR, HEALTH_BAR_BACKGROUND_COLOR,
  HEALTH_BAR_HEIGHT, HEALTH_BAR_Y_OFFSET,
  DAMAGE_NUMBER_DURATION, DAMAGE_NUMBER_FLOAT_SPEED, DAMAGE_NUMBER_COLOR, DAMAGE_NUMBER_FONT_SIZE, DAMAGE_NUMBER_SCALE,
  OBSTACLE_HEIGHT, OBSTACLE_MESH_COLOR, NUM_RANDOM_OBSTACLES,
  PLAYER_DEPLOYMENT_MAX_Z, ENEMY_DEPLOYMENT_MIN_Z,
  ENEMY_COMPOSITIONS_BY_DIFFICULTY,
  HALF_COVER_DAMAGE_REDUCTION // Added constant for cover
} from '../constants';
import CombatUI from './CombatUI';
import GameEndModal from './GameEndModal';
import { calculateEffectiveUnitStats } from '../utils/applyResearchEffects';
import { useGame } from '../contexts/GameContext';

// Removed global THREE declaration and assignment as it's no longer needed with module imports

const allegianceToKorean = (allegiance: Allegiance): string => {
  switch (allegiance) {
    case Allegiance.PLAYER: return '플레이어';
    case Allegiance.ENEMY: return '적';
    case Allegiance.NEUTRAL: return '중립';
    default: return '알 수 없음';
  }
};

const actionTypeToKorean = (actionType: PendingActionType | null): string => {
  if (!actionType) return '';
  if (actionType.startsWith('ability_')) {
    const abilityId = actionType.substring('ability_'.length);
    const abilityName = ALL_ABILITIES[abilityId]?.name || abilityId;
    return `능력: ${abilityName}`;
  }
  switch (actionType) {
    case 'move': return '이동';
    case 'attack': return '공격';
    case 'skip': return '대기';
    default: return actionType;
  }
};

const generateRandomObstacles = (): GridPosition[] => {
  const obstacles: GridPosition[] = [];
  const maxRetriesPerObstacle = 10;

  const playerSafeZoneMaxZ = PLAYER_DEPLOYMENT_MAX_Z + 2;
  const enemySafeZoneMinZ = ENEMY_DEPLOYMENT_MIN_Z - 2;

  for (let i = 0; i < NUM_RANDOM_OBSTACLES; i++) {
    let retries = 0;
    while (retries < maxRetriesPerObstacle) {
      const x = Math.floor(Math.random() * GRID_SIZE_X);
      const y = Math.floor(Math.random() * GRID_SIZE_Z);

      const isInPlayerZone = y <= playerSafeZoneMaxZ;
      const isInEnemyZone = y >= enemySafeZoneMinZ;
      const isAlreadyObstacle = obstacles.some(op => op.x === x && op.y === y);

      if (!isInPlayerZone && !isInEnemyZone && !isAlreadyObstacle) {
        obstacles.push({ x, y });
        break;
      }
      retries++;
    }
  }
  return obstacles;
};


const getPlayerUnitsForCombat = (
    playerSavedUnits: SavedUnitInfo[],
    completedResearchIds: string[],
    playerInventory: PlayerInventoryItem[],
    randomObstacles: GridPosition[]): Unit[] => {

  if (!playerSavedUnits || playerSavedUnits.length === 0) {
     const fallbackSavedInfo: SavedUnitInfo = {
         id: 'fallback_player_1',
         templateId: 'rookie',
         name: '비상 투입 신병',
         experience: 0,
         rank: RANKS[0].name,
         equipment: { primaryWeapon: undefined, weaponMod: undefined, armorMod: undefined, utilitySlot1: undefined }
     };
     const effectiveStats = calculateEffectiveUnitStats(fallbackSavedInfo, completedResearchIds, playerInventory);
      return [{
        ...effectiveStats,
        id: fallbackSavedInfo.id,
        name: fallbackSavedInfo.name,
        allegiance: Allegiance.PLAYER,
        position: PLAYER_START_POSITIONS[0] || { x:1, y:1},
        color: PLAYER_COLOR,
        size: { width: UNIT_SIZE, height: UNIT_BASE_HEIGHT, depth: UNIT_SIZE },
        hasMovedThisTurn: false,
        killsThisMission: 0, // Initialize kills
      }];
  }


  return playerSavedUnits.map((savedInfo, index) => {
    const effectiveStats = calculateEffectiveUnitStats(savedInfo, completedResearchIds, playerInventory);

    let assignedPos = PLAYER_START_POSITIONS[index % PLAYER_START_POSITIONS.length];
    let attempts = 0;
    const maxPlacementAttempts = PLAYER_START_POSITIONS.length * 2;
    let originalAssignedPos = {...assignedPos};
    const tempAssignedPlayerPositions: GridPosition[] = [];

    while(attempts < maxPlacementAttempts &&
          (assignedPos.x >= GRID_SIZE_X || assignedPos.x < 0 ||
           assignedPos.y >= PLAYER_DEPLOYMENT_MAX_Z || assignedPos.y < 0 ||
           randomObstacles.some(op => op.x === assignedPos.x && op.y === assignedPos.y) ||
           tempAssignedPlayerPositions.some(p => p.x === assignedPos.x && p.y === assignedPos.y)
          )
    ) {
        const offsetIndex = attempts % PLAYER_START_POSITIONS.length;
        assignedPos = {
            x: (originalAssignedPos.x + (attempts % 3 -1) + GRID_SIZE_X) % GRID_SIZE_X,
            y: (PLAYER_START_POSITIONS[offsetIndex].y + Math.floor(attempts / 3)) % PLAYER_DEPLOYMENT_MAX_Z
        };
        attempts++;
    }
     if (attempts === maxPlacementAttempts) {
        console.warn(`플레이어 유닛 ${savedInfo.name} 배치 실패, 임의 위치로 지정합니다.`);
        let fallbackX = index % Math.floor(GRID_SIZE_X / 2);
        let fallbackY = index % PLAYER_DEPLOYMENT_MAX_Z;
        assignedPos = {x: fallbackX, y: fallbackY};
    }
    tempAssignedPlayerPositions.push(assignedPos);


    return {
      ...effectiveStats,
      id: savedInfo.id,
      name: savedInfo.name,
      allegiance: Allegiance.PLAYER,
      position: assignedPos,
      color: PLAYER_COLOR,
      size: { width: UNIT_SIZE, height: UNIT_BASE_HEIGHT, depth: UNIT_SIZE },
      hasMovedThisTurn: false,
      killsThisMission: 0, // Initialize kills
    };
  });
};


const createGridWithObjects = (units: Unit[], randomObstacles: GridPosition[]): Tile[][] => {
  const grid: Tile[][] = [];
  for (let i = 0; i < GRID_SIZE_X; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_SIZE_Z; j++) {
      const isObstacle = randomObstacles.some(op => op.x === i && op.y === j);
      grid[i][j] = {
        position: { x: i, y: j },
        isOccupied: units.some(u => u.position.x === i && u.position.y === j && u.health > 0),
        isWalkable: !isObstacle,
        isObstacle: isObstacle,
        highlightType: null,
      };
    }
  }
  return grid;
};

const createInitialCombatStateForMission = (
    playerUnitsFromContext: SavedUnitInfo[],
    completedResearchIds: string[],
    playerInventory: PlayerInventoryItem[],
    mission: Mission
  ): CombatState => {
  const randomObstacles = generateRandomObstacles();
  const playerUnits = getPlayerUnitsForCombat(playerUnitsFromContext, completedResearchIds, playerInventory, randomObstacles);

  const enemyUnitTemplates = ENEMY_COMPOSITIONS_BY_DIFFICULTY[mission.difficulty] || ENEMY_COMPOSITIONS_BY_DIFFICULTY[1];

  const enemyUnits: Unit[] = [];
  let enemyIdCounter = 0;

  const validEnemySpawnTiles: GridPosition[] = [];
  for (let x = 0; x < GRID_SIZE_X; x++) {
    for (let y = ENEMY_DEPLOYMENT_MIN_Z; y < GRID_SIZE_Z; y++) {
      if (!randomObstacles.some(op => op.x === x && op.y === y)) {
        validEnemySpawnTiles.push({ x, y });
      }
    }
  }

  for (let i = validEnemySpawnTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validEnemySpawnTiles[i], validEnemySpawnTiles[j]] = [validEnemySpawnTiles[j], validEnemySpawnTiles[i]];
  }

  enemyUnitTemplates.forEach(enemyConfig => {
    const baseTemplate = UNIT_TEMPLATES[enemyConfig.templateId];
    if (!baseTemplate) {
        console.warn(`Enemy template ${enemyConfig.templateId} not found in UNIT_TEMPLATES.`);
        return;
    }

    for (let i = 0; i < enemyConfig.count; i++) {
      if (validEnemySpawnTiles.length === 0) {
        console.warn("적 유닛을 배치할 유효한 타일이 부족합니다.");
        break;
      }
      const spawnPos = validEnemySpawnTiles.pop()!;
      enemyIdCounter++;

      let enemyColor = ENEMY_COLOR;
      if (enemyConfig.templateId === 'enemy_drone') enemyColor = ENEMY_DRONE_COLOR;
      else if (enemyConfig.templateId === 'enemy_bruiser') enemyColor = ENEMY_BRUISER_COLOR;

      const enemyBaseStats = {
        ...baseTemplate,
        health: baseTemplate.maxHealth,
        actionPoints: baseTemplate.maxActionPoints,
        baseAbilities: [], // Enemies don't have abilities for now
        activeAbilities: [],
        temporaryEffects: [],
      };

      enemyUnits.push({
        ...enemyBaseStats,
        id: `enemy_${enemyConfig.templateId}_${enemyIdCounter}`,
        name: `${baseTemplate.name} #${enemyIdCounter}`,
        allegiance: Allegiance.ENEMY,
        position: spawnPos,
        color: enemyColor,
        size: { width: UNIT_SIZE * (baseTemplate.templateId === 'enemy_bruiser' ? 1.2 : baseTemplate.templateId === 'enemy_drone' ? 0.8 : 1),
                height: UNIT_BASE_HEIGHT * (baseTemplate.templateId === 'enemy_bruiser' ? 1.1 : baseTemplate.templateId === 'enemy_drone' ? 0.8 : 1),
                depth: UNIT_SIZE * (baseTemplate.templateId === 'enemy_bruiser' ? 1.2 : baseTemplate.templateId === 'enemy_drone' ? 0.8 : 1) },
        experience: 0,
        rank: 'N/A',
        equipment: { primaryWeapon: undefined, weaponMod: undefined, armorMod: undefined, utilitySlot1: undefined },
        hasMovedThisTurn: false,
        killsThisMission: 0, // Enemies don't track kills for XP
      });
    }
  });

  const allUnits = [...playerUnits, ...enemyUnits];

  return {
    units: JSON.parse(JSON.stringify(allUnits)),
    grid: createGridWithObjects(allUnits, randomObstacles),
    selectedUnitId: null,
    currentTurn: Allegiance.PLAYER,
    messageLog: ["전투 시작! (턴 1)"],
    pendingAction: null,
    gameOverState: 'playing',
    damageLog: [],
    currentTurnNumber: 1,
    isCombatDelegated: false,
  };
};

interface CombatViewProps {
  mission: Mission;
  onCombatEnd: (status: GameOverStatus, mission: Mission, enemiesDefeated: number, playerUnitsLost: number, playerUnitsSurvived?: SurvivedUnitCombatStats[]) => void;
}

const sharedSparkGeometry = new THREE.SphereGeometry(1, 6, 6);

interface FloatingTextEffect {
  sprite: THREE.Sprite;
  startTime: number;
  duration: number;
  isDamageNumber: boolean;
  initialY: number;
}

const CombatView: React.FC<CombatViewProps> = ({ mission, onCombatEnd }) => {
  const { gameData } = useGame();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const unitsGroupRef = useRef<THREE.Group | null>(null);
  const gridGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const activeParticleEffectsRef = useRef<Array<{
    particles: THREE.Mesh[];
    startTime: number;
    duration: number;
  }>>([]);

  const floatingTextEffectsRef = useRef<FloatingTextEffect[]>([]);
  const healthBarsRef = useRef<Map<string, THREE.Sprite>>(new Map());

  const initialPlayerUnitCountRef = useRef(0);
  const initialEnemyUnitCountRef = useRef(0);


  const [combatState, setCombatState] = useState<CombatState>(() => {
    const initialState = createInitialCombatStateForMission(
      gameData.teamUnits,
      gameData.researchState.completedProjects,
      gameData.playerInventory,
      mission
    );
    initialPlayerUnitCountRef.current = initialState.units.filter(u => u.allegiance === Allegiance.PLAYER).length;
    initialEnemyUnitCountRef.current = initialState.units.filter(u => u.allegiance === Allegiance.ENEMY).length;
    return initialState;
  });
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const stopPlayerAiRequestRef = useRef(false);
  const combatStateRef = useRef<CombatState>(combatState);

  useEffect(() => {
    combatStateRef.current = combatState;
  }, [combatState]);


  useEffect(() => {
    let isMounted = true; // Mounted flag

    const newState = createInitialCombatStateForMission(
        gameData.teamUnits,
        gameData.researchState.completedProjects,
        gameData.playerInventory,
        mission
    );
    initialPlayerUnitCountRef.current = newState.units.filter(u => u.allegiance === Allegiance.PLAYER).length;
    initialEnemyUnitCountRef.current = newState.units.filter(u => u.allegiance === Allegiance.ENEMY).length;

    if (isMounted) {
        setCombatState(newState);
        setIsAiProcessing(false);
        stopPlayerAiRequestRef.current = false;
    }

    return () => {
        isMounted = false;
    };
  }, [mission, gameData.teamUnits, gameData.researchState.completedProjects, gameData.playerInventory]);


  const gridToWorld = useCallback((gridPos: GridPosition): THREE.Vector3 => {
    return new THREE.Vector3(
      gridPos.x * TILE_SIZE - (GRID_SIZE_X * TILE_SIZE) / 2 + TILE_SIZE / 2,
      0,
      gridPos.y * TILE_SIZE - (GRID_SIZE_Z * TILE_SIZE) / 2 + TILE_SIZE / 2
    );
  }, []);

  const worldToGrid = (worldPos: THREE.Vector3): GridPosition | null => {
    const x = Math.floor((worldPos.x + (GRID_SIZE_X * TILE_SIZE) / 2) / TILE_SIZE);
    const z = Math.floor((worldPos.z + (GRID_SIZE_Z * TILE_SIZE) / 2) / TILE_SIZE);
    if (x >= 0 && x < GRID_SIZE_X && z >= 0 && z < GRID_SIZE_Z) {
      return { x, y: z };
    }
    return null;
  };

  const addMessage = useCallback((message: string, important: boolean = false) => {
    setCombatState(prevState => ({
      ...prevState,
      messageLog: [...prevState.messageLog, message].slice(-10)
    }));
  }, []);

  const clearAllHighlights = useCallback(() => {
    setCombatState(prev => ({
      ...prev,
      grid: prev.grid.map(row => row.map(tile => ({ ...tile, highlightType: null }))),
      units: prev.units.map(u => ({...u, isTargetable: false })),
    }));
  }, []);

  const determineGameOverStatus = (currentUnits: Unit[], previousGameOverState: GameOverStatus): GameOverStatus => {
    if (previousGameOverState !== 'playing') {
        return previousGameOverState;
    }
    const activePlayerUnits = currentUnits.filter(u => u.allegiance === Allegiance.PLAYER && u.health > 0).length;
    const activeEnemyUnits = currentUnits.filter(u => u.allegiance === Allegiance.ENEMY && u.health > 0).length;

    if (activePlayerUnits === 0 && activeEnemyUnits >= 0) {
        return 'defeat';
    }
    if (activeEnemyUnits === 0 && activePlayerUnits > 0) {
        return 'victory';
    }
    return 'playing';
  };


  const playImpactSparks = useCallback((targetPosition: THREE.Vector3) => {
    if (!sceneRef.current) return;
    console.log("SFX: Attack_Impact");

    const numSparks = 10;
    const sparkDuration = 600;
    const effectParticles: THREE.Mesh[] = [];

    for (let i = 0; i < numSparks; i++) {
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.3 ? 0xffdd00 : 0xffaa00,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const spark = new THREE.Mesh(sharedSparkGeometry, sparkMaterial);

      const offsetRadius = UNIT_SIZE * 0.25;
      spark.position.copy(targetPosition)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * offsetRadius * 2,
          (Math.random() - 0.5) * offsetRadius * 1.5,
          (Math.random() - 0.5) * offsetRadius * 2
        ));

      spark.scale.set(0.01, 0.01, 0.01);

      sceneRef.current.add(spark);
      effectParticles.push(spark);
    }

    activeParticleEffectsRef.current.push({
      particles: effectParticles,
      startTime: Date.now(),
      duration: sparkDuration,
    });
  }, [sceneRef]);

  const createHealthBarSprite = (unit: Unit): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context for health bar');

    canvas.width = 128;
    canvas.height = 16;

    const healthPercentage = unit.health / unit.maxHealth;
    let barColor = HEALTH_BAR_HIGH_COLOR;
    if (healthPercentage < 0.3) barColor = HEALTH_BAR_LOW_COLOR;
    else if (healthPercentage < 0.7) barColor = HEALTH_BAR_MEDIUM_COLOR;

    context.fillStyle = HEALTH_BAR_BACKGROUND_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = barColor;
    context.fillRect(2, 2, (canvas.width - 4) * healthPercentage, canvas.height - 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);

    const worldPos = gridToWorld(unit.position);
    sprite.position.set(worldPos.x, worldPos.y + unit.size.height + HEALTH_BAR_Y_OFFSET, worldPos.z);
    sprite.scale.set(UNIT_SIZE * 1.2, HEALTH_BAR_HEIGHT * 1.5, 1);
    sprite.userData = { unitId: unit.id, type: 'healthBar' };

    return sprite;
  };

  const createDamageNumberSprite = (damage: number, targetUnit: Unit): FloatingTextEffect => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context for damage number');

    const font = `bold ${DAMAGE_NUMBER_FONT_SIZE}px Arial`;
    context.font = font;
    const textWidth = context.measureText(damage.toString()).width;

    canvas.width = textWidth + 8;
    canvas.height = DAMAGE_NUMBER_FONT_SIZE + 8;

    context.font = font;
    context.fillStyle = DAMAGE_NUMBER_COLOR;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(damage.toString(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);

    const targetWorldPos = gridToWorld(targetUnit.position);
    const initialY = targetWorldPos.y + targetUnit.size.height + HEALTH_BAR_Y_OFFSET + 0.3;
    sprite.position.set(targetWorldPos.x, initialY, targetWorldPos.z);
    sprite.scale.set(DAMAGE_NUMBER_SCALE, DAMAGE_NUMBER_SCALE * (canvas.height / canvas.width), DAMAGE_NUMBER_SCALE);

    return {
        sprite,
        startTime: Date.now(),
        duration: DAMAGE_NUMBER_DURATION,
        isDamageNumber: true,
        initialY
    };
  };

  const showDamageNumber = useCallback((damage: number, targetUnit: Unit) => {
    if (!sceneRef.current) return;
    const damageEffect = createDamageNumberSprite(damage, targetUnit);
    sceneRef.current.add(damageEffect.sprite);
    floatingTextEffectsRef.current.push(damageEffect);
  }, [gridToWorld]);


  const playAttackEffect = useCallback((attacker: Unit, target: Unit) => {
    if (!sceneRef.current || !unitsGroupRef.current) return;
    console.log(`SFX: Attack_Unit_${attacker.templateId}_vs_${target.templateId}`);

    const attackerMesh = unitsGroupRef.current.children.find(child => child.userData.id === attacker.id) as THREE.Mesh | undefined;
    const targetMesh = unitsGroupRef.current.children.find(child => child.userData.id === target.id) as THREE.Mesh | undefined;

    if (!attackerMesh || !targetMesh) return;

    const attackerPos = new THREE.Vector3();
    attackerMesh.getWorldPosition(attackerPos);
    attackerPos.y += attacker.size.height / 2;

    const targetPos = new THREE.Vector3();
    targetMesh.getWorldPosition(targetPos);
    targetPos.y += target.size.height / 2;

    const beamMaterial = new THREE.LineBasicMaterial({ color: 0xffef90, linewidth: 2 });
    const beamPoints = [attackerPos, targetPos];
    const beamGeometry = new THREE.BufferGeometry().setFromPoints(beamPoints);
    const beamLine = new THREE.Line(beamGeometry, beamMaterial);
    sceneRef.current.add(beamLine);

    setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.remove(beamLine);
      }
      beamGeometry.dispose();
      beamMaterial.dispose();
    }, 250);

    playImpactSparks(targetPos.clone());
  }, [unitsGroupRef, sceneRef, playImpactSparks]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 2000);
    camera.position.set(CAMERA_INITIAL_POSITION.x, CAMERA_INITIAL_POSITION.y, CAMERA_INITIAL_POSITION.z);
    camera.lookAt(0,0,0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.minDistance = TILE_SIZE * 5;
    controls.maxDistance = Math.max(GRID_SIZE_X, GRID_SIZE_Z) * TILE_SIZE * 2;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(GRID_SIZE_X * TILE_SIZE * 0.25, 50, GRID_SIZE_Z * TILE_SIZE * 0.25);
    directionalLight.castShadow = true;

    directionalLight.shadow.camera.left = -GRID_SIZE_X * TILE_SIZE / 1.8;
    directionalLight.shadow.camera.right = GRID_SIZE_X * TILE_SIZE / 1.8;
    directionalLight.shadow.camera.top = GRID_SIZE_Z * TILE_SIZE / 1.8;
    directionalLight.shadow.camera.bottom = -GRID_SIZE_Z * TILE_SIZE / 1.8;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 150;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    scene.add(directionalLight);

    unitsGroupRef.current = new THREE.Group();
    scene.add(unitsGroupRef.current);
    gridGroupRef.current = new THREE.Group();
    scene.add(gridGroupRef.current);

    const animate = () => {
      requestAnimationFrame(animate);
      if(controlsRef.current) controlsRef.current.update();

      const currentTime = Date.now();
      const stillActiveEffects: typeof activeParticleEffectsRef.current = [];

      for (const effect of activeParticleEffectsRef.current) {
        const elapsedTimeRatio = (currentTime - effect.startTime) / effect.duration;

        if (elapsedTimeRatio < 1) {
          effect.particles.forEach(particle => {
            const growthProgressRatio = Math.min(1, elapsedTimeRatio * 2.5);
            const targetMaxParticleRadius = UNIT_SIZE / 2;
            const currentParticleRadius = growthProgressRatio * targetMaxParticleRadius;

            particle.scale.set(currentParticleRadius, currentParticleRadius, currentParticleRadius);

            (particle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - elapsedTimeRatio * 1.1);
          });
          stillActiveEffects.push(effect);
        } else {
          effect.particles.forEach(particle => {
            sceneRef.current?.remove(particle);
            if (particle.material instanceof THREE.Material) {
               particle.material.dispose();
            }
          });
        }
      }
      activeParticleEffectsRef.current = stillActiveEffects;

      const stillFloatingTextEffects: FloatingTextEffect[] = [];
      for (const effect of floatingTextEffectsRef.current) {
        const elapsedTime = currentTime - effect.startTime;
        const progress = elapsedTime / effect.duration;

        if (progress < 1) {
          if (effect.isDamageNumber) {
            effect.sprite.position.y = effect.initialY + (elapsedTime / 1000) * DAMAGE_NUMBER_FLOAT_SPEED;
          }
          (effect.sprite.material as THREE.SpriteMaterial).opacity = 1.0 - progress;
          stillFloatingTextEffects.push(effect);
        } else {
          sceneRef.current?.remove(effect.sprite);
          if (effect.sprite.material.map) {
            (effect.sprite.material.map as THREE.CanvasTexture)?.dispose();
          }
          effect.sprite.material.dispose();
        }
      }
      floatingTextEffectsRef.current = stillFloatingTextEffects;

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (mountRef.current && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      activeParticleEffectsRef.current.forEach(effect => {
        effect.particles.forEach(particle => {
            sceneRef.current?.remove(particle);
            if (particle.material instanceof THREE.Material) particle.material.dispose();
        });
      });
      activeParticleEffectsRef.current = [];

      floatingTextEffectsRef.current.forEach(effect => {
        sceneRef.current?.remove(effect.sprite);
        if (effect.sprite.material.map) {
             (effect.sprite.material.map as THREE.CanvasTexture)?.dispose();
        }
        effect.sprite.material.dispose();
      });
      floatingTextEffectsRef.current = [];

      healthBarsRef.current.forEach(bar => {
        sceneRef.current?.remove(bar);
        if (bar.material.map) {
            (bar.material.map as THREE.CanvasTexture)?.dispose();
        }
        bar.material.dispose();
      });
      healthBarsRef.current.clear();

      if (rendererRef.current?.domElement.parentElement === mountRef.current) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();

      sceneRef.current?.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
            if (object.geometry && object.geometry !== sharedSparkGeometry) object.geometry.dispose();

            const material = object.material as THREE.Material | THREE.Material[];
            if (material) {
                if (Array.isArray(material)) {
                    material.forEach(mat => mat.dispose());
                } else {
                    material.dispose();
                }
            }
        }
      });
      unitsGroupRef.current = null;
      gridGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!gridGroupRef.current || !combatState.grid) return;

    gridGroupRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const material = child.material as THREE.Material | THREE.Material[];
            if (Array.isArray(material)) {
                material.forEach(m => m.dispose());
            } else {
                material.dispose();
            }
        }
    });
    gridGroupRef.current.clear();

    const flatTileGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.1, TILE_SIZE * 0.95);
    const obstacleGeometry = new THREE.BoxGeometry(TILE_SIZE, OBSTACLE_HEIGHT, TILE_SIZE);


    combatState.grid.forEach(row => {
      row.forEach(tile => {
        const worldPos = gridToWorld(tile.position);

        if (tile.isObstacle) {
          const obstacleMaterial = new THREE.MeshStandardMaterial({ color: OBSTACLE_MESH_COLOR });
          const obstacleMesh = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
          obstacleMesh.position.set(worldPos.x, OBSTACLE_HEIGHT / 2 - 0.05, worldPos.z);
          obstacleMesh.castShadow = true;
          obstacleMesh.receiveShadow = true;
          obstacleMesh.userData = { type: 'obstacle', gridX: tile.position.x, gridY: tile.position.y };
          gridGroupRef.current?.add(obstacleMesh);
        } else {
          let tileColorHex = TILE_COLOR;
          if (tile.highlightType === 'move') {
            tileColorHex = MOVE_HIGHLIGHT_TILE_COLOR;
          } else if (tile.highlightType === 'player_attack') {
            tileColorHex = PLAYER_ATTACK_RANGE_TILE_COLOR;
          } else if (tile.highlightType === 'enemy_attack') {
            tileColorHex = ENEMY_ATTACK_RANGE_TILE_COLOR;
          } else if (tile.highlightType === 'ability_target') {
            tileColorHex = ABILITY_TARGET_HIGHLIGHT_COLOR;
          }
          const tileMaterial = new THREE.MeshStandardMaterial({ color: tileColorHex });
          const tileMesh = new THREE.Mesh(flatTileGeometry, tileMaterial);
          tileMesh.position.set(worldPos.x, -0.05, worldPos.z);
          tileMesh.userData = { type: 'tile', gridX: tile.position.x, gridY: tile.position.y };
          tileMesh.receiveShadow = true;
          gridGroupRef.current?.add(tileMesh);
        }
      });
    });
  }, [combatState.grid, gridToWorld]);


  useEffect(() => {
    if (!unitsGroupRef.current || !combatState.units || !sceneRef.current) return;

    combatState.units.forEach(unit => {
        let unitMesh = unitsGroupRef.current?.children.find(child => child.userData.id === unit.id) as THREE.Mesh | undefined;

        if (!unitMesh && unit.health > 0) {
            const unitGeometry = new THREE.BoxGeometry(unit.size.width, unit.size.height, unit.size.depth);
            const unitMaterial = new THREE.MeshStandardMaterial({ color: unit.color });
            unitMesh = new THREE.Mesh(unitGeometry, unitMaterial);
            unitMesh.castShadow = true;
            unitMesh.userData = { type: 'unit', id: unit.id };
            unitsGroupRef.current?.add(unitMesh);

            const healthBarSprite = createHealthBarSprite(unit);
            sceneRef.current?.add(healthBarSprite);
            healthBarsRef.current.set(unit.id, healthBarSprite);
        } else if (unitMesh && unit.health <= 0) {
             unitsGroupRef.current?.remove(unitMesh);
             if (unitMesh.geometry) unitMesh.geometry.dispose();
             if (unitMesh.material instanceof THREE.Material) unitMesh.material.dispose();

             const healthBar = healthBarsRef.current.get(unit.id);
             if (healthBar) {
                sceneRef.current?.remove(healthBar);
                if(healthBar.material.map) (healthBar.material.map as THREE.CanvasTexture)?.dispose();
                healthBar.material.dispose();
                healthBarsRef.current.delete(unit.id);
             }
             return;
        }

        if (unitMesh && unit.health > 0) {
            const healthBar = healthBarsRef.current.get(unit.id);
            if (healthBar) {
                const worldPos = gridToWorld(unit.position);
                healthBar.position.set(worldPos.x, worldPos.y + unit.size.height + HEALTH_BAR_Y_OFFSET, worldPos.z);

                const canvas = (healthBar.material.map as THREE.CanvasTexture)?.image as HTMLCanvasElement;
                if (canvas) {
                    const context = canvas.getContext('2d');
                    if (context) {
                        const healthPercentage = Math.max(0, unit.health) / unit.maxHealth;
                        let barColor = HEALTH_BAR_HIGH_COLOR;
                        if (healthPercentage < 0.3) barColor = HEALTH_BAR_LOW_COLOR;
                        else if (healthPercentage < 0.7) barColor = HEALTH_BAR_MEDIUM_COLOR;

                        context.clearRect(0,0, canvas.width, canvas.height);
                        context.fillStyle = HEALTH_BAR_BACKGROUND_COLOR;
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.fillStyle = barColor;
                        context.fillRect(2, 2, (canvas.width - 4) * healthPercentage, canvas.height - 4);
                        if (healthBar.material.map) healthBar.material.map.needsUpdate = true;
                    }
                }
            }

            const worldPos = gridToWorld(unit.position);
            unitMesh.position.set(worldPos.x, worldPos.y + unit.size.height / 2, worldPos.z);

            if (unitMesh.material instanceof THREE.MeshStandardMaterial) {
                let emissiveColor = 0x000000;
                if (unit.id === combatState.selectedUnitId && !combatState.isCombatDelegated) {
                    emissiveColor = 0x00cc00;
                } else if (unit.isTargetable && (combatState.pendingAction === 'attack' || (combatState.pendingAction && combatState.pendingAction.startsWith('ability_')))) {
                    emissiveColor = 0xff3300;
                }
                unitMesh.material.emissive.setHex(emissiveColor);
                if (unitMesh.material.color.getHexString() !== unit.color.substring(1)) {
                     unitMesh.material.color.set(unit.color);
                }
            }
        }
    });

    const currentUnitIds = new Set(combatState.units.map(u => u.id));
    unitsGroupRef.current.children = unitsGroupRef.current.children.filter(child => {
        const meshUnitId = child.userData.id;
        if (!currentUnitIds.has(meshUnitId)) {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                const material = child.material as THREE.Material | THREE.Material[];
                 if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else {
                    material.dispose();
                }
            }
            const healthBar = healthBarsRef.current.get(meshUnitId);
            if (healthBar) {
                sceneRef.current?.remove(healthBar);
                if(healthBar.material.map) (healthBar.material.map as THREE.CanvasTexture)?.dispose();
                healthBar.material.dispose();
                healthBarsRef.current.delete(meshUnitId);
            }
            return false;
        }
        return true;
    });

  }, [combatState.units, combatState.selectedUnitId, combatState.pendingAction, combatState.isCombatDelegated, gridToWorld, sceneRef, createHealthBarSprite]);

  const getCoverBenefitForTarget = useCallback((attacker: Unit, target: Unit, grid: Tile[][]): number => {
    const { x: tx, y: ty } = target.position;
    const { x: ax, y: ay } = attacker.position;

    const adjacentOffsets = [
        { dx: -1, dy: 0, requiredAttackerDirection: 'ax < ox' }, // Obstacle West of target
        { dx: 1, dy: 0,  requiredAttackerDirection: 'ax > ox' }, // Obstacle East of target
        { dx: 0, dy: -1, requiredAttackerDirection: 'ay < oy' }, // Obstacle South of target
        { dx: 0, dy: 1,  requiredAttackerDirection: 'ay > oy' }  // Obstacle North of target
    ];

    for (const offset of adjacentOffsets) {
        const ox = tx + offset.dx;
        const oy = ty + offset.dy;

        if (ox >= 0 && ox < GRID_SIZE_X && oy >= 0 && oy < GRID_SIZE_Z && grid[ox][oy].isObstacle) {
            // Check if attacker is on the "other side" of this obstacle
            let inCover = false;
            if (offset.dx === -1 && ax < ox) inCover = true; // Obstacle West, Attacker further West
            else if (offset.dx === 1 && ax > ox) inCover = true; // Obstacle East, Attacker further East
            else if (offset.dy === -1 && ay < oy) inCover = true; // Obstacle South, Attacker further South
            else if (offset.dy === 1 && ay > oy) inCover = true; // Obstacle North, Attacker further North

            if (inCover) {
                return HALF_COVER_DAMAGE_REDUCTION;
            }
        }
    }
    return 0;
  }, []);


  const executeAutomatedTurn = useCallback((allegianceToAct: Allegiance) => {
    if (allegianceToAct === Allegiance.PLAYER && stopPlayerAiRequestRef.current) {
        stopPlayerAiRequestRef.current = false;
        setIsAiProcessing(false);
        setCombatState(prev => {
            if (prev.isCombatDelegated) {
                addMessage("플레이어 AI 위임 중단됨. 수동 제어합니다.");
                return {...prev, isCombatDelegated: false};
            }
            return prev;
        });
        return;
    }

    setIsAiProcessing(true);
    addMessage(`${allegianceToKorean(allegianceToAct)} AI 턴 처리 중...`);
    const AI_ACTION_DELAY = 600;

    setTimeout(() => {
      setCombatState(prevFullState => {
        if (prevFullState.gameOverState !== 'playing') {
          setIsAiProcessing(false);
          return prevFullState;
        }

        if (allegianceToAct === Allegiance.PLAYER && stopPlayerAiRequestRef.current) {
            stopPlayerAiRequestRef.current = false;
            setIsAiProcessing(false);
            addMessage("플레이어 AI 위임 중단 (처리 직전). 수동 제어합니다.");
            return {...prevFullState, isCombatDelegated: false};
        }

        let workingUnits = JSON.parse(JSON.stringify(prevFullState.units)) as Unit[];
        let workingGrid = JSON.parse(JSON.stringify(prevFullState.grid)) as Tile[][];
        let accumulatedMessages: string[] = [];
        let accumulatedDamageLogEntries: DamageLogEntry[] = [];
        let anyActionTakenThisTurnOverall = false;
        let playerAiInterruptedMidTurn = false;

        const actingUnitsOfAllegiance = workingUnits.filter(u => u.allegiance === allegianceToAct && u.health > 0 && u.actionPoints > 0);
        const opponentAllegiance = allegianceToAct === Allegiance.PLAYER ? Allegiance.ENEMY : Allegiance.PLAYER;

        for (const actingUnit of actingUnitsOfAllegiance) {
            if (allegianceToAct === Allegiance.PLAYER && stopPlayerAiRequestRef.current) {
                playerAiInterruptedMidTurn = true;
                accumulatedMessages.push(`${actingUnit.name} 행동 중단됨 (위임 해제).`);
                break;
            }

            if (determineGameOverStatus(workingUnits, prevFullState.gameOverState) !== 'playing') break;

            let currentUnitState = workingUnits.find(u => u.id === actingUnit.id);
            if (!currentUnitState || currentUnitState.health <= 0 || currentUnitState.actionPoints <= 0) continue;

            let potentialTargets = workingUnits.filter(u => u.allegiance === opponentAllegiance && u.health > 0);
            if (potentialTargets.length === 0) break;

            potentialTargets.sort((a, b) => {
                const coverA = getCoverBenefitForTarget(currentUnitState!, a, workingGrid) > 0;
                const coverB = getCoverBenefitForTarget(currentUnitState!, b, workingGrid) > 0;
                if (coverA && !coverB) return 1; // Prefer targets NOT in cover
                if (!coverA && coverB) return -1;

                const aCanBeKilled = a.health <= (currentUnitState!.attackDamage - (coverA ? HALF_COVER_DAMAGE_REDUCTION : 0));
                const bCanBeKilled = b.health <= (currentUnitState!.attackDamage - (coverB ? HALF_COVER_DAMAGE_REDUCTION : 0));
                if (aCanBeKilled && !bCanBeKilled) return -1;
                if (!aCanBeKilled && bCanBeKilled) return 1;
                return a.health - b.health;
            });

            let unitTookAnActionInItsTurn = false;
            while(currentUnitState.actionPoints > 0) {
                if (playerAiInterruptedMidTurn || determineGameOverStatus(workingUnits, prevFullState.gameOverState) !== 'playing' || potentialTargets.length === 0) break;

                let didSomethingThisAP = false;

                // 1. Try to attack if possible
                if (currentUnitState.actionPoints >= 1) {
                    let directAttackTarget: Unit | null = null;
                    for (const targetUnit of potentialTargets) {
                        const distance = Math.abs(currentUnitState.position.x - targetUnit.position.x) + Math.abs(currentUnitState.position.y - targetUnit.position.y);
                        if (distance <= currentUnitState.attackRange) {
                            directAttackTarget = targetUnit;
                            break;
                        }
                    }
                    if (directAttackTarget) {
                        playAttackEffect(currentUnitState, directAttackTarget);

                        let damage = currentUnitState.attackDamage;
                        const coverReduction = getCoverBenefitForTarget(currentUnitState, directAttackTarget, workingGrid);
                        let finalDamage = Math.max(0, damage - coverReduction);

                        let message = `${currentUnitState.name}이(가) ${directAttackTarget.name}을(를) 공격! ${finalDamage} 피해.`;
                        if (coverReduction > 0) {
                            message += ` (대상 엄폐로 ${coverReduction} 감소)`;
                        }
                        accumulatedMessages.push(message);
                        showDamageNumber(finalDamage, directAttackTarget);
                        accumulatedDamageLogEntries.push({ turn: prevFullState.currentTurnNumber, allegiance: allegianceToAct, damage: finalDamage, targetName: directAttackTarget.name, timestamp: Date.now() });

                        let targetHealthAfterDamage = 0;
                        let killsIncrement = 0;

                        const originalTargetState = workingUnits.find(u => u.id === directAttackTarget!.id)!;

                        workingUnits = workingUnits.map(u => {
                            if (u.id === currentUnitState!.id) return { ...u, actionPoints: u.actionPoints - 1 };
                            if (u.id === directAttackTarget!.id) {
                                targetHealthAfterDamage = Math.max(0, u.health - finalDamage);
                                return { ...u, health: targetHealthAfterDamage };
                            }
                            return u;
                        });

                        currentUnitState = workingUnits.find(u=> u.id === currentUnitState!.id)!;
                        const attackedTargetInfo = workingUnits.find(u=> u.id === directAttackTarget!.id)!;

                        if (originalTargetState.allegiance === Allegiance.ENEMY && targetHealthAfterDamage <= 0 && originalTargetState.health > 0 && currentUnitState.allegiance === Allegiance.PLAYER) {
                            killsIncrement = 1;
                             workingUnits = workingUnits.map(u => u.id === currentUnitState!.id ? {...u, killsThisMission: (u.killsThisMission || 0) + killsIncrement} : u);
                             currentUnitState = workingUnits.find(u=> u.id === currentUnitState!.id)!;
                        }


                        if (attackedTargetInfo.health <= 0) {
                            console.log("SFX: Unit_Destroyed_Explosion");
                            accumulatedMessages.push(`${attackedTargetInfo.name} 파괴됨!`);
                            const destroyedPos = attackedTargetInfo.position;
                            workingGrid[destroyedPos.x][destroyedPos.y].isOccupied = false;
                            potentialTargets = potentialTargets.filter(t => t.id !== attackedTargetInfo.id);
                        }
                        didSomethingThisAP = true;
                        unitTookAnActionInItsTurn = true;
                        anyActionTakenThisTurnOverall = true;
                        if (currentUnitState.health <=0 || currentUnitState.actionPoints <= 0) break;
                        continue;
                    }
                }

                // 2. If no attack, try to move
                if (currentUnitState.actionPoints >= 1 && !didSomethingThisAP) {
                    const closestTarget = potentialTargets[0];
                    if (closestTarget) {
                        const startPos = currentUnitState.position;
                        const queue: Array<{pos: GridPosition, path: GridPosition[]}> = [{pos: startPos, path: []}];
                        const visited: Set<string> = new Set([`${startPos.x},${startPos.y}`]);
                        let possibleMoves: Array<{pos: GridPosition, distanceToTarget: number, pathLength: number, isCovered: boolean}> = [];

                        while(queue.length > 0) {
                            const {pos, path} = queue.shift()!;
                            if (path.length < currentUnitState.moveSpeed) {
                                const neighbors = [
                                    {x: pos.x + 1, y: pos.y}, {x: pos.x - 1, y: pos.y},
                                    {x: pos.x, y: pos.y + 1}, {x: pos.x, y: pos.y - 1}
                                ].sort(() => Math.random() - 0.5);

                                for (const neighbor of neighbors) {
                                    const neighborKey = `${neighbor.x},${neighbor.y}`;
                                    if (neighbor.x >=0 && neighbor.x < GRID_SIZE_X && neighbor.y >=0 && neighbor.y < GRID_SIZE_Z &&
                                        !visited.has(neighborKey) &&
                                        workingGrid[neighbor.x][neighbor.y].isWalkable &&
                                        !workingGrid[neighbor.x][neighbor.y].isObstacle &&
                                        !workingUnits.some(u => u.health > 0 && u.id !== currentUnitState!.id && u.position.x === neighbor.x && u.position.y === neighbor.y)
                                        ) {

                                        visited.add(neighborKey);
                                        const distToTarget = Math.abs(neighbor.x - closestTarget.position.x) + Math.abs(neighbor.y - closestTarget.position.y);
                                        let isTileCovered = false;
                                        // Check if neighbor tile is adjacent to an obstacle
                                        const adjacentCheck = [{dx:-1,dy:0},{dx:1,dy:0},{dx:0,dy:-1},{dx:0,dy:1}];
                                        for(const off of adjacentCheck) {
                                            const obsX = neighbor.x + off.dx;
                                            const obsY = neighbor.y + off.dy;
                                            if (obsX >=0 && obsX < GRID_SIZE_X && obsY >=0 && obsY < GRID_SIZE_Z && workingGrid[obsX][obsY].isObstacle) {
                                                isTileCovered = true;
                                                break;
                                            }
                                        }

                                        if (path.length + 1 <= currentUnitState.moveSpeed) {
                                            possibleMoves.push({pos: neighbor, distanceToTarget: distToTarget, pathLength: path.length + 1, isCovered: isTileCovered});
                                            queue.push({pos: neighbor, path: [...path, neighbor]});
                                        }
                                    }
                                }
                            }
                        }

                        if (possibleMoves.length > 0) {
                           possibleMoves.sort((a,b) => {
                               if (a.isCovered && !b.isCovered) return -1; // Prefer covered tiles
                               if (!a.isCovered && b.isCovered) return 1;
                               if (a.distanceToTarget !== b.distanceToTarget) return a.distanceToTarget - b.distanceToTarget;
                               return a.pathLength - b.pathLength;
                           });
                           const bestMove = possibleMoves[0].pos;

                            const oldPos = currentUnitState.position;
                            workingGrid[oldPos.x][oldPos.y].isOccupied = false;
                            workingGrid[bestMove.x][bestMove.y].isOccupied = true;

                            accumulatedMessages.push(`${currentUnitState.name}이(가) (${bestMove.x},${bestMove.y})(으)로 이동.`);
                            workingUnits = workingUnits.map(u => {
                                if (u.id === currentUnitState!.id) return { ...u, position: bestMove!, actionPoints: u.actionPoints - 1, hasMovedThisTurn: true };
                                return u;
                            });
                            didSomethingThisAP = true;
                            unitTookAnActionInItsTurn = true;
                            anyActionTakenThisTurnOverall = true;
                            currentUnitState = workingUnits.find(u=> u.id === currentUnitState!.id)!;
                            if (currentUnitState.health <=0 || currentUnitState.actionPoints <= 0) break;
                            continue;
                        }
                    }
                }

                if (!didSomethingThisAP) {
                    if (unitTookAnActionInItsTurn) {
                         accumulatedMessages.push(`${currentUnitState.name} 행동 완료.`);
                    }
                    break;
                }
            }
        }

        const survivingUnitsAfterActions = workingUnits.filter(u => u.health > 0);
        const finalGameOverState = determineGameOverStatus(survivingUnitsAfterActions, prevFullState.gameOverState);
        let nextTurnNumber = prevFullState.currentTurnNumber;
        let nextAllegianceTurn = prevFullState.currentTurn;
        let finalIsCombatDelegated = prevFullState.isCombatDelegated;

        if (playerAiInterruptedMidTurn) {
            accumulatedMessages.push("플레이어 수동 제어로 전환됩니다.");
            finalIsCombatDelegated = false;
        } else if (finalGameOverState !== 'playing') {
          accumulatedMessages.push(finalGameOverState === 'victory' ? "플레이어 승리!" : "임무 실패!");
        } else {
          if (!anyActionTakenThisTurnOverall && actingUnitsOfAllegiance.length > 0) {
            accumulatedMessages.push(`${allegianceToKorean(allegianceToAct)}이(가) 특별한 행동 없이 턴을 마칩니다.`);
          }
          accumulatedMessages.push(`${allegianceToKorean(allegianceToAct)} 턴 종료.`);
          nextAllegianceTurn = allegianceToAct === Allegiance.PLAYER ? Allegiance.ENEMY : Allegiance.PLAYER;
          if (nextAllegianceTurn === Allegiance.PLAYER) {
             nextTurnNumber = prevFullState.currentTurnNumber + 1;
          }
          accumulatedMessages.push(`${allegianceToKorean(nextAllegianceTurn)} 턴 ${nextTurnNumber} 시작.`);
        }

        const finalUnitsForStateUpdate = playerAiInterruptedMidTurn
            ? workingUnits.map(u => ({ ...u, hasMovedThisTurn: allegianceToAct === Allegiance.PLAYER ? u.hasMovedThisTurn : false })) // Reset hasMovedThisTurn for enemies
            : survivingUnitsAfterActions.map(u => ({
                ...u,
                actionPoints: (finalGameOverState === 'playing' && u.allegiance === nextAllegianceTurn && !playerAiInterruptedMidTurn) ? u.maxActionPoints : u.actionPoints,
                isTargetable: false,
                hasMovedThisTurn: (finalGameOverState === 'playing' && u.allegiance === nextAllegianceTurn) ? false : u.hasMovedThisTurn, // Reset for next turn start
                temporaryEffects: (finalGameOverState === 'playing' && u.allegiance === nextAllegianceTurn) ? u.temporaryEffects.filter(eff => eff.durationTurns && eff.durationTurns > 1).map(eff => ({...eff, durationTurns: eff.durationTurns! -1})) : u.temporaryEffects, // Decrement duration or clear
                activeAbilities: (finalGameOverState === 'playing' && u.allegiance === nextAllegianceTurn && allegianceToAct === Allegiance.PLAYER ) ? // Only decrement player cooldowns at player turn start
                    u.activeAbilities.map(ab => ({...ab, cooldownRemaining: Math.max(0, ab.cooldownRemaining -1)}))
                    : u.activeAbilities,
            }));

        const newStateToCommit: CombatState = {
          ...prevFullState,
          units: finalUnitsForStateUpdate,
          grid: workingGrid,
          currentTurn: playerAiInterruptedMidTurn ? prevFullState.currentTurn : (finalGameOverState === 'playing' ? nextAllegianceTurn : prevFullState.currentTurn),
          currentTurnNumber: playerAiInterruptedMidTurn ? prevFullState.currentTurnNumber : nextTurnNumber,
          selectedUnitId: null,
          pendingAction: null,
          messageLog: [...prevFullState.messageLog, ...accumulatedMessages].slice(-10),
          damageLog: [...prevFullState.damageLog, ...accumulatedDamageLogEntries],
          gameOverState: finalGameOverState,
          isCombatDelegated: finalIsCombatDelegated,
        };

        if (newStateToCommit.gameOverState === 'playing' && !playerAiInterruptedMidTurn) {
            if (newStateToCommit.currentTurn === Allegiance.ENEMY) {
                setTimeout(() => executeAutomatedTurn(Allegiance.ENEMY), AI_ACTION_DELAY / 2);
            } else if (newStateToCommit.currentTurn === Allegiance.PLAYER && newStateToCommit.isCombatDelegated) {
                if (stopPlayerAiRequestRef.current) {
                    stopPlayerAiRequestRef.current = false;
                    setIsAiProcessing(false);
                    return {...newStateToCommit, isCombatDelegated: false, messageLog: [...newStateToCommit.messageLog, "플레이어 AI 위임 중단 (턴 종료 직전). 수동 제어합니다."].slice(-10)};
                } else {
                    setTimeout(() => executeAutomatedTurn(Allegiance.PLAYER), AI_ACTION_DELAY / 2);
                }
            } else {
                setIsAiProcessing(false);
            }
        } else {
            setIsAiProcessing(false);
        }
        return newStateToCommit;
      });
    }, AI_ACTION_DELAY);
  }, [playAttackEffect, addMessage, gridToWorld, showDamageNumber, getCoverBenefitForTarget]);


  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (combatState.gameOverState !== 'playing' || isAiProcessing || (combatState.currentTurn === Allegiance.PLAYER && combatState.isCombatDelegated)) return;
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    const selectedUnit = combatState.units.find(u => u.id === combatState.selectedUnitId);

    for (const intersect of intersects) {
      const userData = intersect.object.userData;

      if (userData && userData.type === 'tile' && combatState.pendingAction === 'move' && selectedUnit) {
        const { gridX, gridY } = userData;
        const targetTileState = combatState.grid[gridX][gridY];

        // Apply temporary move speed boost from Blitz if active
        let currentMoveSpeed = selectedUnit.moveSpeed;
        const blitzEffect = selectedUnit.temporaryEffects.find(eff => eff.sourceAbilityId === 'blitz' && eff.activeThisTurn);
        if (blitzEffect && blitzEffect.value) {
            currentMoveSpeed += blitzEffect.value;
        }
        const distance = Math.abs(selectedUnit.position.x - gridX) + Math.abs(selectedUnit.position.y - gridY);


        if (targetTileState.highlightType === 'move' && targetTileState.isWalkable && !targetTileState.isObstacle && distance <= currentMoveSpeed) {
          const oldPos = selectedUnit.position;

          setCombatState(prev => {
            const newUnits = prev.units.map(u =>
              u.id === selectedUnit.id
                ? { ...u,
                    position: { x: gridX, y: gridY },
                    actionPoints: u.actionPoints - 1,
                    hasMovedThisTurn: true, // Mark unit as moved
                    temporaryEffects: u.temporaryEffects.filter(eff => !(eff.sourceAbilityId === 'blitz' && eff.activeThisTurn)) // Consume Blitz
                  }
                : u
            );
            const newGrid = prev.grid.map((row, rIdx) => row.map((tile, cIdx) => {
              let newOccupied = tile.isOccupied;
              if (rIdx === oldPos.x && cIdx === oldPos.y) newOccupied = false;
              if (rIdx === gridX && cIdx === gridY) newOccupied = true;
              return { ...tile, isOccupied: newOccupied, highlightType: null };
            }));
            return {
              ...prev,
              units: newUnits,
              grid: newGrid,
              pendingAction: null,
              messageLog: [...prev.messageLog, `${selectedUnit.name}이(가) (${gridX}, ${gridY})(으)로 이동했습니다. 남은 행동력: ${selectedUnit.actionPoints - 1}`].slice(-10)
            };
          });
          clearAllHighlights();
          return;
        } else {
          addMessage("이동할 수 없는 타일입니다.");
          return;
        }
      } else if (userData && userData.type === 'unit' && combatState.pendingAction === 'attack' && selectedUnit) {
        const targetUnit = combatState.units.find(u => u.id === userData.id);
        if (targetUnit && targetUnit.allegiance !== selectedUnit.allegiance && targetUnit.isTargetable) {
            playAttackEffect(selectedUnit, targetUnit);

            let baseDamage = selectedUnit.attackDamage;
            // Apply Steady Aim effect if active
            const steadyAimEffect = selectedUnit.temporaryEffects.find(eff => eff.sourceAbilityId === 'steady_aim' && eff.activeThisTurn && !eff.appliedOnAttack);
            if(steadyAimEffect && steadyAimEffect.value) {
                baseDamage += steadyAimEffect.value;
                addMessage(`${selectedUnit.name}의 정조준 효과 발동! (+${steadyAimEffect.value} 피해)`);
            }

            const coverReduction = getCoverBenefitForTarget(selectedUnit, targetUnit, combatState.grid);
            let finalDamage = Math.max(0, baseDamage - coverReduction);
            let targetNewHealth = targetUnit.health - finalDamage;

            let attackMessage = `${selectedUnit.name}이(가) ${targetUnit.name}을(를) 공격하여 ${finalDamage} 피해를 입혔습니다.`;
            if (coverReduction > 0) {
                attackMessage += ` (대상 엄폐로 ${coverReduction} 감소)`;
            }
            attackMessage += ` ${targetUnit.name} 남은 체력: ${Math.max(0, targetNewHealth)}.`;

            showDamageNumber(finalDamage, targetUnit);

            setCombatState(prev => {
                let killsIncrement = 0;
                const originalTargetState = prev.units.find(t => t.id === targetUnit.id);
                if (selectedUnit.allegiance === Allegiance.PLAYER && originalTargetState && originalTargetState.allegiance === Allegiance.ENEMY && targetNewHealth <= 0 && originalTargetState.health > 0) {
                    killsIncrement = 1;
                }

                let newUnits = prev.units.map(u => {
                    if (u.id === selectedUnit.id) {
                        return {
                            ...u,
                            actionPoints: u.actionPoints - 1,
                            killsThisMission: (u.killsThisMission || 0) + killsIncrement,
                            temporaryEffects: u.temporaryEffects.map(eff =>
                                (eff.sourceAbilityId === 'steady_aim' && eff.activeThisTurn) ? {...eff, appliedOnAttack: true, activeThisTurn: false} : eff
                            ).filter(eff => eff.activeThisTurn !== false || !eff.affectsNextAttackOnly) // Remove used one-shot effects
                        };
                    }
                    if (u.id === targetUnit.id) return { ...u, health: targetNewHealth };
                    return u;
                });

                const newDamageEntry: DamageLogEntry = {
                  turn: prev.currentTurnNumber,
                  allegiance: selectedUnit.allegiance,
                  damage: finalDamage,
                  targetName: targetUnit.name,
                  timestamp: Date.now(),
                };

                let newGrid = prev.grid;
                let newMessages = [...prev.messageLog, attackMessage];

                let unitsForGameOverCheck = newUnits;
                let finalUnitsForState = newUnits;

                if (targetNewHealth <= 0) {
                    console.log("SFX: Unit_Destroyed_Explosion");
                    newMessages = [...newMessages, `${targetUnit.name}이(가) 파괴되었습니다!`];
                    const destroyedUnitPos = targetUnit.position;

                    newGrid = newGrid.map((r,rIdx) => r.map((c, cIdx) => {
                        if (c.position.x === destroyedUnitPos.x && c.position.y === destroyedUnitPos.y) {
                            return { ...c, isOccupied: false };
                        }
                        return c;
                    }));
                    // unitsForGameOverCheck is already updated with 0 health.
                    // Keep the unit in newUnits with 0 health for game over check, then filter for final state.
                    finalUnitsForState = newUnits.filter(u => u.id !== targetUnit.id || u.health > 0);
                }

                const newGameOverState = determineGameOverStatus(newUnits.map(u => u.id === targetUnit.id ? {...u, health: targetNewHealth} : u), prev.gameOverState);


                if (newGameOverState !== prev.gameOverState && newGameOverState !== 'playing') {
                    const gameOverMessage = newGameOverState === 'victory' ? "모든 적 섬멸! 플레이어 승리!" : "모든 아군 유닛 파괴! 임무 실패.";
                    newMessages = [...newMessages, gameOverMessage];
                }

                return {
                  ...prev,
                  units: finalUnitsForState,
                  grid: newGrid,
                  pendingAction: null,
                  damageLog: [...prev.damageLog, newDamageEntry],
                  messageLog: newMessages.slice(-10),
                  gameOverState: newGameOverState
                };
            });
            clearAllHighlights();
            return;
        } else if (targetUnit && targetUnit.allegiance === selectedUnit.allegiance) {
            addMessage("아군 유닛은 공격할 수 없습니다.");
            return;
        } else {
             addMessage("이 대상은 공격할 수 없습니다.");
             return;
        }
      } else if (userData && userData.type === 'unit' && combatState.pendingAction && combatState.pendingAction.startsWith('ability_')) {
          const abilityId = combatState.pendingAction.substring('ability_'.length);
          const abilityDef = ALL_ABILITIES[abilityId];
          const targetUnit = combatState.units.find(u => u.id === userData.id);

          if (selectedUnit && abilityDef && targetUnit && targetUnit.isTargetable) {
              if (abilityDef.targetType === AbilityTargetType.ENEMY_UNIT && targetUnit.allegiance === Allegiance.ENEMY) {
                  // Example: Deadeye Shot
                  if (abilityId === 'deadeye_shot') {
                      playAttackEffect(selectedUnit, targetUnit);
                      let baseDamage = selectedUnit.attackDamage;
                      const damageMultiplier = abilityDef.effects.find(e => e.type === AbilityEffectType.DAMAGE_MODIFIER)?.percentageValue || 0;
                      const bonusDamage = baseDamage * damageMultiplier;

                      const coverReduction = getCoverBenefitForTarget(selectedUnit, targetUnit, combatState.grid);
                      const finalDamage = Math.round(Math.max(0, baseDamage + bonusDamage - coverReduction));

                      let targetNewHealth = targetUnit.health - finalDamage;
                      let abilityMessage = `${selectedUnit.name}의 ${abilityDef.name} 발동! ${targetUnit.name}에게 ${finalDamage} 피해!`;
                      if (coverReduction > 0) {
                        abilityMessage += ` (대상 엄폐로 ${coverReduction} 감소)`;
                      }
                      addMessage(abilityMessage);
                      showDamageNumber(finalDamage, targetUnit);

                      setCombatState(prev => {
                          let killsIncrementAbility = 0;
                          const originalTargetStateAbility = prev.units.find(t => t.id === targetUnit.id);
                          if (selectedUnit.allegiance === Allegiance.PLAYER && originalTargetStateAbility && originalTargetStateAbility.allegiance === Allegiance.ENEMY && targetNewHealth <= 0 && originalTargetStateAbility.health > 0) {
                              killsIncrementAbility = 1;
                          }

                          const newUnits = prev.units.map(u => {
                              if (u.id === selectedUnit.id) {
                                  return {
                                      ...u,
                                      actionPoints: u.actionPoints - abilityDef.apCost,
                                      killsThisMission: (u.killsThisMission || 0) + killsIncrementAbility,
                                      activeAbilities: u.activeAbilities.map(aa => aa.abilityId === abilityId ? {...aa, cooldownRemaining: abilityDef.cooldownTurns} : aa)
                                  };
                              }
                              if (u.id === targetUnit.id) return { ...u, health: targetNewHealth };
                              return u;
                          });

                          let newGrid = prev.grid;
                          let newMessages = [...prev.messageLog]; // Message already added by addMessage
                          if (targetNewHealth <= 0) {
                              newMessages = [...newMessages, `${targetUnit.name} 파괴됨!`];
                              const destroyedUnitPos = targetUnit.position;
                              newGrid = newGrid.map((r,rIdx) => r.map((c, cIdx) => (c.position.x === destroyedUnitPos.x && c.position.y === destroyedUnitPos.y) ? { ...c, isOccupied: false } : c));
                          }
                          const finalUnitsForState = targetNewHealth <= 0 ? newUnits.filter(u => u.id !== targetUnit.id || u.health > 0) : newUnits;
                          const newGameOverState = determineGameOverStatus(newUnits.map(u => u.id === targetUnit.id ? {...u, health: targetNewHealth} : u), prev.gameOverState);

                           if (newGameOverState !== prev.gameOverState && newGameOverState !== 'playing') {
                                newMessages = [...newMessages, newGameOverState === 'victory' ? "승리!" : "패배."];
                           }

                          return {
                              ...prev,
                              units: finalUnitsForState,
                              grid: newGrid,
                              pendingAction: null,
                              messageLog: newMessages.slice(-10),
                              gameOverState: newGameOverState
                          };
                      });
                      clearAllHighlights();
                      return;
                  }
              }
          } else {
             addMessage(`능력(${abilityDef?.name})을 ${targetUnit?.name}에게 사용할 수 없습니다.`);
          }
      } else if (userData && userData.type === 'unit') {
        const unitId = userData.id;
        const unit = combatState.units.find(u => u.id === unitId);
        if (unit && unit.allegiance === Allegiance.PLAYER && combatState.currentTurn === Allegiance.PLAYER && unit.health > 0) {
          if (combatState.pendingAction) {
            addMessage(`${actionTypeToKorean(combatState.pendingAction)} 취소됨. ${unit.name} 선택됨.`);
            clearAllHighlights();
            setCombatState(prev => ({ ...prev, pendingAction: null, selectedUnitId: unitId }));
          } else {
            setCombatState(prev => ({ ...prev, selectedUnitId: unitId }));
            addMessage(`${unit.name} 선택됨.`);
          }
          return;
        } else if (unit) {
           addMessage(`${unit.name}을(를) 선택할 수 없습니다 (소속: ${allegianceToKorean(unit.allegiance)}, 현재 턴: ${allegianceToKorean(combatState.currentTurn)}, 상태: ${unit.health > 0 ? '활성' : '파괴됨'}).`);
           if (combatState.pendingAction) {
             addMessage(`${actionTypeToKorean(combatState.pendingAction)} 취소됨.`);
             clearAllHighlights();
             setCombatState(prev => ({ ...prev, pendingAction: null}));
           }
        }
        return;
      } else if (userData && userData.type === 'obstacle') {
          addMessage("장애물입니다. 통과할 수 없습니다.");
          if (combatState.pendingAction) {
            addMessage(`${actionTypeToKorean(combatState.pendingAction)} 취소됨 (장애물 클릭).`);
            clearAllHighlights();
            setCombatState(prev => ({ ...prev, pendingAction: null }));
          }
          return;
      }
    }

    if (combatState.pendingAction && intersects.length > 0 && !intersects.some(intersect => intersect.object.userData.type === 'tile' || intersect.object.userData.type === 'unit')) {
        addMessage(`${actionTypeToKorean(combatState.pendingAction)} 취소됨 (배경 클릭).`);
        clearAllHighlights();
        setCombatState(prev => ({ ...prev, pendingAction: null }));
    } else if (combatState.pendingAction && intersects.length === 0) {
        addMessage(`${actionTypeToKorean(combatState.pendingAction)} 취소됨 (배경 클릭).`);
        clearAllHighlights();
        setCombatState(prev => ({ ...prev, pendingAction: null }));
    }

  }, [combatState, addMessage, clearAllHighlights, playAttackEffect, isAiProcessing, showDamageNumber, getCoverBenefitForTarget]);


  const handleEndTurn = () => {
    if (combatState.gameOverState !== 'playing' || combatState.currentTurn !== Allegiance.PLAYER || isAiProcessing || combatState.isCombatDelegated) return;

    clearAllHighlights();
    addMessage(`플레이어 턴 ${combatState.currentTurnNumber} 종료. 적 턴 시작.`);

    setCombatState(prev => {
        const nextTurnNumber = prev.currentTurnNumber;
        return {
            ...prev,
            currentTurn: Allegiance.ENEMY,
            selectedUnitId: null,
            pendingAction: null,
            units: prev.units.map(u => {
                let updatedUnit = { ...u };
                if (u.allegiance === Allegiance.ENEMY) {
                  updatedUnit.actionPoints = u.maxActionPoints;
                }
                // Clear "activeThisTurn" temporary effects for all units
                updatedUnit.temporaryEffects = u.temporaryEffects.filter(eff => {
                    if (eff.activeThisTurn && eff.durationTurns === 1) return false; // Remove if it was for this turn only
                    if (eff.durationTurns && eff.durationTurns > 1) {
                        // This logic should ideally be at the *start* of a unit's turn or global turn for duration decrease
                        // For now, simple removal if activeThisTurn
                        return true;
                    }
                    return !eff.activeThisTurn;
                }).map(eff => eff.activeThisTurn ? {...eff, activeThisTurn: false} : eff);

                updatedUnit.isTargetable = false;
                updatedUnit.hasMovedThisTurn = false; // Reset for all units
                return updatedUnit;
            }),
            messageLog: [...prev.messageLog, `${allegianceToKorean(Allegiance.PLAYER)} 턴 ${nextTurnNumber} 종료. ${allegianceToKorean(Allegiance.ENEMY)} 턴 ${nextTurnNumber} 시작.`],
        };
    });
    executeAutomatedTurn(Allegiance.ENEMY);
  };

  const getMovementHighlightGrid = useCallback((unit: Unit, currentGrid: Tile[][]): Tile[][] => {
    const { x: startX, y: startY } = unit.position;
    let currentMoveSpeed = unit.moveSpeed;
    // Check for Blitz temporary effect
    const blitzEffect = unit.temporaryEffects.find(eff => eff.sourceAbilityId === 'blitz' && eff.activeThisTurn && eff.statToBoost === 'moveSpeed');
    if (blitzEffect && blitzEffect.value) {
        currentMoveSpeed += blitzEffect.value;
    }

    return currentGrid.map(row => row.map(tile => {
        const { x: tileX, y: tileY } = tile.position;
        const distance = Math.abs(startX - tileX) + Math.abs(startY - tileY);
        const isReachable = distance > 0 && distance <= currentMoveSpeed && tile.isWalkable && !tile.isObstacle && !tile.isOccupied;
        return { ...tile, highlightType: isReachable ? 'move' : null };
      }));
  }, []);

  const getAttackContextHighlights = useCallback((
    attackerUnit: Unit,
    allUnits: Unit[],
    currentGrid: Tile[][],
    abilityDef?: AbilityDefinition // Optional: for ability-based attacks
  ): { newGrid: Tile[][]; newUnits: Unit[] } => {
    let newGrid = currentGrid.map(row =>
      row.map(tile => ({ ...tile, highlightType: null }))
    );

    const attackRange = abilityDef?.range === undefined || abilityDef?.range === null ? attackerUnit.attackRange : abilityDef.range;
    const highlightColorType = abilityDef ? 'ability_target' : 'player_attack';

    const { x: attackerX, y: attackerY } = attackerUnit.position;
    for (let r = 0; r < GRID_SIZE_X; r++) {
      for (let c = 0; c < GRID_SIZE_Z; c++) {
        if (newGrid[r][c].isObstacle) continue;
        const distanceToAttacker = Math.abs(attackerX - r) + Math.abs(attackerY - c);
        if (distanceToAttacker > 0 && distanceToAttacker <= attackRange) {
          newGrid[r][c].highlightType = highlightColorType;
        }
      }
    }

    const newUnits = allUnits.map(u => {
      if (u.id === attackerUnit.id) return {...u, isTargetable: false};
      if (u.allegiance === attackerUnit.allegiance || u.health <= 0) {
        return { ...u, isTargetable: false };
      }
      const distance = Math.abs(attackerUnit.position.x - u.position.x) + Math.abs(attackerUnit.position.y - u.position.y);
      const canBeTargeted = distance > 0 && distance <= attackRange;
      return { ...u, isTargetable: canBeTargeted };
    });

    return { newGrid, newUnits };
  }, []);


  const handleAction = (actionType: 'move' | 'attack' | 'skip') => {
    if (combatState.gameOverState !== 'playing' || isAiProcessing || (combatState.currentTurn === Allegiance.PLAYER && combatState.isCombatDelegated)) return;
    const selectedUnit = combatState.units.find(u => u.id === combatState.selectedUnitId);
    if (!selectedUnit || selectedUnit.health <= 0) {
        if (selectedUnit) addMessage(`${selectedUnit.name}은(는) 행동할 수 없습니다 (파괴됨).`);
        else addMessage("유닛이 선택되지 않았습니다.");
        return;
    }

    if (selectedUnit.actionPoints < 1 && actionType !== 'skip') {
        addMessage(`${selectedUnit.name}에게 남은 행동력이 없습니다.`);
        return;
    }

    if (actionType === 'move') {
      if (combatState.pendingAction === 'move') {
        clearAllHighlights();
        setCombatState(prev => ({ ...prev, pendingAction: null }));
        addMessage("이동 취소됨.");
      } else {
        clearAllHighlights();
        const newGrid = getMovementHighlightGrid(selectedUnit, combatState.grid);
        const newUnits = combatState.units.map(u => ({...u, isTargetable: false}));
        setCombatState(prev => ({ ...prev, pendingAction: 'move', grid: newGrid, units: newUnits }));
        addMessage(`${selectedUnit.name} 이동 준비. 이동할 타일을 선택하세요.`);
      }
    } else if (actionType === 'attack') {
      if (combatState.pendingAction === 'attack') {
        clearAllHighlights();
        setCombatState(prev => ({ ...prev, pendingAction: null }));
        addMessage("공격 취소됨.");
      } else {
        clearAllHighlights();
        const { newGrid, newUnits } = getAttackContextHighlights(selectedUnit, combatState.units, combatState.grid);
        setCombatState(prev => ({ ...prev, pendingAction: 'attack', grid: newGrid, units: newUnits }));
        addMessage(`${selectedUnit.name} 공격 준비. 공격할 적 유닛을 선택하세요.`);
      }
    } else if (actionType === 'skip') {
        addMessage(`${selectedUnit.name}이(가) 턴을 대기합니다.`);
        clearAllHighlights();
        setCombatState(prev => ({
            ...prev,
            pendingAction: null,
            units: prev.units.map(u => u.id === selectedUnit.id ? {...u, actionPoints: 0, isTargetable: false} : {...u, isTargetable: false})
        }));
    }
  };

  const handleAbilityActionSelected = (abilityId: string) => {
    if (combatState.gameOverState !== 'playing' || isAiProcessing || (combatState.currentTurn === Allegiance.PLAYER && combatState.isCombatDelegated)) return;
    const selectedUnit = combatState.units.find(u => u.id === combatState.selectedUnitId);
    const abilityDef = ALL_ABILITIES[abilityId];

    if (!selectedUnit || !abilityDef) {
        addMessage("능력을 사용할 수 없습니다.");
        return;
    }
    if (selectedUnit.actionPoints < abilityDef.apCost) {
        addMessage("AP가 부족합니다.");
        return;
    }
    const abilityStatus = selectedUnit.activeAbilities.find(ab => ab.abilityId === abilityId);
    if (abilityStatus && abilityStatus.cooldownRemaining > 0) {
        addMessage(`${abilityDef.name}은(는) 쿨다운 중입니다 (${abilityStatus.cooldownRemaining}턴 남음).`);
        return;
    }
    if (abilityDef.requiresNoPriorMove && selectedUnit.hasMovedThisTurn) {
        addMessage(`${abilityDef.name}은(는) 이동 전에만 사용할 수 있습니다.`);
        return;
    }

    const pendingAbilityAction: PendingActionType = `ability_${abilityId}`;

    if (combatState.pendingAction === pendingAbilityAction) { // Toggle off
        clearAllHighlights();
        setCombatState(prev => ({...prev, pendingAction: null}));
        addMessage(`${abilityDef.name} 사용 취소.`);
        return;
    }

    clearAllHighlights(); // Clear previous highlights before setting new ones

    if (abilityDef.targetType === AbilityTargetType.SELF) {
        // Apply self-targeted ability immediately
        setCombatState(prev => {
            let newUnits = [...prev.units];
            let actingUnitIndex = newUnits.findIndex(u => u.id === selectedUnit.id);
            if (actingUnitIndex === -1) return prev;

            let actingUnit = {...newUnits[actingUnitIndex]};
            let messages: string[] = [];

            abilityDef.effects.forEach(effect => {
                if (effect.type === AbilityEffectType.TEMPORARY_STAT_BOOST && effect.statToBoost && effect.value) {
                    const tempEffect: TemporaryAbilityEffect = {
                        sourceAbilityId: abilityId,
                        effectType: effect.type,
                        statToBoost: effect.statToBoost,
                        value: effect.value,
                        durationTurns: effect.durationTurns || 1,
                        activeThisTurn: true,
                    };
                    actingUnit.temporaryEffects = [...actingUnit.temporaryEffects, tempEffect];
                    messages.push(`${actingUnit.name}이(가) ${abilityDef.name} 사용! (${effect.statToBoost} +${effect.value})`);
                } else if (effect.type === AbilityEffectType.DAMAGE_MODIFIER && effect.value && effect.affectsNextAttackOnly) {
                     const tempEffect: TemporaryAbilityEffect = {
                        sourceAbilityId: abilityId,
                        effectType: effect.type,
                        value: effect.value,
                        durationTurns: 1, // lasts for this turn or until next attack
                        activeThisTurn: true,
                        affectsNextAttackOnly: true,
                     };
                     actingUnit.temporaryEffects = [...actingUnit.temporaryEffects, tempEffect];
                     messages.push(`${actingUnit.name}이(가) ${abilityDef.name} 사용! (다음 공격 피해량 +${effect.value})`);
                }
            });

            actingUnit.actionPoints -= abilityDef.apCost;
            actingUnit.activeAbilities = actingUnit.activeAbilities.map(aa =>
                aa.abilityId === abilityId ? {...aa, cooldownRemaining: abilityDef.cooldownTurns } : aa
            );
            newUnits[actingUnitIndex] = actingUnit;

            return {
                ...prev,
                units: newUnits,
                pendingAction: null, // Self-target ability applied, no further targeting needed
                messageLog: [...prev.messageLog, ...messages].slice(-10)
            };
        });
    } else if (abilityDef.targetType === AbilityTargetType.ENEMY_UNIT) {
        // Setup for enemy targeting
        const { newGrid, newUnits } = getAttackContextHighlights(selectedUnit, combatState.units, combatState.grid, abilityDef);
        setCombatState(prev => ({ ...prev, pendingAction: pendingAbilityAction, grid: newGrid, units: newUnits }));
        addMessage(`${selectedUnit.name} ${abilityDef.name} 사용 준비. 대상을 선택하세요.`);
    } else {
        // TODO: Implement other target types (ALLY_UNIT, GROUND_TILE, etc.)
        addMessage(`${abilityDef.name}의 대상 유형(${abilityDef.targetType})은 아직 지원되지 않습니다.`);
        setCombatState(prev => ({...prev, pendingAction: null})); // Reset pending action
    }
  };

  const handleReturnToMenuViaCombatEnd = () => {
    // Use combatStateRef.current here, but ensure it's valid.
    // If combatStateRef.current might be null, we need a fallback or ensure this function is only callable when it's set.
    // For now, assume combatStateRef.current is valid if this function is called from GameEndModal,
    // as the modal itself is rendered based on combatState.
    const currentCombatState = combatStateRef.current;
    if (!currentCombatState) {
        console.error("[CombatView] CRITICAL: combatStateRef.current is null in handleReturnToMenuViaCombatEnd. This indicates a lifecycle issue or premature call.");
        // Fallback: Use the latest combatState from useState, though it might not be 100% in sync if called during a transition.
        // Or, consider disabling the "Return to Menu" button if the state is not ready.
        // For now, proceed with a warning and use combatState (from useState) as a less ideal fallback.
        const stateFromHook = combatState; // This is the 'combatState' from useState
        onCombatEnd(stateFromHook.gameOverState, mission, 0, initialPlayerUnitCountRef.current, []);
        return;
    }

    console.log("[CombatView] handleReturnToMenuViaCombatEnd called.");
    console.log("[CombatView]   Initial Player Unit Count Ref:", initialPlayerUnitCountRef.current);
    console.log("[CombatView]   Initial Enemy Unit Count Ref:", initialEnemyUnitCountRef.current);
    console.log("[CombatView]   Current Game Over State (from ref):", currentCombatState.gameOverState);

    const survivingPlayerUnitsRaw = currentCombatState.units.filter(u => {
        return u.allegiance === Allegiance.PLAYER && u.health > 0;
    });

    const survivingPlayerUnitStats: SurvivedUnitCombatStats[] = survivingPlayerUnitsRaw
        .map(survivor => ({
            id: survivor.id,
            templateId: survivor.templateId,
            name: survivor.name,
            experience: survivor.experience,
            rank: survivor.rank,
            equipment: survivor.equipment,
            killsThisMission: survivor.killsThisMission || 0
        }));

    const playerUnitsLost = initialPlayerUnitCountRef.current - survivingPlayerUnitStats.length;
    const enemiesDefeated = initialEnemyUnitCountRef.current - currentCombatState.units.filter(u => u.allegiance === Allegiance.ENEMY && u.health > 0).length;

    console.log(`[CombatView]   Calculated Player Units Lost: ${playerUnitsLost}`);
    console.log(`[CombatView]   Calculated Enemies Defeated: ${enemiesDefeated}`);
    console.log("[CombatView]   Surviving Player Unit Stats:", JSON.parse(JSON.stringify(survivingPlayerUnitStats)));

    onCombatEnd(currentCombatState.gameOverState, mission, enemiesDefeated, playerUnitsLost, survivingPlayerUnitStats);
  };

  const handleToggleDelegateCombat = () => {
    if (combatStateRef.current.gameOverState === 'playing' && combatStateRef.current.currentTurn === Allegiance.PLAYER) {
      const willBeDelegated = !combatStateRef.current.isCombatDelegated;

      if (!willBeDelegated && isAiProcessing) {
        stopPlayerAiRequestRef.current = true;
      }

      setCombatState(prev => ({
          ...prev,
          isCombatDelegated: willBeDelegated,
          selectedUnitId: null,
          pendingAction: null
      }));
      clearAllHighlights();

      if (willBeDelegated) {
        addMessage("플레이어 턴 자동 위임 활성화.");
        if (!isAiProcessing) {
            executeAutomatedTurn(Allegiance.PLAYER);
        }
      } else {
        addMessage("플레이어 턴 수동 제어로 전환.");
      }
    }
  };


  return (
    <div className="w-full h-full relative">
      <div
        ref={mountRef}
        className="w-full h-full"
        onClick={handleCanvasClick}
        role="application"
        aria-live="polite"
        aria-atomic="true"
      />
      <CombatUI
        selectedUnit={combatState.units.find(u => u.id === combatState.selectedUnitId && u.health > 0) || null}
        onEndTurn={handleEndTurn}
        onAction={handleAction}
        onAbilityActionSelected={handleAbilityActionSelected}
        currentTurn={combatState.currentTurn}
        messageLog={combatState.messageLog}
        onBackToMenu={handleReturnToMenuViaCombatEnd}
        isGameOver={combatState.gameOverState !== 'playing'}
        isCombatDelegated={combatState.isCombatDelegated}
        onToggleDelegateCombat={handleToggleDelegateCombat}
        isAiProcessing={isAiProcessing}
      />
      {combatState.gameOverState !== 'playing' && (
        <GameEndModal
          status={combatState.gameOverState}
          onReturnToMenu={handleReturnToMenuViaCombatEnd}
          damageLog={combatState.damageLog} 
          mission={mission}
        />
      )}
    </div>
  );
};

export default CombatView;