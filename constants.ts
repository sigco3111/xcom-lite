
import { ResearchProject, Unit, GridPosition, Mission, CraftableItem, EquipmentSlotType, RankData, UnitStatBonuses, AbilityDefinition, AbilityTargetType, AbilityEffectType } from './types';

export const GRID_SIZE_X = 32; 
export const GRID_SIZE_Z = 24; 
export const TILE_SIZE = 2; 
export const UNIT_BASE_HEIGHT = 1.5;
export const UNIT_SIZE = TILE_SIZE * 0.6;

export const PLAYER_COLOR = '#4A90E2'; 
export const ENEMY_COLOR = '#D0021B';   
export const ENEMY_DRONE_COLOR = '#4DD0E1'; 
export const ENEMY_BRUISER_COLOR = '#8E24AA'; 

export const TILE_COLOR = '#4A4A4A';    
export const OBSTACLE_TILE_COLOR = '#6B4226'; 
export const OBSTACLE_MESH_COLOR = '#5D4037'; 

export const MOVE_HIGHLIGHT_TILE_COLOR = '#F5A623'; 
export const PLAYER_ATTACK_RANGE_TILE_COLOR = '#FF6347'; 
export const ENEMY_ATTACK_RANGE_TILE_COLOR = '#9370DB'; 
export const ABILITY_TARGET_HIGHLIGHT_COLOR = '#42F5B0'; // New color for ability targeting


export const CAMERA_INITIAL_POSITION = { x: GRID_SIZE_X / 2, y: Math.max(GRID_SIZE_X, GRID_SIZE_Z) * 1.5, z: GRID_SIZE_Z * 1.3 }; 

export const LOCAL_STORAGE_KEY_TEAM_UNITS = 'xcomGenesis_teamUnits_v2'; 
export const LOCAL_STORAGE_KEY_RESEARCH_STATE = 'xcomGenesis_researchState'; 
export const LOCAL_STORAGE_KEY_GAME_DATA = 'xcomGenesis_gameData_v3'; // Incremented version for new structure

export const PLAYER_DEPLOYMENT_MAX_Z = 4; 
export const ENEMY_DEPLOYMENT_MIN_Z = GRID_SIZE_Z - 5; 


export const PLAYER_START_POSITIONS: GridPosition[] = [
  { x: Math.floor(GRID_SIZE_X / 2) - 3, y: 1 },
  { x: Math.floor(GRID_SIZE_X / 2) - 1, y: 0 },
  { x: Math.floor(GRID_SIZE_X / 2) + 1, y: 1 },
  { x: Math.floor(GRID_SIZE_X / 2) - 2, y: 2 },
  { x: Math.floor(GRID_SIZE_X / 2),     y: 2 },
  { x: Math.floor(GRID_SIZE_X / 2) + 2, y: 2 },
];

export const OBSTACLE_HEIGHT = TILE_SIZE * 1.5; 
export const NUM_RANDOM_OBSTACLES = Math.floor(GRID_SIZE_X * GRID_SIZE_Z * (0.1 * 2 / 3)); 

// --- Cover System ---
export const HALF_COVER_DAMAGE_REDUCTION = 10; // 피해량 10 감소

// --- Abilities ---
export const ALL_ABILITIES: Record<string, AbilityDefinition> = {
  'steady_aim': {
    id: 'steady_aim',
    name: '정조준',
    description: '1 AP를 소모하여 다음 공격의 피해량을 +10 증가시킵니다. 이 턴에만 유효합니다.',
    icon: '🎯',
    apCost: 1,
    cooldownTurns: 2,
    targetType: AbilityTargetType.SELF,
    effects: [
      { type: AbilityEffectType.DAMAGE_MODIFIER, value: 10, affectsNextAttackOnly: true }
    ],
  },
  'deadeye_shot': {
    id: 'deadeye_shot',
    name: '필살 저격',
    description: '2 AP를 소모하여 강력한 저격으로 공격 피해량을 +50% 증가시킵니다. 이 능력을 사용하면 해당 턴에 이동할 수 없습니다 (또는 이미 이동 완료).',
    icon: '💥',
    apCost: 2,
    cooldownTurns: 3,
    targetType: AbilityTargetType.ENEMY_UNIT, // Range will be weapon range
    effects: [
      { type: AbilityEffectType.DAMAGE_MODIFIER, percentageValue: 0.5 }
    ],
    requiresNoPriorMove: true, // Custom flag to check in logic
  },
  'blitz': {
    id: 'blitz',
    name: '기습 공격',
    description: '1 AP를 소모하여 이번 턴에 이동 속도를 +2 증가시킵니다. 이동 전에 사용해야 합니다.',
    icon: '💨',
    apCost: 1,
    cooldownTurns: 3,
    targetType: AbilityTargetType.SELF,
    effects: [
      { type: AbilityEffectType.TEMPORARY_STAT_BOOST, statToBoost: 'moveSpeed', value: 2, durationTurns: 1 } // duration 1 means current turn
    ],
  },
  'suppressive_fire': {
    id: 'suppressive_fire',
    name: '제압 사격',
    description: '지정된 적에게 제압 사격을 가하여 해당 적의 다음 턴 행동을 방해합니다. (효과: 대상 다음 턴 AP -1. 구현 예정)',
    icon: '💨🎯',
    apCost: 2,
    cooldownTurns: 3,
    targetType: AbilityTargetType.ENEMY_UNIT,
    effects: [] // Conceptual, actual debuff logic handled in combat system
  }
};


// Base templates for units. Progression fields (experience, rank, equipment) are handled in SavedUnitInfo
// Added baseAbilities field
export const UNIT_TEMPLATES: Record<string, Omit<Unit, 'id' | 'allegiance' | 'position' | 'color' | 'size' | 'mesh' | 'isTargetable' | 'experience' | 'rank' | 'equipment' | 'activeAbilities' | 'temporaryEffects' | 'hasMovedThisTurn'>> = {
  'rookie': {
    templateId: 'rookie',
    name: '신병',
    health: 80, maxHealth: 80,
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 5, 
    attackRange: 4, 
    attackDamage: 25,
    baseAbilities: ['steady_aim'], 
  },
  'sniper': {
    templateId: 'sniper',
    name: '저격수',
    health: 60, maxHealth: 60, // Decreased from 70
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 2, // Decreased from 3
    attackRange: 10,  // Increased from 8
    attackDamage: 40,
    baseAbilities: ['deadeye_shot'], 
  },
  'assault': {
    templateId: 'assault',
    name: '돌격병',
    health: 130, maxHealth: 130, // Increased from 120
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 6, // Increased from 5
    attackRange: 2,
    attackDamage: 30,
    baseAbilities: ['blitz'], 
  },
  'heavy': { 
    templateId: 'heavy',
    name: '중화기병',
    health: 170, maxHealth: 170, // Increased from 150
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 3,
    attackRange: 5,
    attackDamage: 55, 
    baseAbilities: ['suppressive_fire'], // Added suppressive_fire
  },
  'enemy_grunt': {
    templateId: 'enemy_grunt',
    name: '외계인 그런트',
    health: 80, maxHealth: 80,
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 3,
    attackRange: 4,
    attackDamage: 25,
    baseAbilities: [],
  },
  'enemy_drone': {
    templateId: 'enemy_drone',
    name: '외계인 드론',
    health: 60, maxHealth: 60,
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 5,
    attackRange: 5,
    attackDamage: 20,
    baseAbilities: [],
  },
  'enemy_bruiser': {
    templateId: 'enemy_bruiser',
    name: '외계인 브루저',
    health: 150, maxHealth: 150,
    actionPoints: 2, maxActionPoints: 2,
    moveSpeed: 3,
    attackRange: 1,
    attackDamage: 40,
    baseAbilities: [],
  }
};

// Soldier Progression
// xpToNextRank is XP needed from the start of the current rank to reach the next.
export const RANKS: RankData[] = [
  { name: '신병', xpToNextRank: 100, statBonuses: {} }, // Base rank
  { name: '일병', xpToNextRank: 150, statBonuses: { maxHealth: 5, attackDamage: 2 } },
  { name: '상병', xpToNextRank: 200, statBonuses: { maxHealth: 10, attackDamage: 3, moveSpeed: 1 } },
  { name: '병장', xpToNextRank: 300, statBonuses: { maxHealth: 15, attackDamage: 5, attackRange: 1 } },
  { name: '하사', xpToNextRank: 400, statBonuses: { maxHealth: 20, attackDamage: 7, maxActionPoints: 1 } },
  { name: '중사', xpToNextRank: 500, statBonuses: { maxHealth: 25, attackDamage: 8, moveSpeed: 1, attackRange: 1 } },
  { name: '상사', xpToNextRank: null, statBonuses: { maxHealth: 30, attackDamage: 10, maxActionPoints: 1, moveSpeed: 1 } }, // Max rank
];

export const XP_REWARDS = {
  PER_MISSION_VICTORY: 75, 
  PER_KILL: 25, 
};


// --- Strategic Layer Constants ---
export const INITIAL_SUPPLIES = 350; 
export const INITIAL_ALLOY_FRAGMENTS = 50; 
export const ALLOY_FRAGMENTS_RESOURCE_ID = 'alloy_fragments'; 

export const MISSION_GENERATION_INTERVAL = 60000; 
export const MAX_ACTIVE_MISSIONS = 5;
export const MIN_MISSION_DIFFICULTY = 1;
export const MAX_MISSION_DIFFICULTY = 5;

export const MISSION_NAME_PREFIXES = ["Operation", "Project", "Task Force", "Codename"];
export const MISSION_NAME_SUFFIXES = ["Nightfall", "Dawnbringer", "Stormclaw", "Iron Veil", "Silent Ghost", "Desert Viper"];


// --- Research System Constants ---
export const RESEARCH_PROGRESS_PER_ADVANCE = 1;

export const ALL_RESEARCH_PROJECTS: { [id: string]: ResearchProject } = {
  // --- TIER 0 (Existing or very early) ---
  'alien_biology': {
    id: 'alien_biology',
    name: '외계 생물학 기초',
    description: '포획하거나 회수한 외계 생명체의 기본 구조와 생리 기능을 연구합니다. 이는 모든 외계인 관련 연구의 기초가 됩니다.',
    cost: 75,
    duration: 5,
    unlocks: ['그런트 부검 연구 가능', '드론 분석 연구 가능'],
    prerequisites: [],
    icon: '🧬',
  },
  'basic_armor': {
    id: 'basic_armor',
    name: '기본 장갑 개선',
    description: '분대원의 생존성을 향상시키기 위해 표준 갑옷 도금의 내구성을 높입니다.',
    cost: 80,
    duration: 5,
    unlocks: ['모든 유닛의 최대 체력 +10', 'reinforced_armor_plating_item', '전술 조끼 개발 연구 가능'],
    prerequisites: [],
    icon: '🛡️',
  },
  'improved_weapons': {
    id: 'improved_weapons',
    name: '향상된 무기 보정',
    description: '표준 무기의 조준 시스템 및 탄약을 개선하여 전투 효율성을 높입니다.',
    cost: 100,
    duration: 8,
    unlocks: ['모든 유닛의 공격력 +5', 'laser_sight_mod_item', '레이저 무기 연구 가능', '모듈식 무기 설계 연구 가능'],
    prerequisites: [],
    icon: '⚔️',
  },
  'advanced_medkits': {
    id: 'advanced_medkits',
    name: '고급 구급상자',
    description: '전장에서 더 효과적인 치료를 제공하는 향상된 구급상자를 개발합니다.',
    cost: 80,
    duration: 4,
    unlocks: ['advanced_medkit_item', '전투 자극제 강화 연구 가능', '의료용 나노로봇 연구 가능'],
    prerequisites: [],
    icon: '🩹',
  },
  'enhanced_mobility_servos': {
    id: 'enhanced_mobility_servos',
    name: '강화 기동 서보',
    description: '유닛의 이동 시스템을 개선하여 전술적 유연성을 향상시킵니다.',
    cost: 120,
    duration: 6,
    unlocks: ['신병, 돌격병 이동 속도 +1', 'tactical_boots_item', '강화 외골격 시스템 연구 가능'],
    prerequisites: [],
    icon: '🏃',
  },
  'xcom_training_protocol': {
    id: 'xcom_training_protocol',
    name: 'XCOM 훈련 프로토콜',
    description: '신병 모집 및 훈련 체계를 표준화하여 분대원의 성장 효율을 높입니다.',
    cost: 100,
    duration: 10,
    unlocks: ['신병 경험치 획득량 +10%', '분대 규모 확장 I 연구 가능'],
    prerequisites: [],
    icon: '🎓',
  },

  // --- TIER 1 ---
  'laser_weaponry': {
    id: 'laser_weaponry', name: '레이저 무기 연구', description: '집속 에너지 광선을 활용하는 개인 화기를 개발합니다. 외계인 합금에 더 효과적일 수 있습니다.',
    cost: 120, duration: 6, icon: '🔫💡',
    prerequisites: ['improved_weapons', 'alien_biology'],
    unlocks: ['laser_rifle_item', '플라즈마 무기 원리 연구 가능', '가우스 무기 개발 연구 가능', '고급 레이저 조준 연구 가능'],
  },
  'alloy_plating': {
    id: 'alloy_plating', name: '외계 합금 도금', description: '회수한 외계 합금의 특성을 분석하여 병사들의 방어구를 강화합니다.',
    cost: 150, duration: 7, icon: '🛡️🔩',
    prerequisites: ['alien_biology', 'basic_armor'],
    unlocks: ['alloy_combat_suit_mk1_item', '강화 외골격 시스템 연구 가능', '제작소 프로젝트 가동 연구 가능', '형상기억 합금 장갑 연구 가능'],
  },
  'grunt_autopsy': {
    id: 'grunt_autopsy', name: '그런트 부검', description: '가장 흔한 외계인 보병인 그런트의 생체 구조를 분석하여 약점을 파악합니다.',
    cost: 60, duration: 3, icon: '💀🔬',
    prerequisites: ['alien_biology'],
    unlocks: ['그런트 상대 명중률 +5%', '브루저 부검 연구 가능', '외계 사이오닉 기초 연구 가능'],
  },
  'drone_analysis': {
    id: 'drone_analysis', name: '드론 분석', description: '파괴된 적 드론을 분석하여 작동 원리와 약점을 연구합니다.',
    cost: 70, duration: 4, icon: '🤖🔧',
    prerequisites: ['alien_biology'],
    unlocks: ['drone_disruptor_item', 'AI 조준 보조 시스템 연구 가능', '의료용 나노로봇 연구 가능', '스텔스 시스템 연구 가능'],
  },
  'advanced_grenades': {
    id: 'advanced_grenades', name: '고급 수류탄', description: '표준 수류탄의 폭발력과 효과를 증대시키고 새로운 유형의 수류탄을 개발합니다.',
    cost: 90, duration: 5, icon: '💣✨',
    prerequisites: ['improved_weapons'],
    unlocks: ['frag_grenade_mk2_item', 'flashbang_mk2_item', 'EMP 무기 연구 가능'],
  },
  'tactical_vests': {
    id: 'tactical_vests', name: '전술 조끼 개발', description: '병사들의 생존성과 장비 휴대 능력을 향상시키는 다양한 종류의 전술 조끼를 설계합니다.',
    cost: 75, duration: 4, icon: '🧥➕',
    prerequisites: ['basic_armor'],
    unlocks: ['tactical_vest_item'],
  },
  'combat_stimulants': {
    id: 'combat_stimulants', name: '전투 자극제 강화', description: '기존 전투 자극제의 효과를 증대시키고 부작용을 줄이는 방안을 연구합니다.',
    cost: 85, duration: 5, icon: '💉⚡⚡',
    prerequisites: ['advanced_medkits', 'alien_biology'],
    unlocks: ['stim_pack_mk2_item'],
  },
  'modular_weapons': {
      id: 'modular_weapons', name: '모듈식 무기 설계', description: '무기 시스템을 모듈화하여 다양한 부착물을 통한 성능 강화를 용이하게 합니다.',
      cost: 110, duration: 6, icon: '🔧🔫',
      prerequisites: ['improved_weapons'],
      unlocks: ['모든 무기 보조장비 슬롯 +1 (개념적)', '고급 탄도학 연구 가능', 'high_capacity_scope_item']
  },

  // --- TIER 2 ---
  'plasma_weaponry': {
    id: 'plasma_weaponry', name: '플라즈마 무기 원리', description: '고온의 플라즈마를 발사하는 무기 체계를 연구합니다. 강력한 파괴력을 지닙니다.',
    cost: 200, duration: 8, icon: '🔫🔥',
    prerequisites: ['laser_weaponry', 'alloy_plating'],
    unlocks: ['plasma_rifle_prototype_item', '플라즈마 중화기 연구 가능'],
  },
  'gauss_weaponry': {
    id: 'gauss_weaponry', name: '가우스 무기 개발', description: '전자기력을 이용하여 탄자를 초고속으로 발사하는 가우스 병기를 개발합니다.',
    cost: 180, duration: 7, icon: '🔫🧲',
    prerequisites: ['laser_weaponry', 'modular_weapons'],
    unlocks: ['gauss_rifle_item'],
  },
  'bruiser_autopsy': {
    id: 'bruiser_autopsy', name: '브루저 부검', description: '강인한 외계인 브루저의 생체 조직과 방어 기제를 분석합니다.',
    cost: 100, duration: 5, icon: '💪🔬',
    prerequisites: ['grunt_autopsy'],
    unlocks: ['bruiser_countermeasure_mod_item', '외계인 근력 강화 +5% (개념적)'],
  },
  'powered_armor_systems': {
    id: 'powered_armor_systems', name: '강화 외골격 시스템', description: '병사의 전투 능력을 극대화하는 동력형 강화복 시스템을 연구합니다.',
    cost: 250, duration: 10, icon: '🦾🔋',
    prerequisites: ['alloy_plating', 'enhanced_mobility_servos'],
    unlocks: ['power_armor_suit_item', '사이버네틱 강화 연구 가능', '플라즈마 중화기 연구 가능'],
  },
  'alien_psionics_basics': {
    id: 'alien_psionics_basics', name: '외계 사이오닉 기초', description: '일부 외계 생명체가 사용하는 정신 능력의 기본 원리를 탐구합니다.',
    cost: 150, duration: 8, icon: '🧠✨',
    prerequisites: ['alien_biology', 'grunt_autopsy'],
    unlocks: ['psionic_dampener_item', '고급 사이오닉 훈련 연구 가능'],
  },
  'advanced_targeting_ai': {
    id: 'advanced_targeting_ai', name: 'AI 조준 보조 시스템', description: '인공지능을 활용하여 병사의 조준 정확도를 획기적으로 향상시키는 시스템을 개발합니다.',
    cost: 160, duration: 7, icon: '🤖🎯',
    prerequisites: ['drone_analysis', 'modular_weapons'],
    unlocks: ['ai_targeting_module_item'],
  },
  'squad_size_i': {
    id: 'squad_size_i', name: '분대 규모 확장 I', description: '지휘 체계 및 병참 지원을 개선하여 전투에 투입 가능한 분대원 수를 늘립니다.',
    cost: 200, duration: 10, icon: '👨‍👩‍👧‍👦➕',
    prerequisites: ['xcom_training_protocol'],
    unlocks: ['최대 분대원 수 +1 (개념적)', '분대 규모 확장 II 연구 가능'],
  },
  'foundry_projects': {
    id: 'foundry_projects', name: '제작소 프로젝트 가동', description: '획득한 자원과 기술을 바탕으로 다양한 장비 개량 및 특수 프로젝트를 진행할 수 있는 제작소 기능을 활성화합니다.',
    cost: 100, duration: 5, icon: '🏭⚙️',
    prerequisites: ['alloy_plating'],
    unlocks: ['다양한 아이템 업그레이드 가능 (개념적)', '글로벌 스캐너 네트워크 연구 가능'],
  },
   'medkit_nanites': {
    id: 'medkit_nanites', name: '의료용 나노로봇', description: '나노 기술을 활용하여 부상 치료 효율을 극대화하는 차세대 의료 시스템을 연구합니다.',
    cost: 130, duration: 6, icon: '🩹🔬',
    prerequisites: ['advanced_medkits', 'drone_analysis'],
    unlocks: ['nano_medkit_item', '사이버네틱 강화 연구 가능'],
  },
  'advanced_ballistics': {
    id: 'advanced_ballistics', name: '고급 탄도학', description: '탄약의 성능을 극대화하고 정밀 조준 장비를 개발하여 화기의 효율성을 높입니다.',
    cost: 140, duration: 7, icon: '🎯⚙️',
    prerequisites: ['modular_weapons'],
    unlocks: ['precision_scope_mk2_item', 'ap_rounds_item'],
  },
  'emp_weaponry': {
    id: 'emp_weaponry', name: 'EMP 무기 연구', description: '강력한 전자기 펄스를 생성하여 기계 유닛을 무력화시키는 기술을 개발합니다.',
    cost: 120, duration: 6, icon: '💣💨⚡',
    prerequisites: ['advanced_grenades', 'drone_analysis'],
    unlocks: ['emp_grenade_item'],
  },

  // --- TIER 3 ---
  'heavy_plasma': {
    id: 'heavy_plasma', name: '플라즈마 중화기', description: '플라즈마 기술을 응용한 중화기를 개발하여 강력한 광역 제압 능력을 확보합니다.',
    cost: 280, duration: 9, icon: '💣🔥',
    prerequisites: ['plasma_weaponry', 'powered_armor_systems'],
    unlocks: ['heavy_plasma_gun_item'],
  },
  'advanced_laser_targeting': {
    id: 'advanced_laser_targeting', name: '고급 레이저 조준', description: '레이저 무기의 집속률과 유효 사거리를 증대시키는 정밀 조준 시스템을 개발합니다.',
    cost: 190, duration: 8, icon: '🔫💡✨',
    prerequisites: ['laser_weaponry'],
    unlocks: ['레이저 무기 공격력 +15%', '레이저 무기 사거리 +1 (개념적)'],
  },
  'stealth_systems': {
    id: 'stealth_systems', name: '스텔스 시스템 연구', description: '적의 감지망을 회피할 수 있는 개인 은폐 기술을 연구합니다.',
    cost: 220, duration: 9, icon: '👻💨',
    prerequisites: ['drone_analysis', 'alloy_plating'],
    unlocks: ['stealth_field_generator_item'],
  },
  'cybernetic_augmentation': {
    id: 'cybernetic_augmentation', name: '사이버네틱 강화 연구', description: '병사의 신체 능력을 기계적으로 강화하는 사이버네틱 임플란트 기술을 연구합니다.',
    cost: 300, duration: 12, icon: '🦾✨',
    prerequisites: ['powered_armor_systems', 'medkit_nanites'],
    unlocks: ['기본 사이버네틱 강화 슬롯 해금 (개념적)', '생체 전투복 연구 가능'],
  },
  'advanced_psionic_training': {
    id: 'advanced_psionic_training', name: '고급 사이오닉 훈련', description: '사이오닉 잠재력이 있는 병사들을 위한 심화 훈련 프로그램을 개발하여 강력한 정신 능력을 발현시킵니다.',
    cost: 250, duration: 10, icon: '🧠💫',
    prerequisites: ['alien_psionics_basics'],
    unlocks: ['고급 사이오닉 능력 해금 (개념적)', '사이오닉 증폭기 아이템 연구 가능'],
  },
  'squad_size_ii': {
    id: 'squad_size_ii', name: '분대 규모 확장 II', description: '정예 지휘관 양성 및 보급 체계 최적화를 통해 최대 분대원 수를 추가로 늘립니다.',
    cost: 350, duration: 12, icon: '👨‍👩‍👧‍👦➕➕',
    prerequisites: ['squad_size_i', 'xcom_training_protocol'],
    unlocks: ['최대 분대원 수 +1 (개념적, 총 +2)'],
  },
   'adaptive_armor_alloys': {
    id: 'adaptive_armor_alloys', name: '형상기억 합금 장갑', description: '외부 충격에 반응하여 일시적으로 방어력이 강화되는 특수 합금 장갑을 개발합니다.',
    cost: 270, duration: 9, icon: '🛡️🔄',
    prerequisites: ['alloy_plating', 'powered_armor_systems'],
    unlocks: ['모든 방어구에 확률적 피해 완전 방어 추가 (개념적)'],
  },
  'global_scanner_network': {
    id: 'global_scanner_network', name: '글로벌 스캐너 네트워크', description: '전 지구적 감시망을 구축하여 외계인 활동을 보다 효과적으로 탐지하고 임무 기회를 확보합니다.',
    cost: 300, duration: 10, icon: '📡🌍',
    prerequisites: ['drone_analysis', 'foundry_projects'],
    unlocks: ['미션 발견 확률 증가 (개념적)', '더 많은 지역 정보 제공 (개념적)']
  },
};


// --- Engineering/Crafting Constants ---
// Effects strings are simplified for easier parsing. Complex effects like "관통 효과" are currently descriptive.
export const ALL_CRAFTABLE_ITEMS: Record<string, CraftableItem> = {
  // Existing Items
  'advanced_medkit_item': {
    id: 'advanced_medkit_item',
    name: '고급 구급상자',
    description: '향상된 나노 기술을 사용하여 더 많은 체력을 회복시키는 구급상자입니다. (사용 시 효과)',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['사용 시 체력 +50 회복'], // Actual healing effect needs in-combat action
    cost: [
      { resourceId: 'supplies', amount: 40 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 5 }
    ],
    requiredResearchId: 'advanced_medkits',
    icon: '➕🩹'
  },
  'laser_sight_mod_item': {
    id: 'laser_sight_mod_item',
    name: '레이저 조준기',
    description: '무기에 부착하여 명중률을 보정하는 장치입니다. (구현 예정: 명중률 +10%)',
    type: 'weapon_mod',
    slotType: 'weaponMod',
    effects: ['명중률 +10%'], // 명중률 시스템 필요
    cost: [
      { resourceId: 'supplies', amount: 60 }, 
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 5 } 
    ],
    requiredResearchId: 'improved_weapons',
    icon: '🎯🔴'
  },
  'reinforced_armor_plating_item': {
    id: 'reinforced_armor_plating_item',
    name: '강화 전투복 Mk1',
    description: '기존 전투복에 특수 합금판을 덧대어 방어력을 강화합니다.',
    type: 'armor_mod',
    slotType: 'armorMod',
    effects: ['최대 체력 +15'],
    cost: [
      { resourceId: 'supplies', amount: 100 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 15 }
    ],
    requiredResearchId: 'basic_armor', // This unlock string in basic_armor matches this item's ID
    icon: '➕🛡️'
  },
  'plasma_rifle_prototype_item': {
    id: 'plasma_rifle_prototype_item',
    name: '플라즈마 소총 프로토타입',
    description: '강력한 플라즈마 투사체를 발사하는 실험용 소총입니다. 불안정할 수 있습니다.',
    type: 'special_weapon',
    slotType: 'primaryWeapon',
    effects: ['공격력 +23', '관통 효과'], 
    cost: [
      { resourceId: 'supplies', amount: 250 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 30 }
    ],
    requiredResearchId: 'plasma_weaponry', // Updated from 'plasma_principles'
    icon: '🔫🔥'
  },
   'tactical_boots_item': {
    id: 'tactical_boots_item',
    name: '전술화 부츠',
    description: '경량화된 소재와 강화된 서보 모터로 기동성을 향상시키는 군화입니다.',
    type: 'armor_mod', 
    slotType: 'armorMod', 
    effects: ['이동 속도 +1'],
    cost: [
      { resourceId: 'supplies', amount: 60 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 8 }
    ],
    requiredResearchId: 'enhanced_mobility_servos', // This unlock string in enhanced_mobility_servos matches
    icon: '👟💨'
  },
   'high_capacity_scope_item': {
    id: 'high_capacity_scope_item',
    name: '고성능 스코프',
    description: '정밀 가공된 렌즈와 향상된 거리 측정기로 유효 사거리를 늘려줍니다.',
    type: 'weapon_mod',
    slotType: 'weaponMod',
    effects: ['공격 범위 +1'],
    cost: [
      { resourceId: 'supplies', amount: 90 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 12 }
    ],
    requiredResearchId: 'modular_weapons', // Changed from 'extended_range_scanners'
    icon: '🔭'
  },
  'stim_pack_item': { // This is the basic stim_pack, advanced_medkits unlocks advanced_medkit_item AND stim_pack_item (this one)
    id: 'stim_pack_item',
    name: '전투 자극제',
    description: '일시적으로 행동력을 증가시키는 약물입니다. 사용 후 부작용이 있을 수 있습니다. (사용 시 효과)',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['사용 시 행동력 +1 (1턴 지속)'], // 사용 시 효과 필요
    cost: [
      { resourceId: 'supplies', amount: 50 },
      { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 10 }
    ],
    requiredResearchId: 'advanced_medkits', 
    icon: '💉⚡'
  },
  'precision_scope_mk2_item': {
    id: 'precision_scope_mk2_item',
    name: '정밀 조준경 Mk2',
    description: '첨단 센서와 안정화 장치를 통해 명중률을 크게 향상시킵니다.',
    type: 'weapon_mod',
    slotType: 'weaponMod',
    effects: ['명중률 +15%'], // Needs accuracy system
    cost: [{ resourceId: 'supplies', amount: 100 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 20 }],
    requiredResearchId: 'advanced_ballistics',
    icon: '🔭✨'
  },
  'ap_rounds_item': {
    id: 'ap_rounds_item',
    name: '철갑탄',
    description: '특수 합금 탄두를 사용하여 적의 장갑을 관통하는 능력을 부여합니다.',
    type: 'weapon_mod', 
    slotType: 'weaponMod',
    effects: ['공격 시 장갑 일부 무시 (관통 효과)'], 
    cost: [{ resourceId: 'supplies', amount: 90 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 25 }],
    requiredResearchId: 'advanced_ballistics',
    icon: ' AmmoPiercing' 
  },
  'gauss_rifle_item': {
    id: 'gauss_rifle_item',
    name: '가우스 소총',
    description: '강력한 전자기력으로 탄자를 가속시켜 발사하는 정밀 소총입니다.',
    type: 'special_weapon',
    slotType: 'primaryWeapon',
    effects: ['공격력 +25', '명중률 +5%'],
    cost: [{ resourceId: 'supplies', amount: 300 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 40 }],
    requiredResearchId: 'gauss_weaponry',
    icon: '🔫🧲'
  },
  'laser_rifle_item': {
    id: 'laser_rifle_item',
    name: '레이저 소총',
    description: '고출력 레이저를 발사하여 대상을 태워버립니다. 탄약이 필요 없습니다.',
    type: 'special_weapon',
    slotType: 'primaryWeapon',
    effects: ['공격력 +18', '기계 유닛에 추가 피해'], 
    cost: [{ resourceId: 'supplies', amount: 280 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 35 }],
    requiredResearchId: 'laser_weaponry',
    icon: '🔫💡'
  },
  'heavy_plasma_gun_item': {
    id: 'heavy_plasma_gun_item',
    name: '플라즈마 중화기',
    description: '플라즈마를 압축하여 발사하는 중화기입니다. 넓은 범위에 강력한 피해를 입힙니다.',
    type: 'special_weapon',
    slotType: 'primaryWeapon', 
    effects: ['공격력 +40', '범위 공격 가능 (특수 능력)'], 
    cost: [{ resourceId: 'supplies', amount: 450 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 60 }],
    requiredResearchId: 'heavy_plasma',
    icon: '💣🔥'
  },
  'emp_grenade_item': {
    id: 'emp_grenade_item',
    name: 'EMP 수류탄',
    description: '강력한 전자기 펄스를 방출하여 기계 유닛을 일시적으로 마비시키거나 큰 피해를 줍니다.',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['기계 유닛 마비 (1턴)', '기계 유닛에 50 피해'], 
    cost: [{ resourceId: 'supplies', amount: 60 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 15 }],
    requiredResearchId: 'emp_weaponry', // This now has a dedicated research project
    icon: '💣💨⚡'
  },
  'frag_grenade_mk2_item': {
    id: 'frag_grenade_mk2_item',
    name: '고폭 수류탄 Mk2',
    description: '개량된 폭약과 파편 설계를 통해 더욱 넓은 범위에 강력한 피해를 주는 수류탄입니다.',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['범위 피해 +30% 증가'], 
    cost: [{ resourceId: 'supplies', amount: 70 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 10 }],
    requiredResearchId: 'advanced_grenades',
    icon: '💣💥✨'
  },
  'flashbang_mk2_item': {
    id: 'flashbang_mk2_item',
    name: '섬광 수류탄 Mk2',
    description: '강화된 섬광과 음향 효과로 적의 명중률과 행동력을 더욱 효과적으로 감소시킵니다.',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['적 명중률 -30, 행동력 -1 (2턴)'], 
    cost: [{ resourceId: 'supplies', amount: 50 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 5 }],
    requiredResearchId: 'advanced_grenades',
    icon: '✨🔊💣'
  },
  'alloy_combat_suit_mk1_item': {
    id: 'alloy_combat_suit_mk1_item',
    name: '합금 전투복 Mk1',
    description: '외계 합금으로 제작되어 기존 전투복보다 훨씬 뛰어난 방어력과 내구성을 제공합니다.',
    type: 'armor_mod', 
    slotType: 'armorMod', 
    effects: ['최대 체력 +30', '피해 감소 +5'], 
    cost: [{ resourceId: 'supplies', amount: 200 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 30 }],
    requiredResearchId: 'alloy_plating',
    icon: '🛡️🔩✨'
  },
  'power_armor_suit_item': {
    id: 'power_armor_suit_item',
    name: '강화 외골격 슈트',
    description: '동력원을 사용하는 중장갑으로, 최고의 방어력과 함께 추가적인 능력을 제공할 수 있습니다.',
    type: 'armor_mod', 
    slotType: 'armorMod',
    effects: ['최대 체력 +50', '피해 감소 +10', '이동 속도 -1'],
    cost: [{ resourceId: 'supplies', amount: 350 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 50 }],
    requiredResearchId: 'powered_armor_systems',
    icon: '🦾🛡️🔋'
  },
  'tactical_vest_item': {
    id: 'tactical_vest_item',
    name: '전술 조끼',
    description: '추가적인 방호력과 수납공간을 제공하여 병사의 생존성과 임무 수행 능력을 향상시킵니다.',
    type: 'armor_mod',
    slotType: 'armorMod',
    effects: ['최대 체력 +10', '회피율 +5% (개념적)'],
    cost: [{ resourceId: 'supplies', amount: 80 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 10 }],
    requiredResearchId: 'tactical_vests',
    icon: '🧥➕'
  },
  'nano_medkit_item': {
    id: 'nano_medkit_item',
    name: '나노 구급상자',
    description: '의료용 나노봇을 사용하여 치명적인 부상도 신속하게 치료하고 추가적인 생명력 재생 효과를 부여합니다.',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['사용 시 체력 +75 회복', '2턴간 턴당 체력 +10 회복'], 
    cost: [{ resourceId: 'supplies', amount: 100 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 20 }],
    requiredResearchId: 'medkit_nanites',
    icon: '🩹🔬✨'
  },
  'stim_pack_mk2_item': {
    id: 'stim_pack_mk2_item',
    name: '전투 자극제 Mk2',
    description: '강화된 화학 자극제로, 일시적으로 행동력과 이동 속도를 대폭 증가시킵니다. 부작용에 주의해야 합니다.',
    type: 'consumable',
    slotType: 'utilitySlot1',
    effects: ['사용 시 행동력 +2, 이동 속도 +2 (1턴 지속)'], 
    cost: [{ resourceId: 'supplies', amount: 80 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 15 }],
    requiredResearchId: 'combat_stimulants',
    icon: '💉⚡⚡'
  },
  'drone_disruptor_item': {
    id: 'drone_disruptor_item',
    name: '드론 교란기',
    description: '특정 주파수를 방출하여 주변 적 드론의 조준 시스템과 기동성을 방해합니다.',
    type: 'utility',
    slotType: 'utilitySlot1', 
    effects: ['주변 적 드론 명중률 -10% (지속 효과)'], 
    cost: [{ resourceId: 'supplies', amount: 120 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 20 }],
    requiredResearchId: 'drone_analysis',
    icon: '📡🤖❌'
  },
  'bruiser_countermeasure_mod_item': {
    id: 'bruiser_countermeasure_mod_item',
    name: '브루저 대응 장갑재',
    description: '브루저의 강력한 근접 공격에 대한 저항력을 높이는 특수 장갑 부착물입니다.',
    type: 'armor_mod',
    slotType: 'armorMod',
    effects: ['근접 공격으로 받는 피해 -20%'], 
    cost: [{ resourceId: 'supplies', amount: 150 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 25 }],
    requiredResearchId: 'bruiser_autopsy',
    icon: '🛡️💪❌'
  },
  'psionic_dampener_item': {
    id: 'psionic_dampener_item',
    name: '사이오닉 억제기',
    description: '외계인의 정신 공격으로부터 병사를 보호하는 휴대용 장치입니다.',
    type: 'utility',
    slotType: 'utilitySlot1',
    effects: ['사이오닉 공격 저항력 증가 (개념적)'],
    cost: [{ resourceId: 'supplies', amount: 180 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 30 }],
    requiredResearchId: 'alien_psionics_basics',
    icon: '🧠🛡️'
  },
  'stealth_field_generator_item': {
    id: 'stealth_field_generator_item',
    name: '스텔스 필드 발생기',
    description: '일시적으로 사용자를 광학 및 전자기적으로 은폐시키는 장치입니다. (사용 시 효과)',
    type: 'consumable', 
    slotType: 'utilitySlot1',
    effects: ['사용 시 2턴간 스텔스 상태 (개념적)'],
    cost: [{ resourceId: 'supplies', amount: 200 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 40 }],
    requiredResearchId: 'stealth_systems',
    icon: '👻💨🔋'
  },
  'ai_targeting_module_item': {
    id: 'ai_targeting_module_item',
    name: 'AI 조준 보조 모듈',
    description: 'AI가 조준을 보조하여 사격 정확도를 비약적으로 향상시키는 무기 부착물입니다.',
    type: 'weapon_mod',
    slotType: 'weaponMod',
    effects: ['명중률 +20%'], 
    cost: [{ resourceId: 'supplies', amount: 150 }, { resourceId: ALLOY_FRAGMENTS_RESOURCE_ID, amount: 30 }],
    requiredResearchId: 'advanced_targeting_ai',
    icon: '🤖🎯✨'
  },
};


export const HEALTH_BAR_HIGH_COLOR = 'green';
export const HEALTH_BAR_MEDIUM_COLOR = 'yellow';
export const HEALTH_BAR_LOW_COLOR = 'red';
export const HEALTH_BAR_BACKGROUND_COLOR = '#555555'; 
export const HEALTH_BAR_HEIGHT = 0.15;
export const HEALTH_BAR_Y_OFFSET = 0.3; 

export const DAMAGE_NUMBER_DURATION = 1200; 
export const DAMAGE_NUMBER_FLOAT_SPEED = 0.5; 
export const DAMAGE_NUMBER_COLOR = '#FFFFFF'; 
export const DAMAGE_NUMBER_FONT_SIZE = 16; 
export const DAMAGE_NUMBER_SCALE = 0.5; 

export const INITIAL_MISSION_COUNT = 3;

export const ENEMY_COMPOSITIONS_BY_DIFFICULTY: Record<number, { templateId: string, count: number }[]> = {
  1: [{ templateId: 'enemy_grunt', count: 2 }, { templateId: 'enemy_drone', count: 1 }],
  2: [{ templateId: 'enemy_grunt', count: 3 }, { templateId: 'enemy_drone', count: 1 }],
  3: [{ templateId: 'enemy_grunt', count: 3 }, { templateId: 'enemy_drone', count: 2 }, { templateId: 'enemy_bruiser', count: 1 }],
  4: [{ templateId: 'enemy_grunt', count: 4 }, { templateId: 'enemy_drone', count: 3 }, { templateId: 'enemy_bruiser', count: 1 }], // Drone count increased
  5: [{ templateId: 'enemy_grunt', count: 4 }, { templateId: 'enemy_drone', count: 3 }, { templateId: 'enemy_bruiser', count: 2 }], // Grunt count increased
};
