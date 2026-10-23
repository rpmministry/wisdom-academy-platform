'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface BackButtonProps {
  fallbackHref: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ fallbackHref, label = 'Volver' }) => {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button type="button" className="wa-lw-back" onClick={goBack} aria-label={label}>
      <span className="wa-lw-back-icon"><WisdomIcon name="chevron-right" size={15} /></span>
      {label}
    </button>
  );
};
