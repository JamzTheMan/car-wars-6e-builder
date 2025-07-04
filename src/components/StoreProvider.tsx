'use client';

import { useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import ClientOnly from './ClientOnly';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const { loadCollection } = useCardStore();

  useEffect(() => {
    // This will run once on mount
    useCardStore.persist.rehydrate();

    // Load the global card collection
    loadCollection();
  }, [loadCollection]);

  return <ClientOnly>{children}</ClientOnly>;
}
