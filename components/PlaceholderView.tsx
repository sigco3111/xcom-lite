
import React from 'react';
import Button from './Button';

interface PlaceholderViewProps {
  title: string;
  message: string;
  onBack?: () => void;
  children?: React.ReactNode;
  logoSrc?: string; // 로고 이미지 URL을 위한 선택적 prop
}

const DEFAULT_LOGO_SRC = "https://picsum.photos/seed/defaultlogo/150/150"; // 기본 로고

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, message, onBack, children, logoSrc }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
      <img 
        src={logoSrc || DEFAULT_LOGO_SRC} 
        alt={`${title} 로고`} 
        className="rounded-full mb-6 shadow-lg w-32 h-32 sm:w-40 sm:h-40 object-cover" // 크기 조정 및 object-cover 추가
      />
      <h2 className="text-4xl font-bold mb-4 text-sky-400">{title}</h2>
      <p className="text-lg text-gray-300 mb-6">{message}</p>
      {children}
      {onBack && (
        <Button onClick={onBack} className="mt-8 bg-gray-600 hover:bg-gray-700">
          메인 메뉴로 돌아가기
        </Button>
      )}
    </div>
  );
};

export default PlaceholderView;
