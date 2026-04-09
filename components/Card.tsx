
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, onClick, className = '' }) => {
  const cardClasses = `
    bg-white 
    rounded-xl 
    shadow-lg 
    overflow-hidden 
    transition-all 
    duration-300 
    ease-in-out 
    ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2' : ''}
    ${className}
  `;

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
