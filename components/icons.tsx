
import React from 'react';

export const SparkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-2 3.636a1 1 0 00.53 1.43l3.636 2a1 1 0 001.43-.53l2-3.636a1 1 0 00-.53-1.43l-3.636-2zM4.12 8.362a1 1 0 00-1.788 0l-1.144 2.08a1 1 0 00.53 1.43l2.08 1.143a1 1 0 001.43-.53L6.22 9.792a1 1 0 00-.53-1.43L4.12 8.362zM15.88 8.362a1 1 0 00-1.43.53l-1.144 2.08a1 1 0 00.53 1.43l2.08 1.143a1 1 0 001.43-.53l1.144-2.08a1 1 0 00-.53-1.43l-2.08-1.144z" />
  </svg>
);

export const SoundWaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
        <path d="M3 10v4" />
        <path d="M7 8v8" />
        <path d="M11 6v12" />
        <path d="M15 8v8" />
        <path d="M19 10v4" />
    </svg>
);


export const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`animate-spin ${className}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 01-11.667 0M12 21a9 9 0 110-18 9 9 0 010 18z"
    />
  </svg>
);
