
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyle = "font-bold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";
  
  let variantStyle = "";
  switch (variant) {
    case 'primary':
      variantStyle = "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400";
      break;
    case 'secondary':
      variantStyle = "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-400";
      break;
    case 'danger':
      variantStyle = "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400";
      break;
    default:
      variantStyle = "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400";
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
