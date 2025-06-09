import { GameData, ResearchState, SavedUnitInfo, Mission, ActiveResearch, ResearchProject, MissionOutcome, PlayerInventoryItem, EquipmentSlots } from '../types';
import { 
  LOCAL_STORAGE_KEY_GAME_DATA, 
  INITIAL_SUPPLIES, 
  ALL_RESEARCH_PROJECTS, 
  LOCAL_STORAGE_KEY_TEAM_UNITS, 
  LOCAL_STORAGE_KEY_RESEARCH_STATE, 
  MIN_MISSION_DIFFICULTY, MAX_MISSION_DIFFICULTY,
  INITIAL_MISSION_COUNT,
  INITIAL_ALLOY_FRAGMENTS, 
  ALLOY_FRAGMENTS_RESOURCE_ID,
  RANKS
} from '../constants';
import { REGIONS_DATA } from '../components/WorldMapView'; 

const generateId = (prefix: string = 'id_') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getDefaultEquipmentSlots = (): EquipmentSlots => ({
  primaryWeapon: undefined,
  weaponMod: undefined,
  armorMod: undefined,
  utilitySlot1: undefined,
});

const defaultInitialTeamRoster: SavedUnitInfo[] = [
  { id: 'player1', templateId: 'rookie', name: '알파 분대원 1', experience: 0, rank: RANKS[0].name, equipment: getDefaultEquipmentSlots() },
  { id: 'player2', templateId: 'assault', name: '알파 분대원 2', experience: 0, rank: RANKS[0].name, equipment: getDefaultEquipmentSlots() },
];

export const generateInitialMissions = (count: number): Mission[] => {
  const missions: Mission[] = [];
  const availableRegionIds = REGIONS_DATA.map(r => r.id);
  if (availableRegionIds.length === 0) return [];

  const missionTypes = [
    { type: "Supply Raid", description: "적의 보급품 저장소를 급습하여 귀중한 자원을 확보하십시오.", baseRewardSupplies: 100, baseRewardAlloys: 5, difficultyMod: 1.0, alloyChance: 0.3 },
    { type: "Data Recovery", description: "중요한 정보가 담긴 데이터 코어를 회수하십시오. 정보는 힘입니다.", baseRewardSupplies: 75, baseRewardAlloys: 10, difficultyMod: 1.2, alloyChance: 0.5 },
    { type: "Search and Rescue", description: "실종된 아군 요원을 찾아 안전하게 구출하십시오.", baseRewardSupplies: 120, baseRewardAlloys: 3, difficultyMod: 1.5, alloyChance: 0.2 },
    { type: "Alien Assassination", description: "고가치 외계인 표적을 제거하여 적의 지휘 체계를 혼란에 빠뜨리십시오.", baseRewardSupplies: 150, baseRewardAlloys: 15, difficultyMod: 1.8, alloyChance: 0.6 },
    { type: "Bomb Disposal", description: "적들이 설치한 폭탄을 제한 시간 내에 해체하여 대참사를 막으십시오.", baseRewardSupplies: 130, baseRewardAlloys: 8, difficultyMod: 1.6, alloyChance: 0.4 },
  ];

  for (let i = 0; i < count; i++) {
    const randomRegionId = availableRegionIds[Math.floor(Math.random() * availableRegionIds.length)];
    const missionTemplate = missionTypes[Math.floor(Math.random() * missionTypes.length)];
    const difficulty = Math.floor(Math.random() * (MAX_MISSION_DIFFICULTY - MIN_MISSION_DIFFICULTY + 1)) + MIN_MISSION_DIFFICULTY;

    const rewards: Mission['rewards'] = {
      supplies: Math.floor(missionTemplate.baseRewardSupplies * (1 + (difficulty-1)*0.25) * missionTemplate.difficultyMod)
    };
    if (Math.random() < missionTemplate.alloyChance) {
      rewards.alloyFragments = Math.floor(missionTemplate.baseRewardAlloys * (1 + (difficulty-1)*0.15) * missionTemplate.difficultyMod);
    }


    missions.push({
      id: generateId('mission_'),
      regionId: randomRegionId,
      type: missionTemplate.type,
      name: `Operation ${randomRegionId.split('_')[0]} ${i + 1}`, 
      description: missionTemplate.description,
      difficulty: difficulty,
      rewards: rewards,
      status: 'available',
    });
  }
  return missions;
};


export const loadGameData = (): GameData => {
  try {
    const savedDataJSON = localStorage.getItem(LOCAL_STORAGE_KEY_GAME_DATA);
    if (savedDataJSON) {
      const parsedData = JSON.parse(savedDataJSON) as GameData;
      // Basic validation and merging with current constants
      if (parsedData && typeof parsedData.supplies === 'number') {
        parsedData.researchState = {
          ...parsedData.researchState,
          allProjects: { ...ALL_RESEARCH_PROJECTS, ...parsedData.researchState.allProjects } 
        };
        if (!Array.isArray(parsedData.activeMissions)) {
          parsedData.activeMissions = generateInitialMissions(INITIAL_MISSION_COUNT);
        }
        if (!Array.isArray(parsedData.teamUnits)) {
          parsedData.teamUnits = [...defaultInitialTeamRoster];
        } else {
          // Ensure existing units have new fields
          parsedData.teamUnits = parsedData.teamUnits.map(unit => ({
            ...unit,
            experience: unit.experience ?? 0,
            rank: unit.rank ?? RANKS[0].name,
            equipment: unit.equipment ?? getDefaultEquipmentSlots(),
          }));
        }
        if (parsedData.lastCompletedMissionDetails === undefined) {
          parsedData.lastCompletedMissionDetails = null;
        }
        if (typeof parsedData.alloyFragments !== 'number') {
          parsedData.alloyFragments = INITIAL_ALLOY_FRAGMENTS;
        }
        if (!Array.isArray(parsedData.playerInventory)) {
          parsedData.playerInventory = [];
        }
        if (parsedData.justCompletedResearchId === undefined) { // Initialize new field
          parsedData.justCompletedResearchId = null;
        }

        return parsedData;
      }
    }
  } catch (error) {
    console.error("Error loading global game data:", error);
  }

  console.log("No valid global game data found, initializing new or attempting migration from older versions.");

  let initialTeamUnits: SavedUnitInfo[] = [...defaultInitialTeamRoster];
  try { 
    const oldTeamJSON = localStorage.getItem(LOCAL_STORAGE_KEY_TEAM_UNITS); // v2 key
    if (oldTeamJSON) {
      const parsedOldTeam = JSON.parse(oldTeamJSON) as Array<Omit<SavedUnitInfo, 'experience' | 'rank' | 'equipment'>>;
      if (Array.isArray(parsedOldTeam) && parsedOldTeam.length > 0) {
        initialTeamUnits = parsedOldTeam.map(u => ({
            ...u,
            experience: 0,
            rank: RANKS[0].name,
            equipment: getDefaultEquipmentSlots()
        }));
        console.log("Migrated team units from old storage (v2).");
      }
    }
  } catch (e) { console.warn("Could not migrate old team units (v2)."); }

  let initialResearchState: ResearchState;
  try { 
    const oldResearchJSON = localStorage.getItem(LOCAL_STORAGE_KEY_RESEARCH_STATE);
    if (oldResearchJSON) {
      const parsedOldResearch = JSON.parse(oldResearchJSON) as ResearchState;
      if (parsedOldResearch && parsedOldResearch.allProjects) {
         if ('researchPoints' in parsedOldResearch) { // old field
            delete (parsedOldResearch as any).researchPoints;
         }
        initialResearchState = {
          ...parsedOldResearch,
          allProjects: { ...ALL_RESEARCH_PROJECTS, ...parsedOldResearch.allProjects },
        };
        console.log("Migrated research state from old storage.");
      } else {
        throw new Error("Old research state invalid format");
      }
    } else {
      throw new Error("No old research state found");
    }
  } catch (e) {
    console.warn("Could not migrate old research state, initializing new:", e);
    const initialAvailable = Object.values(ALL_RESEARCH_PROJECTS)
                              .filter(p => p.prerequisites.length === 0)
                              .map(p => p.id);
    initialResearchState = {
      availableProjects: initialAvailable,
      activeResearch: null,
      completedProjects: [],
      allProjects: ALL_RESEARCH_PROJECTS,
    };
  }


  return {
    supplies: INITIAL_SUPPLIES,
    alloyFragments: INITIAL_ALLOY_FRAGMENTS,
    activeMissions: generateInitialMissions(INITIAL_MISSION_COUNT), 
    researchState: initialResearchState,
    teamUnits: initialTeamUnits,
    playerInventory: [], 
    lastCompletedMissionDetails: null, 
    justCompletedResearchId: null, // Initialize new field
  };
};

export const saveGameData = (gameData: GameData): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_GAME_DATA, JSON.stringify(gameData));
  } catch (error) {
    console.error("Error saving global game data:", error);
  }
};