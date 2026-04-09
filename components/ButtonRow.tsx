import React from 'react';

interface ButtonRowProps {
  children: React.ReactNode;
  alignment?: 'left' | 'center' | 'right';
  className?: string;
}

const ButtonRow: React.FC<ButtonRowProps> = ({ children, alignment = 'center', className = '' }) => {
  const justify = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={`flex flex-wrap items-center ${justify} gap-3 ${className}`}>
      {children}
    </div>
  );
};

export default ButtonRow;
