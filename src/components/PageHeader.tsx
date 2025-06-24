import React, { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  buttonLabel: string;
  onButtonClick?: () => void;
  children?: ReactNode;
}

export function PageHeader({ title, buttonLabel, onButtonClick, children }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <button 
        onClick={onButtonClick}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        {buttonLabel}
      </button>
      {children}
    </div>
  );
}