'use client';

import {useCardStore} from '@/store/cardStore';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSquareMinus, faSquarePlus} from '@fortawesome/free-solid-svg-icons';

interface ArmorDisplayProps {
    side: 'front' | 'back' | 'left' | 'right';
}

export function ArmorDisplay({side}: ArmorDisplayProps) {
    const {currentDeck, incrementArmor, decrementArmor, toggleFire} = useCardStore();

    if (!currentDeck || !currentDeck.armor) return null;

    const armor = currentDeck.armor[side];
    const isOnFire = armor.onFire || false;

    return (
        <div className="flex items-center gap-1 text-gray-300"
             style={{textShadow: '0 0 3px black, 0 0 5px black, 1px 1px 2px black'}}>
            <button
                onClick={() => toggleFire(side)}
                className={`text-lg hover:scale-130 transition-all ${isOnFire ? 'opacity-100' : 'grayscale'}`}
                style={{textShadow: '0 0 3px black, 0 0 5px black, 1px 1px 2px black'}}
                title={isOnFire ? 'On fire! Click to extinguish' : 'Click to set on fire'}
                aria-label={`Toggle fire on ${side}`}
            >
                🔥
            </button>
            <span className="font-mono font-bold text-xs">
                Armor:
            </span>
            <button
                onClick={() => incrementArmor(side)}
                className="text-green-500 hover:text-green-400 hover:scale-130 transition-all text-lg"
                title="Increase armor"
                aria-label={`Increase ${side} armor`}
            >
                <FontAwesomeIcon icon={faSquarePlus} className="h-3 w-3"/>
            </button>
            <span className="font-mono font-bold min-w-[1.2rem] text-center">
                {armor.current} / {armor.max}
            </span>
            <button
                onClick={() => decrementArmor(side)}
                className="text-yellow-300 hover:text-yellow-200 hover:scale-130 transition-all text-lg"
                title="Decrease armor"
                aria-label={`Decrease ${side} armor`}
            >
                <FontAwesomeIcon icon={faSquareMinus} className="h-3 w-3"/>
            </button>
        </div>
    );
}
