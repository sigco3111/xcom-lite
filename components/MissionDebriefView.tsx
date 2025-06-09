
import React from 'react';
import { useGame } from '../contexts/GameContext';
import Button from './Button';
import { GameScreen, UnitProgressInfo } from '../types';

// Icons for the debrief screen
const SupplyIcon = () => <span role="img" aria-label="Supplies" className="mr-1.5">🔩</span>;
const AlloyIcon = () => <span role="img" aria-label="Alloy Fragments" className="mr-1.5">⚙️</span>;
const XPIcon = () => <span role="img" aria-label="Experience Points" className="mr-1.5 text-yellow-400">⭐</span>;
const PromotionIcon = () => <span role="img" aria-label="Promotion" className="mr-1.5 text-green-400">⬆️</span>;
const SkullIcon = () => <span role="img" aria-label="Enemies Defeated" className="mr-1.5 text-red-400">💀</span>;
const DownedIcon = () => <span role="img" aria-label="Units Lost" className="mr-1.5 text-orange-400">💔</span>;


const MissionDebriefView: React.FC = () => {
  const { gameData, setCurrentScreen, clearLastCompletedMissionDetails } = useGame();
  const { lastCompletedMissionDetails } = gameData;

  if (!lastCompletedMissionDetails) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-red-500">오류</h2>
        <p className="text-lg text-gray-300 mb-6">임무 결과 보고 데이터를 찾을 수 없습니다.</p>
        <Button onClick={() => setCurrentScreen(GameScreen.WorldMap)} className="bg-gray-600 hover:bg-gray-700">
          월드맵으로 돌아가기
        </Button>
      </div>
    );
  }

  const { mission, status, unitProgress, enemiesDefeated, playerUnitsLost } = lastCompletedMissionDetails;
  const isVictory = status === 'victory';

  const handleContinue = () => {
    clearLastCompletedMissionDetails();
    setCurrentScreen(GameScreen.WorldMap);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl flex flex-col items-center text-center max-h-[95vh] overflow-y-auto custom-scrollbar">
      <h2 className={`text-3xl sm:text-4xl font-bold mb-5 ${isVictory ? 'text-green-400' : 'text-red-400'}`}>
        {isVictory ? '임무 성공' : '임무 실패'}
      </h2>

      {/* Mission Details Card */}
      <div className="w-full bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-sky-300 mb-1.5">임무: {mission.name}</h3>
        <p className="text-xs sm:text-sm text-gray-300">유형: {mission.type}</p>
        <p className="text-xs sm:text-sm text-gray-300">지역: {mission.regionId}</p>
      </div>

      {/* Rewards Card */}
      {isVictory && (
        <div className="w-full bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-yellow-300 mb-1.5">획득한 보상</h3>
          <div className="space-y-1 text-sm text-gray-200">
            <p className="flex items-center justify-center"><SupplyIcon />보급품: +{mission.rewards.supplies}</p>
            {mission.rewards.alloyFragments && mission.rewards.alloyFragments > 0 && (
              <p className="flex items-center justify-center"><AlloyIcon />합금 조각: +{mission.rewards.alloyFragments}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Combat Performance Card */}
      <div className="w-full bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-teal-300 mb-1.5">전투 성과</h3>
        <div className="space-y-1 text-sm text-gray-200">
          <p className="flex items-center justify-center"><SkullIcon />섬멸한 적 유닛 수: {enemiesDefeated ?? 'N/A'}</p>
          <p className="flex items-center justify-center"><DownedIcon />손실된 아군 유닛 수: {playerUnitsLost ?? 'N/A'}</p>
        </div>
        {unitProgress && unitProgress.length > 0 ? (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <h4 className="text-md font-semibold text-teal-200 mb-1">분대원 획득 경험치:</h4>
            <ul className="space-y-0.5 text-xs text-center">
              {unitProgress.map(up => (
                <li key={up.unitId} className="flex items-center justify-center text-gray-300">
                  <XPIcon /> {up.unitName}: +{up.xpGained} XP
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-gray-600">
             <p className="text-xs text-gray-400 italic">분대원 경험치 정보 없음.</p>
          </div>
        )}
      </div>

      {/* Unit Advancement Card */}
      {isVictory && unitProgress && unitProgress.length > 0 && (
        <div className="w-full bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md mb-5">
          <h3 className="text-lg sm:text-xl font-semibold text-indigo-300 mb-2">분대원 성장 보고</h3>
          <div className="space-y-3">
            {unitProgress.map((up: UnitProgressInfo) => (
              <div key={up.unitId} className="p-2 bg-gray-600 rounded-md text-left text-xs sm:text-sm">
                <p className="font-semibold text-white">{up.unitName}</p>
                <div className="pl-2">
                  <p className="text-gray-300 flex items-center">
                    <XPIcon />경험치: +{up.xpGained} (총: {up.initialXp} ➔ {up.finalXp})
                  </p>
                  <p className="text-gray-300">
                    계급: {up.initialRank} ➔ <span className={up.promotedToRank ? "text-green-300 font-bold" : ""}>{up.finalRank}</span>
                    {up.promotedToRank && <PromotionIcon />}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={handleContinue} 
        className="w-full max-w-xs mt-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg text-lg sm:text-xl shadow-lg transition duration-150 ease-in-out"
        aria-label="계속 진행하여 월드맵으로 돌아가기"
      >
        계속
      </Button>
    </div>
  );
};

export default MissionDebriefView;
