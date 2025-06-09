
import React, { useState } from 'react';
import Button from './Button'; // Assuming Button component is appropriately styled for tabs
import WorldMapView from './WorldMapView';
import TeamManagementView from './TeamManagementView';
import ResearchView from './ResearchView';
import EngineeringView from './EngineeringView';
import Header from './Header'; // Import Header
import { useGame } from '../contexts/GameContext';

type StrategicTab = 'worldmap' | 'team' | 'research' | 'engineering';

interface StrategicHubViewProps {
  onBackToMainMenu: () => void;
}

const StrategicHubView: React.FC<StrategicHubViewProps> = ({ onBackToMainMenu }) => {
  const [activeTab, setActiveTab] = useState<StrategicTab>('worldmap');
  const { gameData } = useGame();

  const tabConfig: { id: StrategicTab, label: string, component: React.ReactNode }[] = [
    { id: 'worldmap', label: '월드맵', component: <WorldMapView onBackToMenu={() => {}} isEmbeddedInHub={true} /> },
    { id: 'team', label: '팀 관리', component: <TeamManagementView onBackToMenu={() => {}} isEmbeddedInHub={true} /> },
    { id: 'research', label: '연구', component: <ResearchView onBackToMenu={() => {}} isEmbeddedInHub={true} /> },
    { id: 'engineering', label: '기술실', component: <EngineeringView onBackToMenu={() => {}} isEmbeddedInHub={true} /> },
  ];

  const activeTabLabel = tabConfig.find(tab => tab.id === activeTab)?.label || 'Strategic Command';

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900 text-gray-100">
      <Header title={`Strategic Command - ${activeTabLabel}`} supplies={gameData.supplies} alloyFragments={gameData.alloyFragments} />
      
      <div className="flex-shrink-0 bg-gray-800 p-2 shadow-md">
        <nav className="flex justify-center space-x-2 sm:space-x-3" aria-label="Strategic Sections">
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150
                          ${activeTab === tab.id 
                            ? 'bg-sky-600 text-white shadow-lg' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-grow overflow-y-auto p-0"> {/* Removed padding here to allow child components to manage it */}
        {tabConfig.find(tab => tab.id === activeTab)?.component}
      </div>
      
      <div className="flex-shrink-0 p-3 bg-gray-800 border-t border-gray-700">
        <Button 
          onClick={onBackToMainMenu} 
          className="w-full max-w-xs mx-auto bg-gray-600 hover:bg-gray-700 text-lg py-2.5"
          aria-label="메인 메뉴로 돌아가기"
        >
          메인 메뉴로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default StrategicHubView;
