
import * as THREE from 'three';

export enum Allegiance {
  PLAYER,
  ENEMY,
  NEUTRAL,
}

export interface GridPosition {
  x: number;
  y: number; // Represents Z in 3D grid
}

// Partial Unit stats for bonuses (Rank, Equipment effects)
export type UnitStatBonuses = Partial<Pick<Unit, 'maxHealth' | 'attackDamage' | 'moveSpeed' | 'attackRange' | 'maxActionPoints'>>;

// --- Ability System Types ---
export enum AbilityTargetType {
  SELF = 'self',
  ENEMY_UNIT = 'enemy_unit',
  ALLY_UNIT = 'ally_unit',
  ANY_UNIT = 'any_unit',
  GROUND_TILE = 'ground_tile',
}

export enum AbilityEffectType {
  DAMAGE_MODIFIER = 'damage_modifier', // Modifies next attack's damage (e.g., +10 flat, +50% percentage)
  HEAL = 'heal',
  TEMPORARY_STAT_BOOST = 'temporary_stat_boost', // e.g., +move speed for 1 turn
  // More complex effects for future:
  // APPLY_STATUS_EFFECT = 'apply_status_effect', // e.g., stun, poison
  // AREA_DAMAGE = 'area_damage',
  // SUMMON_UNIT = 'summon_unit',
}

export interface AbilityEffect {
  type: AbilityEffectType;
  value?: number; // For DAMAGE_MODIFIER (flat amount), HEAL (amount), TEMPORARY_STAT_BOOST (amount)
  percentageValue?: number; // For DAMAGE_MODIFIER (percentage, e.g., 0.5 for +50%)
  statToBoost?: keyof UnitStatBonuses; // For TEMPORARY_STAT_BOOST
  durationTurns?: number; // For TEMPORARY_STAT_BOOST or future status effects
  affectsNextAttackOnly?: boolean; // For effects like "Steady Aim"
}

export interface AbilityDefinition {
  id: string;
  name: string;
  description:string;
  icon?: string; // Emoji or path
  apCost: number;
  cooldownTurns: number;
  targetType: AbilityTargetType;
  range?: number; // Max distance for targeted abilities (0 for self, weapon range if not specified for attack abilities)
  areaOfEffectRadius?: number; // For AoE, 0 if single target
  effects: AbilityEffect[];
  requiresNoPriorMove?: boolean; // For abilities like Deadeye Shot
}

export interface ActiveAbilityStatus {
  abilityId: string;
  cooldownRemaining: number;
}

export interface TemporaryAbilityEffect {
  effectType: AbilityEffectType;
  value?: number;
  percentageValue?: number;
  statToBoost?: keyof UnitStatBonuses;
  sourceAbilityId: string;
  activeThisTurn?: boolean;
  appliedOnAttack?: boolean;
  durationTurns?: number; // Added: Original duration from AbilityEffect
  affectsNextAttackOnly?: boolean; // Added: From AbilityEffect, for one-shot attack modifiers
}
// --- End Ability System Types ---


export interface Unit {
  id: string;
  name: string;
  templateId: string; // ID linking to a base template in constants.ts
  allegiance: Allegiance;
  position: GridPosition;
  health: number;
  maxHealth: number;
  actionPoints: number;
  maxActionPoints: number;
  moveSpeed: number;
  attackRange: number;
  attackDamage: number;
  color: string;
  size: { width: number; height: number; depth: number };
  mesh?: THREE.Mesh;
  isTargetable?: boolean;
  // Progression fields are now essential for unit definition
  experience: number;
  rank: string;
  equipment: EquipmentSlots;
  // Combat-specific ability state
  baseAbilities: string[]; // IDs of abilities available to this unit type
  activeAbilities: ActiveAbilityStatus[]; // Tracks cooldowns in combat
  temporaryEffects: TemporaryAbilityEffect[]; // For effects like "Steady Aim", "Blitz"
  hasMovedThisTurn?: boolean; // To track movement for abilities like "Deadeye Shot"
  killsThisMission?: number; // Added: Track kills within the current mission
}

export type EquipmentSlotType = 'primaryWeapon' | 'weaponMod' | 'armorMod' | 'utilitySlot1';

export interface EquipmentSlots {
  primaryWeapon?: string; // instanceId of PlayerInventoryItem
  weaponMod?: string;     // instanceId of PlayerInventoryItem
  armorMod?: string;      // instanceId of PlayerInventoryItem
  utilitySlot1?: string;  // instanceId of PlayerInventoryItem
}

export interface SavedUnitInfo {
  id: string;
  templateId: string;
  name:string;
  experience: number;
  rank: string;
  equipment: EquipmentSlots;
  // baseAbilities are derived from templateId, so not stored directly here
  // but good to note that unit templates will define base abilities
}

// For passing survivor stats including kills from combat to GameContext
export interface SurvivedUnitCombatStats extends SavedUnitInfo {
  killsThisMission: number;
}


export interface Tile {
  position: GridPosition;
  isOccupied: boolean;
  isWalkable: boolean;
  isObstacle?: boolean;
  highlightType?: 'move' | 'player_attack' | 'enemy_attack' | 'ability_target' | null;
  mesh?: THREE.Mesh;
}

export type GameOverStatus = 'playing' | 'victory' | 'defeat';

export interface DamageLogEntry {
  turn: number;
  allegiance: Allegiance;
  damage: number;
  targetName: string;
  timestamp: number;
}

export type PendingActionType = 'move' | 'attack' | 'skip' | `ability_${string}`;


export interface CombatState {
  units: Unit[]; // Now uses the full Unit type with progression fields
  grid: Tile[][];
  selectedUnitId: string | null;
  currentTurn: Allegiance;
  messageLog: string[];
  pendingAction: PendingActionType | null;
  gameOverState: GameOverStatus;
  damageLog: DamageLogEntry[];
  currentTurnNumber: number;
  isCombatDelegated: boolean;
}

export enum GameScreen {
  MainMenu,
  TeamManagement, // Will be part of StrategicHub
  Research,       // Will be part of StrategicHub
  Combat,
  WorldMap,       // Will be part of StrategicHub
  MissionDebrief,
  Engineering,    // Will be part of StrategicHub
  StrategicHub,   // New combined screen
}

// --- Mission System Types ---
export interface MissionReward {
  supplies: number;
  alloyFragments?: number;
}

export interface Mission {
  id: string;
  regionId: string;
  type: string;
  name: string;
  description: string;
  difficulty: number;
  rewards: MissionReward;
  status: 'available' | 'in_progress' | 'completed_success' | 'completed_failure';
}

export interface UnitProgressInfo {
  unitId: string;
  unitName: string;
  xpGained: number;
  promotedToRank?: string;
  initialRank: string;
  finalRank: string;
  initialXp: number;
  finalXp: number;
}

export interface MissionOutcome {
  mission: Mission;
  status: GameOverStatus;
  playerUnitsLost?: number;
  enemiesDefeated?: number;
  unitProgress?: UnitProgressInfo[]; // For debriefing XP and promotions
}


// --- Research System Types ---
export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number;
  unlocks: string[];
  prerequisites: string[];
  icon?: string;
}

export interface ActiveResearch {
  projectId: string;
  progress: number;
  remainingDuration: number;
}

export interface ResearchState {
  availableProjects: string[];
  activeResearch: ActiveResearch | null;
  completedProjects: string[];
  allProjects: { [id: string]: ResearchProject };
}

// --- Engineering/Crafting System Types ---
export interface ResourceCost {
  resourceId: 'supplies' | 'alloy_fragments';
  amount: number;
}

export type CraftableItemType = 'weapon_mod' | 'armor_mod' | 'consumable' | 'special_weapon' | 'utility'; // Added 'utility'

export interface CraftableItem {
  id: string;
  name: string;
  description: string;
  type: CraftableItemType;
  effects: string[]; // e.g., ["공격력 +10", "최대 체력 +15"]
  cost: ResourceCost[];
  requiredResearchId: string;
  icon?: string;
  slotType: EquipmentSlotType | null;
}

export interface PlayerInventoryItem {
  itemId: string; // References CraftableItem.id
  instanceId: string; // Unique ID for this specific instance of the item
}

// Soldier Progression
export interface RankData {
  name: string;
  xpToNextRank: number | null; // null for max rank. This is XP needed *from the start of current rank*
  statBonuses?: UnitStatBonuses; // Bonus stats gained when reaching this rank
  // Future: abilitiesUnlockedAtThisRank?: string[];
}


// --- Global Game Data ---
export interface GameData {
  supplies: number;
  alloyFragments: number;
  activeMissions: Mission[];
  researchState: ResearchState;
  teamUnits: SavedUnitInfo[];
  playerInventory: PlayerInventoryItem[];
  lastCompletedMissionDetails: MissionOutcome | null;
  justCompletedResearchId?: string | null;
}

export interface NavigationContextType {
  currentScreen: GameScreen;
  setCurrentScreen: (screen: GameScreen) => void;
}
