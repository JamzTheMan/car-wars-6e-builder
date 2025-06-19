export function generateVehicleName(): string {
  const prefixes = [
    'Thunder',
    'Shadow',
    'Razor',
    'Iron',
    'Steel',
    'Death',
    'Doom',
    'Fury',
    'Night',
    'Rogue',
    'Chaos',
    'Phantom',
    'Ghost',
    'Venom',
    'Stealth',
    'Spike',
    'Savage',
    'Blaze',
    'Inferno',
    'Havoc',
    'Renegade',
    'Chrome',
    'Reaper',
    'Rampage',
    'Rogue',
    'Searing',
    'Burning',
    'Vulcan',
    'Storm',
    'Crimson',
    'Onyx',
    'Obsidian',
    'Midnight',
    'Solar',
    'Lunar',
    'Astral',
    'Atomic',
    'Neutron',
    'Quantum',
    'Cyber',
    'Hyper',
  ];

  const suffixes = [
    'Hawk',
    'Blade',
    'Storm',
    'Fang',
    'Claw',
    'Ripper',
    'Hunter',
    'Stalker',
    'Knight',
    'Striker',
    'Viper',
    'Wolf',
    'Panther',
    'Tiger',
    'Eagle',
    'Cobra',
    'Scorpion',
    'Shark',
    'Wraith',
    'Demon',
    'Beast',
    'Slayer',
    'Crusher',
    'Brawler',
    'Raider',
    'Falcon',
    'Raptor',
    'Phoenix',
    'Dragon',
    'Hydra',
    'Specter',
    'Phantom',
    'Vengeance',
    'Nemesis',
  ];

  const vehicleTypes = [
    'Roadster',
    'Buggy',
    'Interceptor',
    'Juggernaut',
    'Racer',
    'Cruiser',
    'Destroyer',
    'Hauler',
    'Runner',
    'Chopper',
    'Truck',
    'Tank',
    'Rider',
    'Chariot',
    'Warrior',
    'Outrider',
    'Sentinel',
    'Avenger',
    'Marauder',
    'Enforcer',
    'Scout',
    'Pursuer',
    'Predator',
    'Dreadnought',
    'Guardian',
    'Vanguard',
    'Assault Vehicle',
    'Dominator',
  ];

  // Choose a random pattern
  const pattern = Math.floor(Math.random() * 3);

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

  switch (pattern) {
    case 0: // PrefixSuffix (e.g., Razor Blade)
      return `${prefix} ${suffix}`;
    case 1: // Prefix Type (e.g., Shadow Interceptor)
      return `${prefix} ${type}`;
    case 2: // The Prefix (e.g., The Reaper)
      return `The ${prefix}`;
    default:
      return `${prefix} ${type}`;
  }
}

// Generate multiple names to let user choose from
export function generateVehicleNames(count: number = 5): string[] {
  const names: string[] = [];
  // Generate unique names
  while (names.length < count) {
    const name = generateVehicleName();
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}
