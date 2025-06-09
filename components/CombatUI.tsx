import React from 'react';
import { Unit, Allegiance, PendingActionType, AbilityDefinition } from '../types';
import Button from './Button';
import { ALL_ABILITIES } from '../constants'; // To get ability details

interface CombatUIProps {
  selectedUnit: Unit | null;
  onEndTurn: () => void;
  onAction: (actionType: 'move' | 'attack' | 'skip') => void; // Standard actions
  onAbilityActionSelected: (abilityId: string) => void; // New prop for selecting an ability
  currentTurn: Allegiance;
  messageLog: string[];
  onBackToMenu: () => void;
  isGameOver: boolean;
  isCombatDelegated: boolean;
  onToggleDelegateCombat: () => void;
  isAiProcessing: boolean; 
}

// Simple icon mapping for demo
const getAbilityIcon = (iconStr?: string) => {
  if (!iconStr) return '⚡'; // Default icon
  if (iconStr === '🎯') return '🎯';
  if (iconStr === '💥') return '💥';
  if (iconStr === '💨') return '💨';
  return iconStr; // Allow other emojis or short strings
};


const CombatUI: React.FC<CombatUIProps> = ({ 
  selectedUnit, 
  onEndTurn, 
  onAction, 
  onAbilityActionSelected,
  currentTurn, 
  messageLog, 
  onBackToMenu, 
  isGameOver,
  isCombatDelegated,
  onToggleDelegateCombat,
  isAiProcessing 
}) => {
  const playerTurnAndDelegated = currentTurn === Allegiance.PLAYER && isCombatDelegated;
  const disablePlayerActions = isGameOver || isAiProcessing || playerTurnAndDelegated || currentTurn !== Allegiance.PLAYER;
  const disableDelegateToggle = isGameOver || currentTurn !== Allegiance.PLAYER;


  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar: Turn Info & Menu Button */}
      <div className="flex justify-between items-start">
        <div className="bg-gray-800 bg-opacity-80 p-3 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-sky-400">
            턴: {currentTurn === Allegiance.PLAYER ? '플레이어' : '적'}
            {isAiProcessing && currentTurn === Allegiance.PLAYER && isCombatDelegated && ' (AI 자동 진행 중...)'}
            {isAiProcessing && currentTurn === Allegiance.ENEMY && ' (적 AI 처리 중...)'}
          </h2>
          {currentTurn === Allegiance.PLAYER && (
            <div className="mt-2">
              <label 
                htmlFor="delegateCombatToggle" 
                className={`flex items-center space-x-2 text-gray-200 p-2 rounded-md transition-colors duration-150
                            ${disableDelegateToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'}
                            pointer-events-auto`}
              >
                <input
                  type="checkbox"
                  id="delegateCombatToggle"
                  checked={isCombatDelegated}
                  onChange={onToggleDelegateCombat}
                  disabled={disableDelegateToggle}
                  className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-400 disabled:opacity-50"
                />
                <span className="text-sm sm:text-base">전투 위임 (AI 자동 플레이)</span>
              </label>
            </div>
          )}
        </div>
        <Button 
          onClick={onBackToMenu} 
          className="pointer-events-auto bg-gray-700 hover:bg-gray-600"
          disabled={isAiProcessing && currentTurn !== Allegiance.PLAYER} 
        >
          메뉴로 돌아가기
        </Button>
      </div>

      {/* Bottom Bar: Selected Unit Info & Actions / General Actions */}
      <div className="flex justify-between items-end space-x-4">
        {/* Message Log */}
        <div className="w-1/3 bg-gray-800 bg-opacity-80 p-3 rounded-lg shadow-lg max-h-40 overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold text-sky-300 mb-1">이벤트 로그</h3>
          {messageLog.length === 0 && <p className="text-sm text-gray-400">아직 이벤트가 없습니다.</p>}
          {messageLog.slice(-5).map((msg, index) => (
            <p key={index} className="text-sm text-gray-300">{msg}</p>
          ))}
        </div>
        
        {/* Selected Unit Panel */}
        <div className="w-1/3 bg-gray-800 bg-opacity-80 p-3 rounded-lg shadow-lg text-center">
          {selectedUnit && !playerTurnAndDelegated ? (
            <>
              <h3 className="text-xl font-bold text-yellow-400">{selectedUnit.name}</h3>
              <p className="text-sm text-gray-200">체력: {selectedUnit.health}/{selectedUnit.maxHealth}</p>
              <p className="text-sm text-gray-200">행동력: {selectedUnit.actionPoints}/{selectedUnit.maxActionPoints}</p>
              
              <div className="mt-2 space-x-1 flex flex-wrap justify-center gap-1">
                <Button 
                  onClick={() => onAction('move')} 
                  className="pointer-events-auto bg-green-500 hover:bg-green-600 text-xs px-2 py-1" 
                  disabled={disablePlayerActions || selectedUnit.actionPoints < 1}
                  aria-label="Move selected unit"
                >
                  이동
                </Button>
                <Button 
                  onClick={() => onAction('attack')} 
                  className="pointer-events-auto bg-red-500 hover:bg-red-600 text-xs px-2 py-1" 
                  disabled={disablePlayerActions || selectedUnit.actionPoints < 1}
                  aria-label="Attack with selected unit"
                >
                  공격
                </Button>
                <Button 
                  onClick={() => onAction('skip')} 
                  className="pointer-events-auto bg-gray-500 hover:bg-gray-600 text-xs px-2 py-1"
                  disabled={disablePlayerActions}
                  aria-label="Selected unit waits"
                >
                  대기
                </Button>
              </div>
              {/* Abilities Section */}
              {selectedUnit.baseAbilities && selectedUnit.baseAbilities.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <h4 className="text-sm font-semibold text-sky-300 mb-1">능력:</h4>
                  <div className="space-x-1 flex flex-wrap justify-center gap-1">
                    {selectedUnit.baseAbilities.map(abilityId => {
                      const abilityDef = ALL_ABILITIES[abilityId];
                      const abilityStatus = selectedUnit.activeAbilities.find(sa => sa.abilityId === abilityId);
                      if (!abilityDef || !abilityStatus) return null;

                      const isOnCooldown = abilityStatus.cooldownRemaining > 0;
                      const canAffordAP = selectedUnit.actionPoints >= abilityDef.apCost;
                      const isDisabled = disablePlayerActions || !canAffordAP || isOnCooldown;
                      
                      let buttonText = `${getAbilityIcon(abilityDef.icon)} ${abilityDef.name} (${abilityDef.apCost}AP)`;
                      if (isOnCooldown) {
                        buttonText = `${getAbilityIcon(abilityDef.icon)} ${abilityDef.name} (쿨다운: ${abilityStatus.cooldownRemaining}턴)`;
                      }


                      return (
                        <Button
                          key={abilityId}
                          onClick={() => onAbilityActionSelected(abilityId)}
                          className={`pointer-events-auto text-xs px-2 py-1 min-w-[80px]
                                      ${isDisabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                          disabled={isDisabled}
                          title={abilityDef.description}
                          aria-label={`Use ability: ${abilityDef.name}`}
                        >
                          {buttonText}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : playerTurnAndDelegated ? (
             <p className="text-gray-300">플레이어 AI가 턴을 진행 중입니다...</p>
          ) : (
            <p className="text-gray-400">유닛을 선택하세요.</p>
          )}
        </div>

        {/* General Actions Panel */}
        <div className="w-1/3 flex justify-end">
          <Button 
            onClick={onEndTurn} 
            className="pointer-events-auto bg-indigo-600 hover:bg-indigo-700 text-lg px-6 py-3"
            disabled={disablePlayerActions}
            aria-label="End current turn"
          >
            턴 종료
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CombatUI;