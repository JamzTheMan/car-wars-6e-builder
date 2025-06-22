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
    'Plasma',
    'Pulse',
    'Vector',
    'Flux',
    'Neon',
    'Chrome',
    'Sonic',
    'Swift',
    'Vertex',
    'Aegis',
    'Apex',
    'Echo',
    'Nova',
    'Prism',
    'Radiant',
    'Silencer',
    'Synth',
    'Tremor',
    'Vapor',
    'Zero',
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
    'Turbine',
    'Piston',
    'Dynamo',
    'Circuit',
    'Matrix',
    'Engine',
    'Vector',
    'Pulse',
    'Thrust',
    'Charger',
    'Reactor',
    'Core',
    'Drive',
    'Machine',
    'Runner',
    'Drifter',
    'Genesis',
    'Protocol',
    'Sprint',
    'Surge',
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
    'Hypercar',
    'Skimmer',
    'Prowler',
    'Drifter',
    'Warframe',
    'Leviathan',
    'Hoverbike',
    'Thunderbolt',
    'Speedster',
    'Ravager',
    'Behemoth',
    'Centurion',
    'Dragster',
    'Infiltrator',
    'Nomad',
    'Titan',
    'Voyager',
    'Warbringer',
    'Zealot',
    'Skyrunner',
  ];

  const modelDesignations = [
    'GT', 'RS', 'XR', 'ZX', 'MK', 'EV', 'LX', 'ST', 'RX', 'GX',
    'TT', 'SS', 'XV', 'QX', 'VX', 'DX', 'NX', 'TX', 'HX', 'WX'
  ];

  const modelNumbers = [
    '100', '200', '300', '400', '500', '1000',
    '50', '90', '95', 'X3', 'X5', 'X7', 'X9',
    '3000', '5000', '7000', '9000',
    'Zero', 'One', 'Two', 'Three'
  ];

  // Choose a random pattern
  const pattern = Math.floor(Math.random() * 5);

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
  const designation = modelDesignations[Math.floor(Math.random() * modelDesignations.length)];
  const number = modelNumbers[Math.floor(Math.random() * modelNumbers.length)];

  switch (pattern) {
    case 0: // PrefixSuffix (e.g., Razor Blade)
      return `${prefix} ${suffix}`;
    case 1: // Prefix Type (e.g., Shadow Interceptor)
      return `${prefix} ${type}`;
    case 2: // The Prefix (e.g., The Reaper)
      return `The ${prefix}`;
    case 3: // Type Designation-Number (e.g., Interceptor GT-3000)
      return `${type} ${designation}-${number}`;
    case 4: // Prefix Designation Number (e.g., Quantum RS 5000)
      return `${prefix} ${designation} ${number}`;
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
