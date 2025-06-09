import React from 'react';

interface HeaderProps {
  title: string;
  supplies?: number;
  alloyFragments?: number; // Added alloy fragments
}

const Header: React.FC<HeaderProps> = ({ title, supplies, alloyFragments }) => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md w-full flex justify-between items-center">
      <div className="w-1/3"> {/* Spacer */} </div>
      <h1 className="text-2xl font-bold text-center w-1/3">{title}</h1>
      <div className="w-1/3 flex justify-end items-center space-x-4 pr-4">
        {typeof supplies === 'number' && (
          <div className="text-sm sm:text-lg font-semibold bg-gray-700 px-2 py-1 rounded-md shadow">
            <span role="img" aria-label="Supplies" className="mr-1 sm:mr-2">🔩</span>
            보급품: {supplies}
          </div>
        )}
        {typeof alloyFragments === 'number' && (
          <div className="text-sm sm:text-lg font-semibold bg-gray-700 px-2 py-1 rounded-md shadow">
            <span role="img" aria-label="Alloy Fragments" className="mr-1 sm:mr-2">⚙️</span>
            합금: {alloyFragments}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;