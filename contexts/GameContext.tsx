
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { GameData, Mission, GameOverStatus, GameScreen, ResearchProject, SavedUnitInfo, ResearchState, ActiveResearch, MissionReward, MissionOutcome, CraftableItem, PlayerInventoryItem, ResourceCost, EquipmentSlots, EquipmentSlotType, UnitProgressInfo, SurvivedUnitCombatStats } from '../types';
import { loadGameData, saveGameData, generateInitialMissions } from '../utils/gameDataManager';
import { ALL_CRAFTABLE_ITEMS, ALL_RESEARCH_PROJECTS, MAX_ACTIVE_MISSIONS, UNIT_TEMPLATES, RANKS, XP_REWARDS, LOCAL_STORAGE_KEY_GAME_DATA, LOCAL_STORAGE_KEY_TEAM_UNITS, LOCAL_STORAGE_KEY_RESEARCH_STATE } from '../constants';

export interface NotificationType {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface GameContextType {
  gameData: GameData;
  setGameData: React.Dispatch<React.SetStateAction<GameData>>; 
  currentScreen: GameScreen;
  setCurrentScreen: (screen: GameScreen) => void;
  currentMissionForCombat: Mission | null;
  startMissionCombat: (mission: Mission) => void;
  completeMissionCombat: (status: GameOverStatus, completedMission: Mission, enemiesDefeated?: number, playerUnitsLost?: number, playerUnitsSurvived?: SurvivedUnitCombatStats[]) => void; 
  
  startResearchProject: (projectId: string) => { success: boolean, message: string };
  advanceActiveResearch: () => void;
  acknowledgeResearchCompletion: () => void; 

  recruitNewUnit: (templateId: string) => { success: boolean, message: string, newUnit?: SavedUnitInfo };
  dismissTeamUnit: (unitId: string) => { success: boolean, message: string };
  updateTeamUnitName: (unitId: string, newName: string) => { success: boolean, message: string };
  
  craftItem: (itemIdToCraft: string) => { success: boolean, message: string };
  equipItem: (unitId: string, slot: EquipmentSlotType, itemInstanceId: string) => { success: boolean, message: string };
  unequipItem: (unitId: string, slot: EquipmentSlotType) => { success: boolean, message: string };


  supplies: number;
  alloyFragments: number; 

  checkForNewMissions: () => void;
  clearLastCompletedMissionDetails: () => void;

  notification: NotificationType | null;
  showNotification: (message: string, type: NotificationType['type'], duration?: number) => void;
  resetGameData: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

const generateInstanceId = (prefix: string = 'item_instance_') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getDefaultEquipmentSlots = (): EquipmentSlots => ({
  primaryWeapon: undefined,
  weaponMod: undefined,
  armorMod: undefined,
  utilitySlot1: undefined,
});

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameData, setGameData] = useState<GameData>(loadGameData);
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.MainMenu);
  const [currentMissionForCombat, setCurrentMissionForCombat] = useState<Mission | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);

  const gameDataRef = useRef(gameData);

  useEffect(() => {
    gameDataRef.current = gameData; 
  }, [gameData]);

  useEffect(() => {
    saveGameData(gameData);
  }, [gameData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Auto-saving game data at interval...');
      saveGameData(gameDataRef.current); 
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(intervalId); 
  }, []); 

  const showNotification = useCallback((message: string, type: NotificationType['type'], duration: number = 3000) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    const newNotifId = `notif_${Date.now()}`;
    setNotification({ id: newNotifId, message, type });
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(prevNotif => (prevNotif && prevNotif.id === newNotifId ? null : prevNotif));
    }, duration);
  }, []);

  const navigateTo = useCallback((screen: GameScreen) => {
    setCurrentScreen(screen);
  }, []);

  const startMissionCombat = (mission: Mission) => {
    setCurrentMissionForCombat(mission);
    navigateTo(GameScreen.Combat);
  };

  const completeMissionCombat = (
    status: GameOverStatus, 
    completedMission: Mission, 
    enemiesDefeated: number = 0, 
    playerUnitsLost: number = 0,
    playerUnitsSurvivedStats: SurvivedUnitCombatStats[] = []
  ) => {
    setGameData(prevData => {
      let newSupplies = prevData.supplies;
      let newAlloyFragments = prevData.alloyFragments;
      const missionOutcomeStatus: 'completed_success' | 'completed_failure' = status === 'victory' ? 'completed_success' : 'completed_failure';
      const unitProgressInfoList: UnitProgressInfo[] = [];
      
      const survivingUnitIdsFromCombat = new Set(playerUnitsSurvivedStats.map(s => s.id));

      const updatedTeamUnits = prevData.teamUnits
        .filter(teamUnitInRoster => survivingUnitIdsFromCombat.has(teamUnitInRoster.id)) // Only keep units that survived
        .map(survivingUnitInRoster => {
          // Find the combat performance stats for this survivor
          const combatPerformanceStats = playerUnitsSurvivedStats.find(s => s.id === survivingUnitInRoster.id)!;

          let xpGainedThisMission = 0;
          if (status === 'victory') {
            xpGainedThisMission += XP_REWARDS.PER_MISSION_VICTORY;
            xpGainedThisMission += (combatPerformanceStats.killsThisMission || 0) * XP_REWARDS.PER_KILL;
          }

          const initialXp = survivingUnitInRoster.experience;
          const finalXp = initialXp + xpGainedThisMission;
          const initialRank = survivingUnitInRoster.rank;
          let finalRank = initialRank;
          let promotedToRankName: string | undefined = undefined;

          let currentRankIndex = RANKS.findIndex(r => r.name === initialRank);
          if (currentRankIndex === -1) {
            console.warn(`Rank ${initialRank} not found for unit ${survivingUnitInRoster.name}. Defaulting to lowest rank.`);
            currentRankIndex = 0;
            finalRank = RANKS[0].name;
          }
          
          let cumulativeXpForCurrentRankTier = 0;
          for(let i=0; i < currentRankIndex; ++i) { 
              cumulativeXpForCurrentRankTier += RANKS[i].xpToNextRank || 0;
          }

          let tempRankIndexForPromotion = currentRankIndex;
          while( tempRankIndexForPromotion < RANKS.length - 1 && 
                 RANKS[tempRankIndexForPromotion].xpToNextRank !== null && 
                 finalXp >= (cumulativeXpForCurrentRankTier + (RANKS[tempRankIndexForPromotion].xpToNextRank || 0)) 
               ){
              cumulativeXpForCurrentRankTier += RANKS[tempRankIndexForPromotion].xpToNextRank || 0; 
              tempRankIndexForPromotion++; 
              finalRank = RANKS[tempRankIndexForPromotion].name;
              promotedToRankName = finalRank;
          }
          
          unitProgressInfoList.push({ 
            unitId: survivingUnitInRoster.id, 
            unitName: survivingUnitInRoster.name, 
            xpGained: xpGainedThisMission, 
            promotedToRank: promotedToRankName, 
            initialRank, 
            finalRank, 
            initialXp, 
            finalXp 
          });
          
          // Return the updated SavedUnitInfo structure for the survivor
          return { 
            ...survivingUnitInRoster, 
            experience: finalXp, 
            rank: finalRank 
          };
        });
      
      if (status === 'victory') {
        newSupplies += Math.floor(completedMission.rewards.supplies * 1.3);
        if (completedMission.rewards.alloyFragments) {
          newAlloyFragments += Math.floor(completedMission.rewards.alloyFragments * 1.3);
        }
      }
      
      const updatedMissions: Mission[] = prevData.activeMissions
        .map(m => m.id === completedMission.id ? { ...m, status: missionOutcomeStatus } : m)
        .filter(m => m.id !== completedMission.id || (m.status !== 'completed_success' && m.status !== 'completed_failure'));
      
      const lastCompletedDetails: MissionOutcome = {
        mission: completedMission,
        status: status,
        enemiesDefeated: enemiesDefeated,
        playerUnitsLost: playerUnitsLost,
        unitProgress: unitProgressInfoList.length > 0 ? unitProgressInfoList : undefined
      };
      
      return {
        ...prevData,
        supplies: newSupplies,
        alloyFragments: newAlloyFragments,
        activeMissions: updatedMissions,
        teamUnits: updatedTeamUnits, // This now correctly only contains survivors
        lastCompletedMissionDetails: lastCompletedDetails,
      };
    });
    setCurrentMissionForCombat(null);
    navigateTo(GameScreen.MissionDebrief); 
    checkForNewMissions(); 
  };
  
  const clearLastCompletedMissionDetails = () => {
    setGameData(prev => ({
      ...prev,
      lastCompletedMissionDetails: null,
    }));
  };


  const startResearchProject = (projectId: string): { success: boolean, message: string } => {
    const project = gameData.researchState.allProjects[projectId];
    if (!project) return { success: false, message: "Project not found." };
    if (gameData.researchState.activeResearch) return { success: false, message: "다른 연구가 이미 진행 중입니다." };
    if (gameData.supplies < project.cost) return { success: false, message: "보급품이 부족합니다." };
    if (!project.prerequisites.every(pId => gameData.researchState.completedProjects.includes(pId))) {
      return { success: false, message: "선행 연구 조건이 충족되지 않았습니다." };
    }

    setGameData(prev => {
      const newActiveResearch: ActiveResearch = {
        projectId: project.id, progress: 0, remainingDuration: project.duration,
      };
      return {
        ...prev,
        supplies: prev.supplies - project.cost,
        researchState: {
          ...prev.researchState,
          activeResearch: newActiveResearch,
        },
        justCompletedResearchId: null, 
      };
    });
    showNotification(`${project.name} 연구를 시작합니다.`, "info");
    return { success: true, message: `${project.name} research started.` };
  };
  
  const advanceActiveResearch = () => {
    if (!gameData.researchState.activeResearch) return;
    const activeProjectId = gameData.researchState.activeResearch.projectId;
    const project = gameData.researchState.allProjects[activeProjectId];
    if (!project) return;

    setGameData(prev => {
      if (!prev.researchState.activeResearch) return prev; 
      let newProgress = prev.researchState.activeResearch.progress + 1; 
      let newRemainingDuration = project.duration - newProgress;
      let newResearchState = { ...prev.researchState };
      let newJustCompletedResearchId = prev.justCompletedResearchId;


      if (newProgress >= project.duration) {
        newResearchState = {
          ...newResearchState,
          activeResearch: null,
          completedProjects: [...newResearchState.completedProjects, activeProjectId].filter((id, index, self) => self.indexOf(id) === index), 
        };
        newJustCompletedResearchId = activeProjectId; 
        console.log(`${project.name} 연구 완료!`); 
        showNotification(`${project.name} 연구 완료!`, "success");
      } else {
        newResearchState = {
          ...newResearchState,
          activeResearch: { ...newResearchState.activeResearch, progress: newProgress, remainingDuration: newRemainingDuration },
        };
         showNotification(`${project.name} 연구 진행 중... (${newProgress}/${project.duration})`, "info", 1500);
      }

      return { ...prev, researchState: newResearchState, justCompletedResearchId: newJustCompletedResearchId };
    });
  };

  const acknowledgeResearchCompletion = () => {
    setGameData(prev => ({
      ...prev,
      justCompletedResearchId: null,
    }));
  };

  const recruitNewUnit = (templateId: string): { success: boolean, message: string, newUnit?: SavedUnitInfo } => {
    const RECRUIT_COST_SUPPLIES = 25; 
    if (gameData.supplies < RECRUIT_COST_SUPPLIES) {
      showNotification(`보급품 부족 (필요: ${RECRUIT_COST_SUPPLIES})`, "error");
      return { success: false, message: `Not enough supplies. Cost: ${RECRUIT_COST_SUPPLIES}` };
    }
    const unitSpecificName = UNIT_TEMPLATES[templateId]?.name || '분대원';
    
    const newUnitId = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const currentTeamSize = gameData.teamUnits.length;
    const generatedName = `${unitSpecificName} ${currentTeamSize + 1}`;
    const newUnitInfo : SavedUnitInfo = {
        id: newUnitId, 
        templateId, 
        name: generatedName,
        experience: 0,
        rank: RANKS[0].name, 
        equipment: getDefaultEquipmentSlots() 
    };

    setGameData(prev => ({
        ...prev,
        supplies: prev.supplies - RECRUIT_COST_SUPPLIES,
        teamUnits: [...prev.teamUnits, newUnitInfo]
    }));
    showNotification(`${generatedName} 대원을 모집했습니다.`, "success");
    return { success: true, message: `${generatedName} recruited.`, newUnit: newUnitInfo };
  };

  const dismissTeamUnit = (unitId: string): { success: boolean, message: string } => {
    const unitToDismiss = gameData.teamUnits.find(u => u.id === unitId);
    if (!unitToDismiss) {
       showNotification("해고할 유닛을 찾을 수 없습니다.", "error");
       return { success: false, message: "Unit not found." };
    }
    setGameData(prev => ({
      ...prev,
      teamUnits: prev.teamUnits.filter(u => u.id !== unitId)
    }));
    showNotification(`${unitToDismiss.name} 대원을 해고했습니다.`, "info");
    return { success: true, message: "Unit dismissed." };
  };
  
  const updateTeamUnitName = (unitId: string, newName: string): { success: boolean, message: string } => {
     const unit = gameData.teamUnits.find(u => u.id === unitId);
     if (!unit) {
        showNotification("이름을 변경할 유닛을 찾을 수 없습니다.", "error");
        return { success: false, message: "Unit not found." };
     }
     setGameData(prev => ({
      ...prev,
      teamUnits: prev.teamUnits.map(u => u.id === unitId ? {...u, name: newName} : u)
    }));
    showNotification(`${unit.name}의 이름이 ${newName}(으)로 변경되었습니다.`, "success");
    return { success: true, message: "Unit name updated." };
  };

  const craftItem = (itemIdToCraft: string): { success: boolean, message: string } => {
    const itemDefinition = ALL_CRAFTABLE_ITEMS[itemIdToCraft];
    if (!itemDefinition) {
      showNotification("잘못된 아이템 ID입니다.", "error");
      return { success: false, message: "Invalid item ID." };
    }

    if (itemDefinition.requiredResearchId && !gameData.researchState.completedProjects.includes(itemDefinition.requiredResearchId)) {
      const requiredResearchName = ALL_RESEARCH_PROJECTS[itemDefinition.requiredResearchId]?.name || '알 수 없는 연구';
      showNotification(`${itemDefinition.name} 설계도 미해금 (필요 연구: ${requiredResearchName})`, "error");
      return { success: false, message: `Blueprint for ${itemDefinition.name} not unlocked. Required research: ${requiredResearchName}.` };
    }

    for (const cost of itemDefinition.cost) {
      if (cost.resourceId === 'supplies' && gameData.supplies < cost.amount) {
        showNotification(`보급품 부족 (필요: ${cost.amount}, 보유: ${gameData.supplies})`, "error");
        return { success: false, message: `Not enough Supplies. Need ${cost.amount}, have ${gameData.supplies}.` };
      }
      if (cost.resourceId === 'alloy_fragments' && gameData.alloyFragments < cost.amount) {
        showNotification(`합금 조각 부족 (필요: ${cost.amount}, 보유: ${gameData.alloyFragments})`, "error");
        return { success: false, message: `Not enough Alloy Fragments. Need ${cost.amount}, have ${gameData.alloyFragments}.` };
      }
    }

    setGameData(prev => {
      let newSupplies = prev.supplies;
      let newAlloyFragments = prev.alloyFragments;

      itemDefinition.cost.forEach(c => {
        if (c.resourceId === 'supplies') newSupplies -= c.amount;
        if (c.resourceId === 'alloy_fragments') newAlloyFragments -= c.amount;
      });

      const newItemInstance: PlayerInventoryItem = {
        itemId: itemDefinition.id,
        instanceId: generateInstanceId(itemDefinition.id),
      };

      return {
        ...prev,
        supplies: newSupplies,
        alloyFragments: newAlloyFragments,
        playerInventory: [...prev.playerInventory, newItemInstance]
      };
    });
    showNotification(`${itemDefinition.name} 아이템을 제작했습니다!`, "success");
    return { success: true, message: `${itemDefinition.name} crafted successfully!` };
  };

  const equipItem = (unitId: string, slot: EquipmentSlotType, itemInstanceId: string): { success: boolean, message: string } => {
    const unitToEquip = gameData.teamUnits.find(u => u.id === unitId);
    if(!unitToEquip) {
        showNotification("장착할 유닛을 찾을 수 없습니다.", "error");
        return { success: false, message: "Unit to equip not found." };
    }
    const itemInInventory = gameData.playerInventory.find(item => item.instanceId === itemInstanceId);
    if (!itemInInventory) {
        showNotification("아이템 인스턴스가 인벤토리에 없습니다.", "error");
        return { success: false, message: "Item instance not found in inventory." };
    }
    
    const itemDefinition = ALL_CRAFTABLE_ITEMS[itemInInventory.itemId];
    if (!itemDefinition) {
        showNotification("아이템 정의를 찾을 수 없습니다.", "error");
        return { success: false, message: "Item definition not found." };
    }
    if (itemDefinition.slotType !== slot) {
        showNotification(`${itemDefinition.name} 아이템은 ${slot} 슬롯에 장착할 수 없습니다.`, "error");
        return { success: false, message: `Item ${itemDefinition.name} cannot be equipped in ${slot} slot.` };
    }

    const isEquippedElsewhere = gameData.teamUnits.some(u => 
        u.id !== unitId && 
        (u.equipment.primaryWeapon === itemInstanceId || 
         u.equipment.weaponMod === itemInstanceId ||
         u.equipment.armorMod === itemInstanceId ||
         u.equipment.utilitySlot1 === itemInstanceId)
    );
    if (isEquippedElsewhere) {
        showNotification("아이템이 이미 다른 유닛에 의해 장착되어 있습니다.", "error");
        return { success: false, message: "Item is already equipped by another unit."};
    }

    setGameData(prev => {
        const newTeamUnits = prev.teamUnits.map(unit => {
            if (unit.id === unitId) {
                const newEquipment = { ...unit.equipment };
                // Unequip from other slots if it's already equipped there by the same unit
                if(newEquipment.primaryWeapon === itemInstanceId && slot !== 'primaryWeapon') newEquipment.primaryWeapon = undefined;
                if(newEquipment.weaponMod === itemInstanceId && slot !== 'weaponMod') newEquipment.weaponMod = undefined;
                if(newEquipment.armorMod === itemInstanceId && slot !== 'armorMod') newEquipment.armorMod = undefined;
                if(newEquipment.utilitySlot1 === itemInstanceId && slot !== 'utilitySlot1') newEquipment.utilitySlot1 = undefined;
                
                // Also unequip whatever was previously in the target slot
                // (This item is returned to global inventory implicitly by not being equipped)
                newEquipment[slot] = itemInstanceId;
                return { ...unit, equipment: newEquipment };
            }
            return unit;
        });
        return { ...prev, teamUnits: newTeamUnits };
    });
    showNotification(`${itemDefinition.name} 아이템을 ${unitToEquip.name}의 ${slot} 슬롯에 장착했습니다.`, "success");
    return { success: true, message: `${itemDefinition.name} equipped to ${slot}.` };
  };

  const unequipItem = (unitId: string, slot: EquipmentSlotType): { success: boolean, message: string } => {
    const unit = gameData.teamUnits.find(u => u.id === unitId);
    if (!unit) {
        showNotification("유닛을 찾을 수 없습니다.", "error");
        return { success: false, message: "Unit not found."};
    }
    
    const itemInstanceId = unit.equipment[slot];
    if (!itemInstanceId) {
        showNotification("해당 슬롯에 아이템이 없습니다.", "info");
        return { success: false, message: "No item in that slot."};
    }
    
    const itemInInventory = gameData.playerInventory.find(item => item.instanceId === itemInstanceId);
    const itemDefinition = itemInInventory ? ALL_CRAFTABLE_ITEMS[itemInInventory.itemId] : null;


    setGameData(prev => {
        const newTeamUnits = prev.teamUnits.map(u => {
            if (u.id === unitId) {
                const newEquipment = { ...u.equipment };
                newEquipment[slot] = undefined;
                return { ...u, equipment: newEquipment };
            }
            return u;
        });
        return { ...prev, teamUnits: newTeamUnits };
    });
    showNotification(`${itemDefinition?.name || '아이템'}을(를) ${unit.name}의 ${slot} 슬롯에서 해제했습니다.`, "success");
    return { success: true, message: `${itemDefinition?.name || 'Item'} unequipped from ${slot}.` };
  };

  const resetGameData = useCallback(() => {
    console.log("Attempting to reset game data...");
    localStorage.removeItem(LOCAL_STORAGE_KEY_GAME_DATA);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TEAM_UNITS); // Older key
    localStorage.removeItem(LOCAL_STORAGE_KEY_RESEARCH_STATE); // Older key

    const initialData = loadGameData(); 
    setGameData(initialData);
    setCurrentScreen(GameScreen.MainMenu); 
    showNotification("게임 데이터가 성공적으로 초기화되었습니다.", "success");
    console.log("Game data has been reset.");
  }, [showNotification, setGameData, setCurrentScreen]);


  const checkForNewMissions = useCallback(() => {
    setGameData(prevData => {
      const availableMissionSlots = MAX_ACTIVE_MISSIONS - prevData.activeMissions.filter(m => m.status === 'available').length;
      if (availableMissionSlots > 0) {
        const newMissions = generateInitialMissions(Math.min(availableMissionSlots, 2)); 
        if (newMissions.length > 0) {
          console.log(`Generated ${newMissions.length} new missions.`);
           showNotification(`${newMissions.length}개의 새로운 임무가 발생했습니다!`, "info");
          return {
            ...prevData,
            activeMissions: [...prevData.activeMissions, ...newMissions]
          };
        }
      }
      return prevData;
    });
  }, [showNotification]); // Added showNotification dependency

  useEffect(() => {
    const intervalId = setInterval(() => {
      // checkForNewMissions(); // Disabled automatic mission generation for now based on previous instruction
    }, 60000); 
    return () => clearInterval(intervalId);
  }, [checkForNewMissions]);


  return (
    <GameContext.Provider value={{ 
      gameData, 
      setGameData, 
      currentScreen, 
      setCurrentScreen: navigateTo, 
      currentMissionForCombat, 
      startMissionCombat, 
      completeMissionCombat,
      startResearchProject,
      advanceActiveResearch,
      acknowledgeResearchCompletion, 
      recruitNewUnit,
      dismissTeamUnit,
      updateTeamUnitName,
      craftItem, 
      equipItem,
      unequipItem,
      supplies: gameData.supplies,
      alloyFragments: gameData.alloyFragments, 
      checkForNewMissions,
      clearLastCompletedMissionDetails,
      notification,
      showNotification,
      resetGameData,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
