
import { Unit, ResearchProject, RankData, EquipmentSlots, PlayerInventoryItem, CraftableItem, UnitStatBonuses, SavedUnitInfo, EquipmentSlotType, ActiveAbilityStatus, TemporaryAbilityEffect } from '../types';
import { ALL_RESEARCH_PROJECTS, UNIT_TEMPLATES, RANKS, ALL_CRAFTABLE_ITEMS, ALL_ABILITIES } from '../constants';

type NumericUnitStat = keyof UnitStatBonuses; // 'maxHealth' | 'attackDamage' | 'moveSpeed' | 'attackRange' | 'maxActionPoints';


const parseEffectString = (effectString: string, unitTemplateIdForSpecificity?: string): { statName: NumericUnitStat, value: number, appliesTo?: string[] } | null => {
  // General stat boosts (e.g., "모든 유닛의 최대 체력 +10", "공격력 +5")
  const generalStatRegex = /(?:모든 유닛의\s*)?(최대 체력|공격력|이동 속도|공격 범위|최대 행동력)\s*\+\s*(\d+)/;
  const generalMatch = effectString.match(generalStatRegex);
  if (generalMatch) {
    const statKorean = generalMatch[1];
    const value = parseInt(generalMatch[2], 10);
    let statName: NumericUnitStat | null = null;
    if (statKorean === '최대 체력') statName = 'maxHealth';
    else if (statKorean === '공격력') statName = 'attackDamage';
    else if (statKorean === '이동 속도') statName = 'moveSpeed';
    else if (statKorean === '공격 범위') statName = 'attackRange';
    else if (statKorean === '최대 행동력') statName = 'maxActionPoints';
    
    if (statName) return { statName, value };
  }

  // Specific unit type boosts (e.g., "저격수, 중화기병 공격 범위 +1")
  const specificBoostRegex = /([\w\s,]+)\s*(공격 범위|이동 속도|최대 체력|공격력|최대 행동력)\s*\+\s*(\d+)/;
  const specificMatch = effectString.match(specificBoostRegex);

  if (specificMatch && unitTemplateIdForSpecificity) {
    const unitTypesString = specificMatch[1].trim();
    const statTypeString = specificMatch[2];
    const value = parseInt(specificMatch[3], 10);

    const affectedUnitTypesKorean = unitTypesString.split(',').map(s => s.trim());
    
    let statName: NumericUnitStat | null = null;
    if (statTypeString === '공격 범위') statName = 'attackRange';
    else if (statTypeString === '이동 속도') statName = 'moveSpeed';
    else if (statTypeString === '최대 체력') statName = 'maxHealth';
    else if (statTypeString === '공격력') statName = 'attackDamage';
    else if (statTypeString === '최대 행동력') statName = 'maxActionPoints';

    if (statName && affectedUnitTypesKorean.length > 0) {
      const currentUnitTemplateDetails = UNIT_TEMPLATES[unitTemplateIdForSpecificity];
      if (currentUnitTemplateDetails) {
        const currentUnitKoreanName = currentUnitTemplateDetails.name;
        if (affectedUnitTypesKorean.includes(currentUnitKoreanName)) {
           return { statName, value, appliesTo: affectedUnitTypesKorean }; 
        }
      }
    }
  }
  // Add more parsers here for other effect types if needed (e.g., accuracy, crit chance)
  // For now, non-stat boosts like "관통 효과" or "사용 시..." are ignored by this parser.
  return null;
};


export const calculateEffectiveUnitStats = (
  unitInfo: SavedUnitInfo, // Contains templateId, rank, equipment
  completedResearchIds: string[],
  playerInventory: PlayerInventoryItem[] // Needed to look up item definitions from instance IDs
): Omit<Unit, 'id' | 'name' | 'allegiance' | 'position' | 'color' | 'size' | 'mesh' | 'isTargetable' | 'hasMovedThisTurn'> & { experience: number, rank: string, equipment: EquipmentSlots } => {
  
  const baseTemplateStats = UNIT_TEMPLATES[unitInfo.templateId];
  if (!baseTemplateStats) {
    console.error(`Base template ${unitInfo.templateId} not found! Returning default stats.`);
    const fallbackTemplate = UNIT_TEMPLATES['rookie'] || Object.values(UNIT_TEMPLATES)[0];
     return { 
      ...fallbackTemplate,
      health: fallbackTemplate.maxHealth, 
      actionPoints: fallbackTemplate.maxActionPoints, 
      experience: unitInfo.experience,
      rank: unitInfo.rank,
      equipment: unitInfo.equipment,
      templateId: unitInfo.templateId, 
      baseAbilities: fallbackTemplate.baseAbilities || [],
      activeAbilities: (fallbackTemplate.baseAbilities || []).map(abId => ({ abilityId: abId, cooldownRemaining: 0 })),
      temporaryEffects: [],
      killsThisMission: 0, // Initialize kills
    };
  }

  // Start with a deep copy of base stats
  const workingStats = JSON.parse(JSON.stringify(baseTemplateStats)) as Omit<Unit, 'id' | 'allegiance' | 'position' | 'color' | 'size' | 'mesh' | 'isTargetable' | 'name' | 'hasMovedThisTurn'> & { experience: number, rank: string, equipment: EquipmentSlots, templateId: string };
  workingStats.experience = unitInfo.experience;
  workingStats.rank = unitInfo.rank;
  workingStats.equipment = unitInfo.equipment;
  workingStats.templateId = unitInfo.templateId; // Keep templateId

  // Initialize ability fields
  workingStats.baseAbilities = baseTemplateStats.baseAbilities || [];
  workingStats.activeAbilities = (baseTemplateStats.baseAbilities || []).map(abId => ({ abilityId: abId, cooldownRemaining: 0 }));
  workingStats.temporaryEffects = [];
  (workingStats as Unit).killsThisMission = 0; // Initialize kills


  // Ensure current health and AP are initialized from max values from the template
  workingStats.health = workingStats.maxHealth;
  workingStats.actionPoints = workingStats.maxActionPoints;


  // 1. Apply Rank Bonuses
  const rankData = RANKS.find(r => r.name === unitInfo.rank);
  if (rankData && rankData.statBonuses) {
    for (const [stat, value] of Object.entries(rankData.statBonuses)) {
      const statKey = stat as NumericUnitStat;
      if (typeof workingStats[statKey] === 'number' && typeof value === 'number') {
        (workingStats[statKey] as number) += value;
        if (statKey === 'maxHealth') workingStats.health += value;
        if (statKey === 'maxActionPoints') workingStats.actionPoints += value;
      }
    }
  }

  // 2. Apply Research Effects
  for (const researchId of completedResearchIds) {
    const project = ALL_RESEARCH_PROJECTS[researchId];
    if (project && project.unlocks) {
      for (const unlock of project.unlocks) {
        // Pass unitInfo.templateId for specificity checks in research
        const modification = parseEffectString(unlock, unitInfo.templateId); 
        if (modification) {
          if (typeof workingStats[modification.statName] === 'number') {
            (workingStats[modification.statName] as number) += modification.value;
            if (modification.statName === 'maxHealth') workingStats.health += modification.value;
            if (modification.statName === 'maxActionPoints') workingStats.actionPoints += modification.value;
          }
        }
      }
    }
  }
  
  // 3. Apply Equipment Effects
  for (const slotKey in unitInfo.equipment) {
    const itemInstanceId = unitInfo.equipment[slotKey as EquipmentSlotType];
    if (itemInstanceId) {
      const inventoryItem = playerInventory.find(item => item.instanceId === itemInstanceId);
      if (inventoryItem) {
        const itemDef = ALL_CRAFTABLE_ITEMS[inventoryItem.itemId];
        if (itemDef && itemDef.effects) {
          itemDef.effects.forEach(effectStr => {
            // Equipment effects are generally not unit-type specific, so no templateId passed
            const modification = parseEffectString(effectStr); 
            if (modification && !modification.appliesTo) { // Only apply general effects from equipment for now
              if (typeof workingStats[modification.statName] === 'number') {
                (workingStats[modification.statName] as number) += modification.value;
                if (modification.statName === 'maxHealth') workingStats.health += modification.value;
                if (modification.statName === 'maxActionPoints') workingStats.actionPoints += modification.value;
              }
            } else if (modification && modification.appliesTo) {
              // This is for effects like "저격수 공격 범위 +1" from research, equipment usually doesn't have this.
              // If equipment *could* have unit-specific effects, pass unitInfo.templateId here.
            }
          });
        }
      }
    }
  }
  
  // Final clamping of health and AP to their maximums
  workingStats.health = Math.max(0, Math.min(workingStats.health, workingStats.maxHealth));
  workingStats.actionPoints = Math.max(0, Math.min(workingStats.actionPoints, workingStats.maxActionPoints));

  return workingStats;
};
