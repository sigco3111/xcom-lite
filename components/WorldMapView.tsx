
import React, { useState, useMemo } from 'react';
import Button from './Button';
import { Mission } from '../types'; // Ensure Mission is imported
import { useGame } from '../contexts/GameContext'; // Import useGame

export interface MapRegion { // Keep this local or move to types if used elsewhere
  id: string;
  name: string;
  description: string;
  gridX: number; 
  gridY: number; 
  baseColor: string; 
  hoverColor: string;
  textColor?: string; 
}

export const REGIONS_DATA: MapRegion[] = [ // Export for gameDataManager
  { id: 'urban_zone', name: '폐허 도시 구역', description: '한때 번화했던 대도시였으나, 지금은 그림자만이 남아 있습니다.', gridX: 0, gridY: 0, baseColor: 'bg-gray-700', hoverColor: 'hover:bg-gray-600', textColor: 'text-gray-100' },
  { id: 'xeno_forest', name: '외계 생태 숲', description: '기이한 동식물로 가득 찬 위험한 숲입니다.', gridX: 1, gridY: 0, baseColor: 'bg-green-800', hoverColor: 'hover:bg-green-700', textColor: 'text-green-100' },
  { id: 'desert_outpost', name: '사막 전초기지', description: '모래 폭풍 속에 잊혀진 연구 시설이 숨겨져 있습니다.', gridX: 2, gridY: 0, baseColor: 'bg-yellow-800', hoverColor: 'hover:bg-yellow-700', textColor: 'text-yellow-100' },
  { id: 'mountain_pass', name: '산악 통로', description: '고대 산맥을 가로지르는 전략적 요충지입니다.', gridX: 0, gridY: 1, baseColor: 'bg-indigo-800', hoverColor: 'hover:bg-indigo-700', textColor: 'text-indigo-100' },
  { id: 'coastal_ruins', name: '해안 폐허 도시', description: '파도에 침식된 과거 문명의 잔해입니다.', gridX: 1, gridY: 1, baseColor: 'bg-blue-800', hoverColor: 'hover:bg-blue-700', textColor: 'text-blue-100' },
  { id: 'arctic_site', name: '극지 이상 지점', description: '얼음 아래 미지의 신호가 감지되는 곳입니다.', gridX: 2, gridY: 1, baseColor: 'bg-cyan-800', hoverColor: 'hover:bg-cyan-700', textColor: 'text-cyan-100' },
  { id: 'underground_caverns', name: '지하 동굴망', description: '지표면 아래로 끝없이 펼쳐진 미궁입니다.', gridX: 0, gridY: 2, baseColor: 'bg-purple-800', hoverColor: 'hover:bg-purple-700', textColor: 'text-purple-100' },
  { id: 'volcanic_plains', name: '화산 평원', description: '불안정한 지각 활동이 계속되는 위험 지대입니다.', gridX: 1, gridY: 2, baseColor: 'bg-red-800', hoverColor: 'hover:bg-red-700', textColor: 'text-red-100' },
  { id: 'old_capital', name: '구 수도', description: '인류 저항의 마지막 보루였던 역사적인 도시입니다.', gridX: 2, gridY: 2, baseColor: 'bg-pink-800', hoverColor: 'hover:bg-pink-700', textColor: 'text-pink-100' },
];

const GRID_COLS = 3;
const SELECTED_REGION_BORDER_COLOR = 'border-sky-400';

interface WorldMapViewProps {
  onBackToMenu: () => void;
  isEmbeddedInHub?: boolean; // New prop
}

const WorldMapView: React.FC<WorldMapViewProps> = ({ onBackToMenu, isEmbeddedInHub = false }) => {
  const { gameData, startMissionCombat, checkForNewMissions } = useGame();
  const [selectedRegion, setSelectedRegion] = useState<MapRegion | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  const handleRegionClick = (region: MapRegion) => {
    setSelectedRegion(region);
    setSelectedMission(null); // Clear selected mission when region changes
  };

  const handleMissionSelect = (mission: Mission) => {
    setSelectedMission(mission);
  };

  const handleStartMission = () => {
    if (selectedMission) {
      startMissionCombat(selectedMission);
    }
  };
  
  React.useEffect(() => {
    checkForNewMissions(); // Check for new missions when map is loaded
  }, [checkForNewMissions]);


  const regionsInGridOrder = useMemo(() => {
    const grid: (MapRegion | null)[][] = Array(GRID_COLS).fill(null).map(() => Array(GRID_COLS).fill(null));
    REGIONS_DATA.forEach(region => {
      if (grid[region.gridY] && grid[region.gridY][region.gridX] === null) {
        grid[region.gridY][region.gridX] = region;
      }
    });
    return grid.flat().filter(r => r !== null) as MapRegion[];
  }, []);
  
  const missionsByRegion = useMemo(() => {
    const map = new Map<string, Mission[]>();
    gameData.activeMissions.filter(m => m.status === 'available').forEach(mission => {
      if (!map.has(mission.regionId)) {
        map.set(mission.regionId, []);
      }
      map.get(mission.regionId)?.push(mission);
    });
    return map;
  }, [gameData.activeMissions]);

  return (
    <div className={`w-full h-full flex flex-col ${isEmbeddedInHub ? 'bg-gray-900' : 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl'} max-h-full overflow-hidden`}> {/* Adjusted max-h */}
      {!isEmbeddedInHub && (
        <h2 className="text-3xl sm:text-4xl font-bold text-sky-400 mb-6 text-center">월드맵</h2>
      )}
      <div 
        className={`flex-grow w-full ${isEmbeddedInHub ? 'max-w-full' : 'max-w-3xl mx-auto'} grid gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-700 rounded-lg shadow-inner bg-gray-900 overflow-y-auto custom-scrollbar mb-4`}
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`}}
        role="grid"
        aria-label="월드맵 지역 그리드"
      >
        {regionsInGridOrder.map((region) => {
          const regionMissions = missionsByRegion.get(region.id) || [];
          return (
            <button
              key={region.id}
              onClick={() => handleRegionClick(region)}
              className={`
                p-3 sm:p-4 rounded-md 
                ${region.baseColor} ${region.hoverColor} 
                ${region.textColor || 'text-white'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500
                transition-all duration-150 ease-in-out
                aspect-square flex flex-col items-center justify-center text-center relative
                border-2 
                ${selectedRegion?.id === region.id ? SELECTED_REGION_BORDER_COLOR : 'border-transparent hover:border-gray-500'}
              `}
              role="gridcell"
              aria-selected={selectedRegion?.id === region.id}
            >
              <h3 className="text-sm sm:text-base font-semibold">{region.name}</h3>
              {regionMissions.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {regionMissions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex-shrink-0 bg-gray-700 p-3 sm:p-4 rounded-md shadow-md min-h-[150px] max-h-[40%] overflow-y-auto custom-scrollbar">
        {!selectedRegion && <p className="text-sm text-gray-400 text-center">지역을 선택하여 정보를 확인하세요.</p>}
        {selectedRegion && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-sky-400 mb-1">
              {selectedRegion.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mb-2">
              {selectedRegion.description}
            </p>
            <hr className="border-gray-600 my-2" />
            <h3 className="text-md font-semibold text-sky-300 mb-1">사용 가능한 임무:</h3>
            {(missionsByRegion.get(selectedRegion.id) || []).length === 0 && (
              <p className="text-xs text-gray-400">이 지역에는 현재 사용 가능한 임무가 없습니다.</p>
            )}
            <ul className="space-y-1">
              {(missionsByRegion.get(selectedRegion.id) || []).map(mission => (
                <li 
                  key={mission.id} 
                  onClick={() => handleMissionSelect(mission)}
                  className={`p-2 rounded cursor-pointer transition-colors text-xs
                              ${selectedMission?.id === mission.id ? 'bg-blue-600 text-white ring-2 ring-sky-300' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}
                >
                  <p className="font-semibold">{mission.name} <span className="text-gray-400 text-[10px]">({mission.type})</span></p>
                  <p>난이도: {mission.difficulty}, 보상: {mission.rewards.supplies} 보급품</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedMission && (
          <div className="mt-3 pt-3 border-t border-gray-600">
             <h3 className="text-md font-semibold text-yellow-400 mb-1">선택된 임무: {selectedMission.name}</h3>
             <p className="text-xs text-gray-300 mb-2">{selectedMission.description}</p>
             <Button 
                onClick={handleStartMission} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                aria-label={`임무 시작: ${selectedMission.name}`}
              >
                임무 시작 (보급품: {selectedMission.rewards.supplies})
             </Button>
          </div>
        )}
      </div>
      
      {!isEmbeddedInHub && (
        <div className="flex-shrink-0 mt-4 sm:mt-6 pt-2 w-full max-w-xs mx-auto">
          <Button 
            onClick={onBackToMenu} 
            className="w-full bg-gray-600 hover:bg-gray-700 text-lg py-2.5"
            aria-label="메인 메뉴로 돌아가기"
          >
            메인 메뉴로 돌아가기
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorldMapView;
