
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen } from './types';
import CombatView from './components/CombatView';
import PlaceholderView from './components/PlaceholderView';
import Header from './components/Header';
import StrategicHubView from './components/StrategicHubView'; 
import MissionDebriefView from './components/MissionDebriefView';
import ConfirmModal from './components/ConfirmModal';
import { GameProvider, useGame } from './contexts/GameContext';
import Button from './components/Button';

const AppContent: React.FC = () => {
  const { currentScreen, setCurrentScreen, gameData, currentMissionForCombat, completeMissionCombat, notification, resetGameData, showNotification } = useGame();
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  // Centralized effect for screen routing and handling invalid/intermediate states
  useEffect(() => {
    // Case 1: Combat screen but no mission context (should be handled by CombatView or prevented earlier ideally)
    if (currentScreen === GameScreen.Combat && !currentMissionForCombat) {
      showNotification("임무 컨텍스트 없이 전투를 시작할 수 없습니다. 전략 허브로 이동합니다.", "error");
      setCurrentScreen(GameScreen.StrategicHub);
      return; // Early exit after handling
    }

    // Screens that are directly rendered by AppContent's switch statement
    const directlyRenderedScreens: GameScreen[] = [
      GameScreen.MainMenu,
      GameScreen.Combat, 
      GameScreen.StrategicHub,
      GameScreen.MissionDebrief,
    ];

    // Screens that are parts of StrategicHub
    const hubSubScreens: GameScreen[] = [
      GameScreen.WorldMap,
      GameScreen.TeamManagement,
      GameScreen.Research,
      GameScreen.Engineering,
    ];

    if (directlyRenderedScreens.includes(currentScreen)) {
      // This screen is handled by the switch, no action needed from this effect,
      // unless it's Combat without mission (handled above).
      return;
    }

    if (hubSubScreens.includes(currentScreen)) {
      // This is a sub-screen of StrategicHub. Redirect to StrategicHub.
      // StrategicHubView will then manage its internal active tab.
      console.log(`[AppContent Effect] Screen ${GameScreen[currentScreen] || currentScreen} is a hub sub-screen. Redirecting to StrategicHub.`);
      setCurrentScreen(GameScreen.StrategicHub);
      return; // Early exit
    }

    // If we reach here, the screen is not directly rendered, not a combat screen issue, and not a known hub sub-screen.
    // It's either an unhandled valid enum value or an invalid value.
    const isValidEnumValue = Object.values(GameScreen).includes(currentScreen as GameScreen);
    if (isValidEnumValue) {
      showNotification(`알 수 없는 화면(${GameScreen[currentScreen as GameScreen] || currentScreen})입니다. 메인 메뉴로 돌아갑니다.`, "warning");
    } else {
      showNotification("유효하지 않은 화면 상태입니다. 메인 메뉴로 돌아갑니다.", "error");
    }
    setCurrentScreen(GameScreen.MainMenu);

  }, [currentScreen, currentMissionForCombat, setCurrentScreen, showNotification]);


  const renderScreen = () => {
    switch (currentScreen) {
      case GameScreen.MainMenu:
        return (
          <PlaceholderView 
            title="XCOM Lite" 
            message="환영합니다, 사령관님. 인류의 운명이 당신의 어깨에 달려있습니다."
            logoSrc="https://picsum.photos/seed/xcomlogo/150/150"
          >
            <div className="space-y-4 w-full max-w-md">
              <Button
                onClick={() => setCurrentScreen(GameScreen.StrategicHub)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-xl shadow-lg transition duration-150 ease-in-out"
                aria-label="전략 허브 화면으로 이동 (월드맵, 팀, 연구, 기술실)"
              >
                전략 허브 보기
              </Button>
              <Button
                onClick={() => setIsResetConfirmModalOpen(true)}
                className="w-full text-white font-bold py-3 px-6 rounded-lg text-xl shadow-lg transition duration-150 ease-in-out"
                aria-label="게임 데이터 초기화"
                variant="danger" 
              >
                게임 초기화
              </Button>
            </div>
          </PlaceholderView>
        );
      case GameScreen.Combat:
        if (!currentMissionForCombat) {
          // This state should ideally be caught by useEffect and redirected.
          // Showing a loading/error placeholder as a fallback if render occurs before effect.
          return <PlaceholderView title="로딩 중..." message="전투 정보를 확인하고 있습니다... 문제가 지속되면 메인 메뉴로 돌아가세요." onBack={() => setCurrentScreen(GameScreen.StrategicHub)}/>;
        }
        return <CombatView 
                  mission={currentMissionForCombat} 
                  onCombatEnd={(status, mission, enemiesDefeated, playerUnitsLost, playerUnitsSurvived) => completeMissionCombat(status, mission, enemiesDefeated, playerUnitsLost, playerUnitsSurvived)} 
               />;
      case GameScreen.StrategicHub:
        return <StrategicHubView onBackToMainMenu={() => setCurrentScreen(GameScreen.MainMenu)} />;
      case GameScreen.MissionDebrief: 
        return <MissionDebriefView />;
      default:
        // This case should ideally be prevented by the useEffect.
        console.warn(`[AppContent renderScreen] Default case reached with screen: ${currentScreen}. Awaiting useEffect to correct.`);
        return <PlaceholderView 
                  title="화면 로딩 중..." 
                  message="화면 상태를 조정하고 있습니다. 잠시만 기다려주십시오." 
                  // No onBack here, as useEffect should handle it.
                />;
    }
  };

  let headerTitle = "XCOM Lite";
  if (currentScreen === GameScreen.StrategicHub) headerTitle = "Strategic Command"; 
  else if (currentScreen === GameScreen.Combat && currentMissionForCombat) headerTitle = `전투: ${currentMissionForCombat.name}`;
  else if (currentScreen === GameScreen.MissionDebrief) headerTitle = "임무 결과 보고";


  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100">
      {currentScreen !== GameScreen.StrategicHub && (
         <Header title={headerTitle} supplies={gameData.supplies} alloyFragments={gameData.alloyFragments} />
      )}
      <main className={`flex-grow flex flex-col items-center justify-center overflow-auto ${currentScreen !== GameScreen.StrategicHub ? 'p-4' : ''}`}>
        {renderScreen()}
      </main>

      {notification && (
        <div 
          className={`fixed top-5 right-5 p-3 sm:p-4 rounded-md shadow-xl text-white z-[100] text-sm sm:text-base
                      ${notification.type === 'success' ? 'bg-green-600' : ''}
                      ${notification.type === 'error' ? 'bg-red-600' : ''}
                      ${notification.type === 'info' ? 'bg-blue-600' : ''}
                      ${notification.type === 'warning' ? 'bg-yellow-600' : ''}`}
          role="alert"
          aria-live="assertive"
        >
          {notification.message}
        </div>
      )}

      <ConfirmModal
        isOpen={isResetConfirmModalOpen}
        title="게임 초기화 확인"
        message={"정말로 모든 게임 진행 상황을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다. 모든 저장 데이터가 삭제됩니다."}
        onConfirm={() => {
          resetGameData();
          setIsResetConfirmModalOpen(false);
        }}
        onCancel={() => setIsResetConfirmModalOpen(false)}
        confirmText="초기화"
        cancelText="취소"
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;