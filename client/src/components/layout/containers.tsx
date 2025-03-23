import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<ContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`container mx-auto px-4 py-6 ${className}`}>
      {children}
    </div>
  );
};

export const SectionContainer: React.FC<ContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {children}
    </div>
  );
}; 