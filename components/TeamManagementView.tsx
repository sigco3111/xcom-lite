
import React, { useState, useEffect, useCallback } from 'react';
import { Unit, Allegiance, SavedUnitInfo, EquipmentSlots, EquipmentSlotType, PlayerInventoryItem, CraftableItem, AbilityDefinition } from '../types';
import Button from './Button';
import { PLAYER_COLOR, UNIT_TEMPLATES, RANKS, ALL_CRAFTABLE_ITEMS, UNIT_SIZE, UNIT_BASE_HEIGHT, ALL_ABILITIES } from '../constants';
import { calculateEffectiveUnitStats } from '../utils/applyResearchEffects';
import { useGame } from '../contexts/GameContext'; 

// Available recruit templates (references template IDs from UNIT_TEMPLATES)
const availableRecruitTemplateIds: string[] = ['rookie', 'sniper', 'assault', 'heavy'];


// SVG Icons
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>;
const BoltIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const ArrowTrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
const ArrowsPointingOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.608V9.6c4.286 0 7.883-3.467 7.883-7.75 0-1.282-.27-2.512-.748-3.636M12 13.5V3.75m0 9.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m0 0H9m1.5-1.5L8.25 9.75M12 13.5c.621 0 1.125-.504 1.125-1.125S10.875 11.25 10.875 11.875s.504 1.125 1.125 1.125z" /></svg>;
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.502 0c-.985 0-1.93.184-2.796.533M7.002 11.175a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>;
const LightningBoltIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 inline-block text-yellow-300"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15.036+6.364l-1.06-1.06M21.75 7.25l-1.06-1.06M12 20.25v-1.5m0-15v-1.5m-6.364 15.036l1.06-1.06M7.25 5.25l1.06 1.06M12 4.5a7.5 7.5 0 00-7.5 7.5h15a7.5 7.5 0 00-7.5-7.5z" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 inline-block text-yellow-400"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.82.61l-4.725-2.885a.563.563 0 00-.652 0l-4.725 2.885a.562.562 0 01-.82-.61l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;


interface DisplayedUnit extends Unit {
  // Unit already includes baseAbilities from calculateEffectiveUnitStats
}


interface TeamManagementViewProps {
  onBackToMenu: () => void;
  isEmbeddedInHub?: boolean; // New prop
}

const TeamManagementView: React.FC<TeamManagementViewProps> = ({ onBackToMenu, isEmbeddedInHub = false }) => {
  const { gameData, recruitNewUnit, dismissTeamUnit, updateTeamUnitName, equipItem, unequipItem } = useGame();
  const [displayedTeamUnits, setDisplayedTeamUnits] = useState<DisplayedUnit[]>([]);

  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [showDismissConfirmModal, setShowDismissConfirmModal] = useState(false);
  const [unitToDismiss, setUnitToDismiss] = useState<DisplayedUnit | null>(null);
  
  const [editingUnit, setEditingUnit] = useState<DisplayedUnit | null>(null);
  const [newName, setNewName] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [unitForEquipment, setUnitForEquipment] = useState<SavedUnitInfo | null>(null);


  const displayNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };


  useEffect(() => {
    const enhancedUnits = gameData.teamUnits.map(savedInfo => {
      const effectiveStats = calculateEffectiveUnitStats(
        savedInfo, 
        gameData.researchState.completedProjects,
        gameData.playerInventory
      );
      return {
        ...effectiveStats, 
        id: savedInfo.id,
        name: savedInfo.name, 
        templateId: savedInfo.templateId, 
        allegiance: Allegiance.PLAYER, 
        position: { x: 0, y: 0 }, 
        color: PLAYER_COLOR,
        size: { width: UNIT_SIZE, height: UNIT_BASE_HEIGHT, depth: UNIT_SIZE },
        // activeAbilities and temporaryEffects are part of effectiveStats now
        hasMovedThisTurn: false, // Default for non-combat view
      };
    });
    setDisplayedTeamUnits(enhancedUnits);
  }, [gameData.teamUnits, gameData.researchState.completedProjects, gameData.playerInventory]);

  // Effect to keep unitForEquipment state in sync with gameData when modal is open
  useEffect(() => {
    if (showEquipmentModal && unitForEquipment) {
      const freshUnitData = gameData.teamUnits.find(u => u.id === unitForEquipment.id);
      if (freshUnitData) {
        // Only update if the equipment data has actually changed to prevent potential loops
        if (JSON.stringify(freshUnitData.equipment) !== JSON.stringify(unitForEquipment.equipment)) {
          setUnitForEquipment(freshUnitData);
        }
      } else {
        // Unit might have been dismissed or data became inconsistent
        setShowEquipmentModal(false);
        setUnitForEquipment(null);
      }
    }
  }, [gameData.teamUnits, unitForEquipment, showEquipmentModal]);


  const handleRecruitUnitClicked = (templateIdToRecruit: string) => {
    const result = recruitNewUnit(templateIdToRecruit); 
    displayNotification(result.message);
    if(result.success) {
      setShowRecruitModal(false);
    }
  };

  const openDismissModal = (unit: DisplayedUnit) => {
    setUnitToDismiss(unit);
    setShowDismissConfirmModal(true);
  };

  const confirmDismissUnitClicked = () => {
    if (unitToDismiss) {
      const result = dismissTeamUnit(unitToDismiss.id);
      displayNotification(result.message);
    }
    setShowDismissConfirmModal(false);
    setUnitToDismiss(null);
  };
  
  const handleEditName = (unit: DisplayedUnit) => {
    setEditingUnit(unit);
    setNewName(unit.name);
  };

  const handleSaveName = () => {
    if (editingUnit && newName.trim() !== "") {
      const result = updateTeamUnitName(editingUnit.id, newName.trim());
      displayNotification(result.message);
      setEditingUnit(null);
    }
  };
  
  const openEquipmentModal = (unitId: string) => {
    const savedUnit = gameData.teamUnits.find(u => u.id === unitId);
    if (savedUnit) {
      setUnitForEquipment(savedUnit);
      setShowEquipmentModal(true);
    }
  };

  const handleEquipItem = (slot: EquipmentSlotType, itemInstanceId: string) => {
    if (unitForEquipment) {
      const result = equipItem(unitForEquipment.id, slot, itemInstanceId);
      displayNotification(result.message);
      // The useEffect will handle updating unitForEquipment if the equip was successful
    }
  };

  const handleUnequipItem = (slot: EquipmentSlotType) => {
    if (unitForEquipment) {
      const result = unequipItem(unitForEquipment.id, slot);
      displayNotification(result.message);
      // The useEffect will handle updating unitForEquipment if the unequip was successful
    }
  };

  const getXpProgress = (unit: DisplayedUnit): { currentXpInRank: number, xpForNextRankInCurrent: number, percentage: number, nextRankName: string | null } => {
    const currentRankData = RANKS.find(r => r.name === unit.rank);
    if (!currentRankData) return { currentXpInRank: 0, xpForNextRankInCurrent: 100, percentage: 0, nextRankName: null };
    
    const currentRankIndex = RANKS.indexOf(currentRankData);
    
    let xpAccumulatedForPriorRanks = 0;
    for (let i = 0; i < currentRankIndex; i++) {
        xpAccumulatedForPriorRanks += RANKS[i].xpToNextRank || 0;
    }
    
    const currentXpInRank = unit.experience - xpAccumulatedForPriorRanks;
    const xpForNextRankInCurrent = currentRankData.xpToNextRank || Infinity; 
    const nextRankName = currentRankIndex < RANKS.length - 1 ? RANKS[currentRankIndex + 1].name : null;
    
    let percentage = 0;
    if (xpForNextRankInCurrent !== Infinity && xpForNextRankInCurrent > 0) {
      percentage = Math.min(100, (currentXpInRank / xpForNextRankInCurrent) * 100);
    } else if (xpForNextRankInCurrent === Infinity) { 
        percentage = 100;
    }

    return { currentXpInRank, xpForNextRankInCurrent, percentage, nextRankName };
  };

  const EquipmentDisplay: React.FC<{ equipment: EquipmentSlots, unitId: string }> = ({ equipment, unitId }) => {
    const getEquippedItemName = (instanceId?: string) => {
      if (!instanceId) return <span className="text-gray-500">비어있음</span>;
      const inventoryItem = gameData.playerInventory.find(item => item.instanceId === instanceId);
      if (!inventoryItem) return <span className="text-red-500">아이템 오류</span>;
      const itemDef = ALL_CRAFTABLE_ITEMS[inventoryItem.itemId];
      return itemDef ? <span className="text-cyan-300">{itemDef.icon} {itemDef.name}</span> : <span className="text-red-500">알 수 없는 아이템</span>;
    };

    return (
      <div className="mt-2 text-xs space-y-1">
        <p><strong>주무기:</strong> {getEquippedItemName(equipment.primaryWeapon)}</p>
        <p><strong>무기 모드:</strong> {getEquippedItemName(equipment.weaponMod)}</p>
        <p><strong>방어구 모드:</strong> {getEquippedItemName(equipment.armorMod)}</p>
        <p><strong>유틸리티:</strong> {getEquippedItemName(equipment.utilitySlot1)}</p>
        <Button onClick={() => openEquipmentModal(unitId)} className="w-full text-xs mt-1 py-1 bg-slate-600 hover:bg-slate-500">
            <CogIcon /> 장비 관리
        </Button>
      </div>
    );
  };
  
  const AbilitiesDisplay: React.FC<{ abilities: string[] }> = ({ abilities }) => {
    if (!abilities || abilities.length === 0) {
      return <p className="text-xs text-gray-500 mt-1">특수 능력 없음</p>;
    }
    return (
      <div className="mt-2 text-xs">
        <p className="font-semibold text-purple-300 mb-0.5">능력:</p>
        <ul className="space-y-0.5">
          {abilities.map(abilityId => {
            const def = ALL_ABILITIES[abilityId];
            return def ? (
              <li key={abilityId} className="flex items-center text-gray-300" title={def.description}>
                <span className="mr-1">{def.icon || '⚡'}</span>{def.name} <span className="ml-1 text-gray-400">({def.apCost}AP, {def.cooldownTurns}턴 쿨)</span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    );
  };


  const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <p className="flex items-center text-xs">
      {icon}
      <span className="font-semibold">{label}:</span>&nbsp;{value}
    </p>
  );

  return (
    <div className={`w-full ${isEmbeddedInHub ? 'max-w-full h-full bg-gray-900' : 'max-w-6xl mx-auto bg-gray-800 rounded-xl shadow-2xl max-h-[95vh]'} p-4 sm:p-6 flex flex-col`}>
      {!isEmbeddedInHub && (
         <h2 className="text-3xl sm:text-4xl font-bold text-sky-400 mb-6 text-center">분대 관리</h2>
      )}
      
       {notification && (
        <div className="my-2 p-2.5 rounded-md bg-blue-600 text-white text-center text-sm shadow-lg flex-shrink-0">
          {notification}
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-center items-center gap-4 flex-shrink-0">
        <Button onClick={() => setShowRecruitModal(true)} variant="primary" className="text-lg px-6 py-3">
          <UserPlusIcon /> 새 분대원 모집
        </Button>
      </div>

      {displayedTeamUnits.length === 0 ? (
        <p className="text-gray-400 text-center text-lg flex-grow flex items-center justify-center">현재 영입된 분대원이 없습니다.</p>
      ) : (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 p-1 custom-scrollbar overflow-y-auto pr-2">
          {displayedTeamUnits.map((unit) => { 
            const { currentXpInRank, xpForNextRankInCurrent, percentage: xpPercentage, nextRankName } = getXpProgress(unit);
            const templateDisplayName = UNIT_TEMPLATES[unit.templateId]?.name || unit.templateId;

            return (
            <div key={unit.id} className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-150 flex flex-col">
              <div className="flex items-start mb-2">
                <div className="mr-3 sm:mr-4 shrink-0">
                  <UserCircleIcon />
                </div>
                <div className="flex-grow">
                 {editingUnit?.id === unit.id ? (
                    <div className="flex items-center">
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-gray-600 text-white p-1 rounded mr-2 text-lg font-semibold w-full"
                        autoFocus
                      />
                      <Button onClick={handleSaveName} className="p-1 text-xs">저장</Button>
                    </div>
                  ) : (
                    <h3 className="text-lg sm:text-xl font-semibold text-yellow-400 flex items-center">
                      {unit.name} 
                      <button onClick={() => handleEditName(unit)} className="ml-2 text-sky-400 hover:text-sky-300 p-0.5" aria-label={`Edit name for ${unit.name}`}>
                        <PencilIcon />
                      </button>
                    </h3>
                  )}
                  <p className="text-xs text-gray-400">({templateDisplayName})</p>
                  <p className="text-sm font-semibold text-green-400 flex items-center"><StarIcon />{unit.rank}</p>
                </div>
                <Button 
                  onClick={() => openDismissModal(unit)} 
                  variant="danger" 
                  className="p-1.5 sm:p-2 ml-2 shrink-0"
                  aria-label={`Dismiss ${unit.name}`}
                >
                  <TrashIcon />
                </Button>
              </div>

              {/* XP Bar */}
              <div className="my-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>XP: {currentXpInRank} / {xpForNextRankInCurrent === Infinity ? 'MAX' : xpForNextRankInCurrent}</span>
                  {nextRankName && <span>다음 계급: {nextRankName}</span>}
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2.5 mt-0.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${xpPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={xpPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${unit.name} 경험치 진행도`}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-sm text-gray-300 my-1">
                <StatItem icon={<HeartIcon />} label="체력" value={`${unit.health}/${unit.maxHealth}`} />
                <StatItem icon={<ArrowTrendingUpIcon />} label="이동력" value={`${unit.moveSpeed}`} />
                <StatItem icon={<BoltIcon />} label="행동력" value={`${unit.actionPoints}/${unit.maxActionPoints}`} />
                <StatItem icon={<ArrowsPointingOutIcon />} label="사거리" value={`${unit.attackRange}`} />
                <StatItem icon={<FireIcon />} label="공격력" value={unit.attackDamage} />
              </div>
              
              <EquipmentDisplay equipment={unit.equipment} unitId={unit.id} />
              <AbilitiesDisplay abilities={unit.baseAbilities} /> 
              
            </div>
          );
        })}
        </div>
      )}
      
      {!isEmbeddedInHub && (
        <div className="mt-auto pt-6">
          <Button onClick={onBackToMenu} className="w-full bg-gray-600 hover:bg-gray-700 text-lg py-3">
            메인 메뉴로 돌아가기
          </Button>
        </div>
      )}


      {/* Recruit Modal */}
      {showRecruitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"  aria-modal="true" role="dialog">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-sky-400">새 분대원 모집</h3>
              <button onClick={() => setShowRecruitModal(false)} className="text-gray-400 hover:text-white" aria-label="모집 창 닫기">
                <XMarkIcon />
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-3">현재 보급품: {gameData.supplies}. (모집 비용: 25)</p>
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2">
              {availableRecruitTemplateIds.map((templateId) => {
                const baseTemplate = UNIT_TEMPLATES[templateId];
                if (!baseTemplate) return null;
                const tempSavedInfo: SavedUnitInfo = { id: 'temp', templateId, name: 'temp', experience: 0, rank: RANKS[0].name, equipment: {}};
                const displayedRecruitStats = calculateEffectiveUnitStats(tempSavedInfo, gameData.researchState.completedProjects, gameData.playerInventory);
                return (
                  <div key={templateId} className="bg-gray-700 p-4 rounded-md hover:bg-gray-600 transition-colors">
                    <h4 className="text-lg font-semibold text-yellow-300">{baseTemplate.name}</h4>
                    <p className="text-xs text-gray-400">
                      체력: {displayedRecruitStats.maxHealth}, 이동: {displayedRecruitStats.moveSpeed}, 공격: {displayedRecruitStats.attackDamage}, 범위: {displayedRecruitStats.attackRange}, 행동력: {displayedRecruitStats.maxActionPoints}
                      <span className="text-sky-300 ml-1">(연구 효과 적용됨)</span>
                    </p>
                    <Button 
                      onClick={() => handleRecruitUnitClicked(templateId)} 
                      variant="primary" 
                      className="mt-2 w-full text-sm py-1.5"
                      disabled={gameData.supplies < 25} 
                    >
                      이 대원 모집 ({baseTemplate.name})
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dismiss Confirmation Modal */}
      {showDismissConfirmModal && unitToDismiss && (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">분대원 해고 확인</h3>
            <p className="text-gray-300 mb-6">정말로 <span className="font-semibold text-white">{unitToDismiss.name}</span> 대원을 해고하시겠습니까? 이 결정은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end space-x-3">
              <Button onClick={() => setShowDismissConfirmModal(false)} variant="secondary">
                취소
              </Button>
              <Button onClick={confirmDismissUnitClicked} variant="danger">
                해고 확인
              </Button>
            </div>
          </div>
        </div>
      )}

       {/* Equipment Modal */}
      {showEquipmentModal && unitForEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
          <div className="bg-gray-800 p-5 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-sky-400">장비 관리: {unitForEquipment.name}</h3>
              <button onClick={() => setShowEquipmentModal(false)} className="text-gray-400 hover:text-white" aria-label="장비 관리 창 닫기">
                <XMarkIcon />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2 text-sm">
              {(Object.keys(unitForEquipment.equipment) as EquipmentSlotType[]).map(slotKey => {
                const equippedItemInstanceId = unitForEquipment.equipment[slotKey];
                const equippedItem = gameData.playerInventory.find(pi => pi.instanceId === equippedItemInstanceId);
                const equippedItemDef = equippedItem ? ALL_CRAFTABLE_ITEMS[equippedItem.itemId] : null;

                const availableItemsForSlot = gameData.playerInventory.filter(invItem => {
                  const itemDef = ALL_CRAFTABLE_ITEMS[invItem.itemId];
                  if (!itemDef || itemDef.slotType !== slotKey) return false; 
                  const isEquippedByOtherUnit = gameData.teamUnits.some(u => 
                    u.id !== unitForEquipment!.id && 
                    Object.values(u.equipment).includes(invItem.instanceId)
                  );
                  return !isEquippedByOtherUnit || invItem.instanceId === equippedItemInstanceId;
                });

                const slotDisplayNameMapping: Record<EquipmentSlotType, string> = {
                  primaryWeapon: "주무기",
                  weaponMod: "무기 모듈",
                  armorMod: "방어구 모듈",
                  utilitySlot1: "유틸리티 아이템"
                };

                return (
                  <div key={slotKey} className="p-3 bg-gray-700 rounded-md">
                    <p className="font-semibold text-gray-200 mb-1">{slotDisplayNameMapping[slotKey]}:</p>
                    {equippedItemDef ? (
                      <div className="flex justify-between items-center bg-gray-600 p-2 rounded mb-1">
                        <span className="text-cyan-300">{equippedItemDef.icon} {equippedItemDef.name}</span>
                        <Button onClick={() => handleUnequipItem(slotKey)} variant="danger" className="py-0.5 px-1.5 text-xs">해제</Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 mb-1 italic">비어있음</p>
                    )}
                    <select 
                      onChange={(e) => e.target.value && handleEquipItem(slotKey, e.target.value)}
                      value={equippedItemInstanceId || ""}
                      className="w-full bg-gray-600 text-white p-1.5 rounded border border-gray-500 text-xs"
                      aria-label={`${slotDisplayNameMapping[slotKey]} 선택`}
                    >
                      <option value="">-- 장착할 아이템 선택 --</option>
                      {availableItemsForSlot.map(invItem => {
                        const itemDef = ALL_CRAFTABLE_ITEMS[invItem.itemId];
                        return (
                          <option key={invItem.instanceId} value={invItem.instanceId} disabled={equippedItemInstanceId === invItem.instanceId && !!equippedItemInstanceId}>
                            {itemDef?.name || "알 수 없는 아이템"} ({itemDef?.type})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
             <div className="mt-4">
                <Button onClick={() => setShowEquipmentModal(false)} className="w-full py-2">닫기</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamManagementView;
