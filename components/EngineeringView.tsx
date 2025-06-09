
import React, { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import Button from './Button';
import { CraftableItem, ResourceCost, PlayerInventoryItem } from '../types';
import { ALL_CRAFTABLE_ITEMS, ALLOY_FRAGMENTS_RESOURCE_ID } from '../constants';

// --- Icons (Minimalistic for now) ---
const WrenchScrewdriverIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M11.42 15.17L14.49 12.1M11.42 15.17l-1.59 1.59M14.49 12.1L12.41 10.03M14.49 12.1L12 14.49M10.03 12.41L12 14.49m0 0l2.07-2.07M10.03 12.41L7.96 14.49m2.07-2.07L14.49 7.96m-4.46 4.45L7.96 10.03m2.07 2.38L10.03 7.96m0 0L7.96 10.03m2.07-2.07L12 5.51m0 0L9.92 7.58m2.08-2.07L14.08 7.58 12 5.51z" /></svg>;
const CubeTransparentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-1 inline-block text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LightBulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311V21m-3.75-2.311V21m0 0a1.5 1.5 0 01-1.5-1.5M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4.5 0V9" /></svg>;
// --- End Icons ---

interface EngineeringViewProps {
  onBackToMenu: () => void;
  isEmbeddedInHub?: boolean; // New prop
}

const EngineeringView: React.FC<EngineeringViewProps> = ({ onBackToMenu, isEmbeddedInHub = false }) => {
  const { gameData, craftItem } = useGame();
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [filterType, setFilterType] = useState<CraftableItem['type'] | 'all'>('all');

  const displayNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCraftItemClicked = (itemId: string) => {
    const result = craftItem(itemId);
    displayNotification(result.message, result.success ? 'success' : 'error');
  };

  const unlockedCraftableItems = useMemo(() => {
    return Object.values(ALL_CRAFTABLE_ITEMS).filter(item => 
      gameData.researchState.completedProjects.includes(item.requiredResearchId) &&
      (filterType === 'all' || item.type === filterType)
    );
  }, [gameData.researchState.completedProjects, filterType]);

  const getItemCountInInventory = (itemId: string): number => {
    return gameData.playerInventory.filter(invItem => invItem.itemId === itemId).length;
  };

  const canAffordItem = (item: CraftableItem): boolean => {
    for (const cost of item.cost) {
      if (cost.resourceId === 'supplies' && gameData.supplies < cost.amount) return false;
      if (cost.resourceId === ALLOY_FRAGMENTS_RESOURCE_ID && gameData.alloyFragments < cost.amount) return false;
    }
    return true;
  };

  const itemTypes = useMemo(() => {
    const types = new Set(Object.values(ALL_CRAFTABLE_ITEMS).map(item => item.type));
    return ['all', ...Array.from(types)];
  }, []);

  return (
    <div className={`w-full ${isEmbeddedInHub ? 'max-w-full h-full bg-gray-900' : 'max-w-5xl mx-auto bg-gray-800 rounded-xl shadow-2xl max-h-[95vh]'} p-4 sm:p-6 flex flex-col`}>
      {!isEmbeddedInHub && (
        <h2 className="text-3xl sm:text-4xl font-bold text-cyan-400 mb-4 text-center">기술실 / 제작</h2>
      )}
      
      {notification && (
        <div className={`my-2 p-2.5 rounded-md text-white text-center text-sm shadow-lg flex-shrink-0 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      {!isEmbeddedInHub && ( // Only show resource summary if not embedded (Hub shows it in main header)
        <div className="mb-4 p-3 bg-gray-700 rounded-lg shadow flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm flex-shrink-0">
          <span className="font-semibold text-gray-300"><span role="img" aria-label="Supplies" className="mr-1">🔩</span>보급품: {gameData.supplies}</span>
          <span className="font-semibold text-gray-300"><span role="img" aria-label="Alloy Fragments" className="mr-1">⚙️</span>합금 조각: {gameData.alloyFragments}</span>
        </div>
      )}


      <div className="mb-4 flex items-center space-x-2 flex-shrink-0">
        <label htmlFor="itemTypeFilter" className="text-gray-300 text-sm">필터:</label>
        <select 
          id="itemTypeFilter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CraftableItem['type'] | 'all')}
          className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-cyan-500 focus:border-cyan-500"
        >
          {itemTypes.map(type => (
            <option key={type} value={type}>{type === 'all' ? '전체 보기' : type}</option>
          ))}
        </select>
      </div>

      {unlockedCraftableItems.length === 0 ? (
        <p className="text-gray-400 text-center text-lg flex-grow flex items-center justify-center">
          {filterType === 'all' ? '제작 가능한 아이템이 없습니다. 연구를 통해 설계도를 해금하세요.' : '이 유형으로 제작 가능한 아이템이 없거나 설계도가 해금되지 않았습니다.'}
        </p>
      ) : (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-1 custom-scrollbar overflow-y-auto pr-2">
          {unlockedCraftableItems.map((item) => {
            const isAffordable = canAffordItem(item);
            const inventoryCount = getItemCountInInventory(item.id);
            return (
            <div key={item.id} className={`bg-gray-700 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-150 flex flex-col border ${isAffordable ? 'border-gray-600' : 'border-red-700 opacity-80'}`}>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{item.icon || <CubeTransparentIcon />}</span>
                <div>
                  <h3 className="text-md font-semibold text-cyan-300">{item.name}</h3>
                  <p className="text-xs text-gray-400">유형: {item.type} {inventoryCount > 0 && <span className="text-yellow-400 ml-1">(보유: {inventoryCount})</span>}</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 mb-1 leading-tight h-10 overflow-y-auto custom-scrollbar pr-1">{item.description}</p>
              
              <div className="text-xs text-gray-400 mt-1 mb-2">
                <p className="font-semibold text-gray-300">효과:</p>
                <ul className="list-disc list-inside pl-1">
                  {item.effects.map((effect, idx) => <li key={idx} className="truncate">{effect}</li>)}
                </ul>
              </div>

              <div className="text-xs text-gray-400 mt-auto pt-2">
                <p className="font-semibold text-gray-300">제작 비용:</p>
                <ul className="list-disc list-inside pl-1">
                  {item.cost.map(cost => (
                    <li key={cost.resourceId} className={
                      (cost.resourceId === 'supplies' && gameData.supplies < cost.amount) ||
                      (cost.resourceId === ALLOY_FRAGMENTS_RESOURCE_ID && gameData.alloyFragments < cost.amount)
                      ? 'text-red-400' : 'text-gray-300'
                    }>
                      {cost.resourceId === 'supplies' ? '보급품' : '합금 조각'}: {cost.amount}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleCraftItemClicked(item.id)}
                  disabled={!isAffordable}
                  className={`w-full mt-2 py-1.5 text-xs ${!isAffordable ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <WrenchScrewdriverIcon /> {isAffordable ? '제작' : '자원 부족'}
                </Button>
              </div>
            </div>
          );
        })}
        </div>
      )}
      
      {!isEmbeddedInHub && (
        <div className="mt-auto pt-6 flex-shrink-0">
          <Button onClick={onBackToMenu} className="w-full bg-gray-600 hover:bg-gray-700 text-lg py-3">
            메인 메뉴로 돌아가기
          </Button>
        </div>
      )}
    </div>
  );
};

export default EngineeringView;
