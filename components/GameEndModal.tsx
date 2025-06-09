
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { GameOverStatus, DamageLogEntry, Allegiance, Mission } from '../types';
import { PLAYER_COLOR, ENEMY_COLOR } from '../constants'; 
import Button from './Button';

interface GameEndModalProps {
  status: GameOverStatus;
  onReturnToMenu: () => void; 
  damageLog: DamageLogEntry[];
  mission?: Mission; 
}

const GameEndModal: React.FC<GameEndModalProps> = ({ status, onReturnToMenu, damageLog, mission }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (status === 'playing') {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    if (!chartRef.current || !damageLog || damageLog.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const processChartData = () => {
      let maxTurn = 0;
      if (damageLog.length > 0) {
        maxTurn = damageLog.reduce((max, entry) => Math.max(max, entry.turn), 0);
      }
      if (maxTurn === 0 && damageLog.length > 0) maxTurn = 1; 
      if (maxTurn === 0) maxTurn = 1; 

      const labels = Array.from({ length: maxTurn }, (_, i) => `턴 ${i + 1}`);
      const playerData: number[] = Array(maxTurn).fill(0);
      const enemyData: number[] = Array(maxTurn).fill(0);

      damageLog.forEach(entry => {
        const turnIndex = entry.turn - 1; 
        if (turnIndex >= 0 && turnIndex < maxTurn) {
          if (entry.allegiance === Allegiance.PLAYER) {
            playerData[turnIndex] += entry.damage;
          } else if (entry.allegiance === Allegiance.ENEMY) {
            enemyData[turnIndex] += entry.damage;
          }
        }
      });

      return {
        labels,
        datasets: [
          {
            label: '플레이어 총 피해량',
            data: playerData,
            borderColor: PLAYER_COLOR,
            backgroundColor: PLAYER_COLOR + '33', 
            fill: true,
            tension: 0.2,
            pointRadius: 4,
            pointBackgroundColor: PLAYER_COLOR,
          },
          {
            label: '적 총 피해량',
            data: enemyData,
            borderColor: ENEMY_COLOR,
            backgroundColor: ENEMY_COLOR + '33', 
            fill: true,
            tension: 0.2,
            pointRadius: 4,
            pointBackgroundColor: ENEMY_COLOR,
          },
        ],
      };
    };

    const chartData = processChartData();

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: '턴별 총 피해량 그래프',
              color: '#f3f4f6',
              font: { size: 18, weight: 'bold' },
              padding: { top: 10, bottom: 20 }
            },
            legend: {
              position: 'top',
              labels: { 
                color: '#d1d5db',
                font: { size: 12 }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y + ' 피해';
                    }
                    return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: '총 피해량', color: '#d1d5db', font: {size: 14} },
              ticks: { color: '#d1d5db', font: {size: 12} },
              grid: { color: '#4b5563' }
            },
            x: {
              title: { display: true, text: '턴 번호', color: '#d1d5db', font: {size: 14} },
              ticks: { color: '#d1d5db', font: {size: 12} },
              grid: { color: '#374151' } 
            },
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        },
      });
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [status, damageLog]); 


  if (status === 'playing') return null;

  const title = status === 'victory' ? '임무 성공!' : '임무 실패';
  let message = status === 'victory' 
    ? '훌륭합니다, 사령관님! 모든 적을 섬멸했습니다.' 
    : '안타깝지만 모든 아군 유닛을 잃었습니다. 다음 기회에 다시 도전하십시오.';

  if (status === 'victory' && mission) {
    message += ` 보상: 보급품 +${mission.rewards.supplies}.`;
    if (mission.rewards.alloyFragments) {
      message += ` 합금 조각 +${mission.rewards.alloyFragments}.`;
    }
  }


  const handleModalCloseAndProceed = () => {
    onReturnToMenu(); 
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="game-end-title"
    >
      <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-2xl w-full mx-auto flex flex-col max-h-[90vh] overflow-hidden">
        <h2 id="game-end-title" className={`text-3xl sm:text-4xl font-bold mb-4 ${status === 'victory' ? 'text-green-400' : 'text-red-400'}`}>
          {title}
        </h2>
        <p className="text-md sm:text-lg text-gray-300 mb-2">
          {mission?.name && <span className="block text-gray-400 text-sm mb-1">임무: {mission.name}</span>}
          {message}
        </p>

        <div className="my-2 flex-grow relative min-h-[250px] sm:min-h-[300px]">
          {damageLog && damageLog.length > 0 ? (
            <canvas ref={chartRef} id="combatLogChart"></canvas>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center">
                기록된 전투 피해 데이터가 없어 그래프를 표시할 수 없습니다.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-6">
          <Button 
            onClick={handleModalCloseAndProceed} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-xl shadow-lg transition duration-150 ease-in-out w-full"
            aria-label="임무 결과 보고 화면으로 이동"
          >
            임무 결과 보고 보기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameEndModal;