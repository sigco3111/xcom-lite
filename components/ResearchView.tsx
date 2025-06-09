
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ResearchState, ResearchProject, ActiveResearch } from '../types';
import Button from './Button';
import { 
  RESEARCH_PROGRESS_PER_ADVANCE
} from '../constants';
import { useGame } from '../contexts/GameContext'; // Import useGame

// --- Icons (copied from previous version for brevity, ensure they are defined if not already) ---
const LightBulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311V21m-3.75-2.311V21m0 0a1.5 1.5 0 01-1.5-1.5M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4.5 0V9" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-1 inline-block text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 inline-block text-yellow-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.623L17.25 21.75l-.352-1.127a3.375 3.375 0 00-2.49-2.49L13.5 17.25l1.127-.352a3.375 3.375 0 002.49-2.49L17.25 13.5l.352 1.127a3.375 3.375 0 002.49 2.49l.902.281a3.375 3.375 0 002.49-2.49l.352-1.127L21.75 12l-1.127.352a3.375 3.375 0 00-2.49 2.49L17.25 15.75l-.352-1.127a3.375 3.375 0 00-2.49-2.49L13.5 11.25l1.127.352a3.375 3.375 0 002.49 2.49L17.25 15l.352 1.127a3.375 3.375 0 002.49 2.49l1.127.352z" /></svg>;
const LockClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1 inline-block text-gray-400"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;
const BeakerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.597.484-1.087 1.087-1.087h.001c.596 0 1.087.49 1.087 1.087v1.763c0 .054.002.107.006.16a25.26 25.26 0 01-.734 6.07c-.443 2.158-2.615 3.32-4.73 2.493A21.52 21.52 0 018.67 14.65a11.33 11.33 0 01-1.405-4.44V6.087c0-.597.484-1.087 1.087-1.087h.001c.596 0 1.087.49 1.087 1.087v1.178c0 .245.094.48.264.659A2.997 2.997 0 0012 9.183a2.997 2.997 0 002.001-1.258A.996.996 0 0014.25 7.265V6.087zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

// --- End Icons ---

interface ResearchViewProps {
  onBackToMenu: () => void;
  isEmbeddedInHub?: boolean; // New prop
}

const NODE_WIDTH = 200; 
const NODE_HEIGHT = 160; 
const HORIZONTAL_SPACING = 80; 
const VERTICAL_SPACING = 40;   

interface TreeNode extends ResearchProject {
  tier: number;
  x: number;
  y: number;
  prerequisitesData?: TreeNode[]; 
}

interface TreeNodeCardProps {
  node: TreeNode;
  researchState: ResearchState; // From gameData.researchState
  supplies: number; // Current player supplies
  onStartResearch: (projectId: string) => { success: boolean, message: string }; // Context function
  isActive: boolean;
  isCompleted: boolean;
  canStart: boolean;
  isLocked: boolean;
}

const TreeNodeCard: React.FC<TreeNodeCardProps> = ({ node, researchState, supplies, onStartResearch, isActive, isCompleted, canStart, isLocked }) => {
  const progressPercent = isActive && researchState.activeResearch && researchState.activeResearch.projectId === node.id
    ? (researchState.activeResearch.progress / node.duration) * 100
    : 0;

  let borderColor = 'border-gray-600';
  if (isCompleted) borderColor = 'border-green-500';
  else if (isActive) borderColor = 'border-yellow-500';
  else if (canStart) borderColor = 'border-sky-500';
  else if (isLocked) borderColor = 'border-gray-700 opacity-60';


  return (
    <div 
      style={{ 
        width: `${NODE_WIDTH}px`, 
        position: 'absolute', 
        left: `${node.x}px`, 
        top: `${node.y}px`,
        transition: 'all 0.3s ease-in-out',
      }}
      className={`bg-gray-700 p-3 rounded-lg shadow-lg border-2 ${borderColor} flex flex-col justify-between text-xs`}
      aria-label={`Research: ${node.name}`}
    >
      <div>
        <h4 className={`font-semibold flex items-center mb-1 ${isCompleted ? 'text-green-300' : isActive ? 'text-yellow-300' : canStart ? 'text-sky-300' : 'text-gray-400'}`}>
          {node.icon && <span className="mr-1.5 text-sm">{node.icon}</span>}
          {node.name}
        </h4>
        <p className={`text-gray-400 mb-1 text-[11px] leading-tight h-10 overflow-y-auto custom-scrollbar pr-1`}>
          {node.description}
        </p>
        <div className="space-y-0.5 text-gray-300 text-[10px] mb-1">
          <p><BeakerIcon /> Cost: {node.cost} Supplies</p> {/* Changed RP to Supplies */}
          <p><ClockIcon /> Duration: {node.duration}</p>
          {node.unlocks.length > 0 && (
            <div className="leading-tight"><SparklesIcon /> Unlocks: {node.unlocks.join(', ').substring(0, 30) + (node.unlocks.join(', ').length > 30 ? '...' : '')}</div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        {isCompleted ? (
          <p className="text-green-400 font-semibold flex items-center text-[11px]"><CheckCircleIcon /> Completed</p>
        ) : isActive ? (
          <div className="mt-1">
            <p className="text-yellow-400 text-[11px]">In Progress ({progressPercent.toFixed(0)}%)</p>
            <div className="w-full bg-gray-600 rounded-full h-1.5 mt-0.5">
              <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        ) : isLocked ? (
           <p className="text-gray-500 font-semibold flex items-center text-[11px]"><LockClosedIcon /> Locked</p>
        ) : (
          <Button 
            onClick={() => onStartResearch(node.id)} 
            disabled={!canStart || researchState.activeResearch !== null || supplies < node.cost}
            className="w-full py-1 text-[10px] leading-none"
            variant={canStart && supplies >= node.cost ? 'primary' : 'secondary'}
          >
            {researchState.activeResearch ? 'Research Active' : supplies < node.cost ? 'Need Supplies' : canStart ? 'Start Research' : 'Cannot Start'}
          </Button>
        )}
      </div>
    </div>
  );
};


const ResearchView: React.FC<ResearchViewProps> = ({ onBackToMenu, isEmbeddedInHub = false }) => {
  const { gameData, startResearchProject, advanceActiveResearch, acknowledgeResearchCompletion } = useGame();
  const [notification, setNotification] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const researchState = gameData.researchState; 
  const supplies = gameData.supplies;

  useEffect(() => {
    if (gameData.justCompletedResearchId && researchState.allProjects[gameData.justCompletedResearchId]) {
      setShowCompletionModal(true);
    } else {
      setShowCompletionModal(false);
    }
  }, [gameData.justCompletedResearchId, researchState.allProjects]);

  const displayNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartResearchClicked = (projectId: string): { success: boolean, message: string } => {
    const result = startResearchProject(projectId);
    displayNotification(result.message);
    return result;
  };
  
  const handleAdvanceResearchClicked = () => {
    if (researchState.activeResearch) {
      advanceActiveResearch();
      const project = researchState.allProjects[researchState.activeResearch.projectId];
      if (project && researchState.activeResearch.progress < project.duration -1 ) { // -1 because progress is 0-indexed before increment
         displayNotification("Research advanced.");
      }
      // Completion message is handled by the modal
    } else {
      displayNotification("No active research to advance.");
    }
  };

  const handleCloseCompletionModal = () => {
    acknowledgeResearchCompletion();
    setShowCompletionModal(false);
  };

  const { treeNodes, connections, treeWidth, treeHeight } = useMemo(() => {
    const nodes: { [id: string]: TreeNode } = {};
    const projects = Object.values(researchState.allProjects);

    const getTier = (projectId: string, currentDepth = 0): number => {
      if (nodes[projectId] && nodes[projectId].tier !== undefined && nodes[projectId].tier >= currentDepth) return nodes[projectId].tier;

      const project = researchState.allProjects[projectId];
      if (!project) return currentDepth;
      if (project.prerequisites.length === 0) {
        if (!nodes[projectId] || nodes[projectId].tier === undefined) nodes[projectId] = { ...project, tier: currentDepth } as TreeNode;
        else nodes[projectId].tier = Math.max(nodes[projectId].tier, currentDepth);
        return currentDepth;
      }
      
      let maxPrereqTier = currentDepth;
      for (const prereqId of project.prerequisites) {
        maxPrereqTier = Math.max(maxPrereqTier, getTier(prereqId, currentDepth) + 1);
      }
      if (!nodes[projectId] || nodes[projectId].tier === undefined) nodes[projectId] = { ...project, tier: maxPrereqTier } as TreeNode;
      else nodes[projectId].tier = Math.max(nodes[projectId].tier, maxPrereqTier);
      return maxPrereqTier;
    };
    
    projects.forEach(p => getTier(p.id));
    
    const finalNodesList = Object.values(nodes).sort((a,b) => a.tier - b.tier);
    
    const tiers: TreeNode[][] = [];
    finalNodesList.forEach(node => {
      if (!tiers[node.tier]) tiers[node.tier] = [];
      tiers[node.tier].push(node);
    });

    let maxNodesInTier = 0;
    tiers.forEach((tierNodes, tierIndex) => {
      maxNodesInTier = Math.max(maxNodesInTier, tierNodes.length);
      tierNodes.forEach((node, nodeIndex) => {
        node.x = tierIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
        const columnHeight = tierNodes.length * (NODE_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING;
        node.y = (nodeIndex * (NODE_HEIGHT + VERTICAL_SPACING)) + ((maxNodesInTier * (NODE_HEIGHT + VERTICAL_SPACING) - columnHeight)/2) ;
      });
    });
    
    const calculatedTreeWidth = tiers.length * (NODE_WIDTH + HORIZONTAL_SPACING) - HORIZONTAL_SPACING;
    const calculatedTreeHeight = maxNodesInTier * (NODE_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING;

    const conns: Array<{ from: TreeNode, to: TreeNode }> = [];
    finalNodesList.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const prereqNode = finalNodesList.find(n => n.id === prereqId);
        if (prereqNode) {
          conns.push({ from: prereqNode, to: node });
        }
      });
    });

    return { treeNodes: finalNodesList, connections: conns, treeWidth: Math.max(600, calculatedTreeWidth), treeHeight: Math.max(400, calculatedTreeHeight) };
  }, [researchState.allProjects]);

  const completedResearchForModal = gameData.justCompletedResearchId ? researchState.allProjects[gameData.justCompletedResearchId] : null;

  return (
    <div className={`w-full h-full ${isEmbeddedInHub ? 'bg-gray-900' : 'mx-auto bg-gray-900 rounded-xl shadow-2xl max-h-[95vh]'} p-4 sm:p-6 flex flex-col overflow-hidden`}>
      {!isEmbeddedInHub && (
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-400">Research Tree</h2>
          <div className="text-lg font-semibold text-yellow-400 bg-gray-700 px-3 py-1.5 rounded-lg shadow">
            <span role="img" aria-label="Supplies" className="mr-1">🔩</span> Supplies: {supplies}
          </div>
        </div>
      )}

      {notification && (
        <div className="mb-3 p-2.5 rounded-md bg-blue-600 text-white text-center text-sm shadow-lg animate-pulse flex-shrink-0">
          {notification}
        </div>
      )}
      
      {researchState.activeResearch && researchState.allProjects[researchState.activeResearch.projectId] && (
         <div className="mb-3 p-3 bg-gray-700 rounded-lg shadow flex items-center justify-between flex-shrink-0 border border-yellow-500">
            <div>
                <h3 className="text-md font-semibold text-yellow-300">
                    Currently Researching: {researchState.allProjects[researchState.activeResearch.projectId].name}
                </h3>
                <p className="text-xs text-gray-400">
                    Progress: {researchState.activeResearch.progress} / {researchState.allProjects[researchState.activeResearch.projectId].duration} ({researchState.activeResearch.remainingDuration} remaining)
                </p>
            </div>
            <Button onClick={handleAdvanceResearchClicked} className="py-1.5 px-3 text-sm bg-green-600 hover:bg-green-700">
                Advance ({RESEARCH_PROGRESS_PER_ADVANCE})
            </Button>
        </div>
      )}


      <div ref={treeContainerRef} className="flex-grow overflow-auto custom-scrollbar relative bg-gray-800 p-4 rounded-md shadow-inner">
        <div style={{ width: `${treeWidth}px`, height: `${treeHeight}px`, position: 'relative' }}>
          <svg width={treeWidth} height={treeHeight} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
            {connections.map((conn, index) => {
              const fromX = conn.from.x + NODE_WIDTH; 
              const fromY = conn.from.y + NODE_HEIGHT / 2; 
              const toX = conn.to.x; 
              const toY = conn.to.y + NODE_HEIGHT / 2; 
              
              const isPrereqMet = researchState.completedProjects.includes(conn.from.id);
              const strokeColor = isPrereqMet ? '#059669' : '#4B5563'; 

              const pathData = `M ${fromX} ${fromY} C ${fromX + HORIZONTAL_SPACING / 2} ${fromY}, ${toX - HORIZONTAL_SPACING / 2} ${toY}, ${toX} ${toY}`;

              return (
                <path 
                  key={index} 
                  d={pathData}
                  stroke={strokeColor} 
                  strokeWidth="2" 
                  fill="none" 
                />
              );
            })}
          </svg>

          {treeNodes.map(node => {
            const isCompleted = researchState.completedProjects.includes(node.id);
            const isActive = researchState.activeResearch?.projectId === node.id;
            const prerequisitesMet = node.prerequisites.every(pId => researchState.completedProjects.includes(pId));
            const canAfford = supplies >= node.cost;
            const canStart = !isCompleted && !isActive && prerequisitesMet && canAfford;
            const isLocked = !isCompleted && !isActive && !prerequisitesMet;

            return (
              <TreeNodeCard
                key={node.id}
                node={node}
                researchState={researchState}
                supplies={supplies}
                onStartResearch={handleStartResearchClicked}
                isActive={isActive}
                isCompleted={isCompleted}
                canStart={canStart}
                isLocked={isLocked}
              />
            );
          })}
        </div>
      </div>

      {!isEmbeddedInHub && (
        <div className="mt-auto pt-4 flex-shrink-0">
          <Button onClick={onBackToMenu} className="w-full bg-gray-600 hover:bg-gray-700 text-lg py-2.5">
            Main Menu
          </Button>
        </div>
      )}

      {/* Research Completion Modal */}
      {showCompletionModal && completedResearchForModal && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="research-completion-title"
        >
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h3 id="research-completion-title" className="text-2xl font-bold text-green-400">연구 완료!</h3>
                <button onClick={handleCloseCompletionModal} className="text-gray-400 hover:text-white" aria-label="닫기">
                    <XMarkIcon />
                </button>
            </div>
            
            <div className="text-center mb-3">
                <span className="text-4xl">{completedResearchForModal.icon || '🔬'}</span>
                <h4 className="text-xl font-semibold text-yellow-300 mt-1">{completedResearchForModal.name}</h4>
            </div>

            <p className="text-sm text-gray-300 mb-3 text-center">{completedResearchForModal.description}</p>
            
            {completedResearchForModal.unlocks.length > 0 && (
                <div className="mb-4">
                    <p className="text-md font-semibold text-sky-300 mb-1">결과:</p>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5 pl-2">
                        {completedResearchForModal.unlocks.map((unlock, index) => (
                            <li key={index}>{unlock}</li>
                        ))}
                    </ul>
                </div>
            )}

            <Button onClick={handleCloseCompletionModal} className="w-full bg-blue-600 hover:bg-blue-700">
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchView;
