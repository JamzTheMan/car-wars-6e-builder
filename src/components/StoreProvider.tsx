'use client';

import { useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import ClientOnly from './ClientOnly';

export default function StoreProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  useEffect(() => {
    // This will run once on mount
    useCardStore.persist.rehydrate();
  }, []);

  return <ClientOnly>{children}</ClientOnly>;
}
