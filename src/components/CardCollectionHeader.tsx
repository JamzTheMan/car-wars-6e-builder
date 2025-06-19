'use client';

import { useCardStore } from '@/store/cardStore';

export function CardCollectionHeader() {
  const { collectionCards } = useCardStore();
  
  return (
    <>
      <h2 className="text-xl font-semibold">
        Card Collection
        <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-200 rounded-full text-sm">
          {collectionCards.length} card{collectionCards.length !== 1 ? 's' : ''}
        </span>
      </h2>
    </>
  );
}
