import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Type definitions for PokeAPI responses
interface PokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  is_default: boolean;
  order: number;
  abilities: Array<{
    is_hidden: boolean;
    slot: number;
    ability: { name: string; url: string };
  }>;
  forms: Array<{ name: string; url: string }>;
  held_items: Array<{
    item: { name: string; url: string };
    version_details: Array<{
      rarity: number;
      version: { name: string; url: string };
    }>;
  }>;
  location_area_encounters: string;
  moves: Array<{
    move: { name: string; url: string };
    version_group_details: Array<{
      level_learned_at: number;
      version_group: { name: string; url: string };
      move_learn_method: { name: string; url: string };
    }>;
  }>;
  sprites: {
    front_default: string;
    front_shiny: string;
    back_default: string;
    back_shiny: string;
    other?: {
      'official-artwork'?: {
        front_default: string;
        front_shiny: string;
      };
    };
  };
  species: { name: string; url: string };
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: { name: string; url: string };
  }>;
  types: Array<{
    slot: number;
    type: { name: string; url: string };
  }>;
}

interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number;
  has_gender_differences: boolean;
  forms_switchable: boolean;
  growth_rate: { name: string; url: string };
  pokedex_numbers: Array<{
    entry_number: number;
    pokedex: { name: string; url: string };
  }>;
  egg_groups: Array<{ name: string; url: string }>;
  color: { name: string; url: string };
  shape: { name: string; url: string };
  evolves_from_species: { name: string; url: string } | null;
  evolution_chain: { url: string };
  habitat: { name: string; url: string } | null;
  generation: { name: string; url: string };
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string; url: string };
    version: { name: string; url: string };
  }>;
}

interface TypeData {
  id: number;
  name: string;
  damage_relations: {
    no_damage_to: Array<{ name: string; url: string }>;
    half_damage_to: Array<{ name: string; url: string }>;
    double_damage_to: Array<{ name: string; url: string }>;
    no_damage_from: Array<{ name: string; url: string }>;
    half_damage_from: Array<{ name: string; url: string }>;
    double_damage_from: Array<{ name: string; url: string }>;
  };
  pokemon: Array<{
    slot: number;
    pokemon: { name: string; url: string };
  }>;
}

interface EvolutionChain {
  id: number;
  baby_trigger_item: { name: string; url: string } | null;
  chain: ChainLink;
}

interface ChainLink {
  is_baby: boolean;
  species: { name: string; url: string };
  evolution_details: Array<{
    item: { name: string; url: string } | null;
    trigger: { name: string; url: string };
    gender: number | null;
    held_item: { name: string; url: string } | null;
    known_move: { name: string; url: string } | null;
    known_move_type: { name: string; url: string } | null;
    location: { name: string; url: string } | null;
    min_level: number | null;
    min_happiness: number | null;
    min_beauty: number | null;
    min_affection: number | null;
    needs_overworld_rain: boolean;
    party_species: { name: string; url: string } | null;
    party_type: { name: string; url: string } | null;
    relative_physical_stats: number | null;
    time_of_day: string;
    trade_species: { name: string; url: string } | null;
    turn_upside_down: boolean;
  }>;
  evolves_to: ChainLink[];
}

interface AbilityData {
  id: number;
  name: string;
  is_main_series: boolean;
  generation: { name: string; url: string };
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: { name: string; url: string };
  }>;
  pokemon: Array<{
    is_hidden: boolean;
    slot: number;
    pokemon: { name: string; url: string };
  }>;
}

interface MoveData {
  id: number;
  name: string;
  accuracy: number | null;
  effect_chance: number | null;
  pp: number;
  priority: number;
  power: number | null;
  damage_class: { name: string; url: string };
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: { name: string; url: string };
  }>;
  type: { name: string; url: string };
  target: { name: string; url: string };
  generation: { name: string; url: string };
  meta: {
    ailment: { name: string; url: string };
    category: { name: string; url: string };
    min_hits: number | null;
    max_hits: number | null;
    min_turns: number | null;
    max_turns: number | null;
    drain: number;
    healing: number;
    crit_rate: number;
    ailment_chance: number;
    flinch_chance: number;
    stat_chance: number;
  } | null;
}

interface ItemData {
  id: number;
  name: string;
  cost: number;
  fling_power: number | null;
  fling_effect: { name: string; url: string } | null;
  attributes: Array<{ name: string; url: string }>;
  category: { name: string; url: string };
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: { name: string; url: string };
  }>;
  sprites: {
    default: string | null;
  };
}

interface NatureData {
  id: number;
  name: string;
  decreased_stat: { name: string; url: string } | null;
  increased_stat: { name: string; url: string } | null;
  hates_flavor: { name: string; url: string } | null;
  likes_flavor: { name: string; url: string } | null;
  pokeathlon_stat_changes: Array<{
    max_change: number;
    pokeathlon_stat: { name: string; url: string };
  }>;
  move_battle_style_preferences: Array<{
    low_hp_preference: number;
    high_hp_preference: number;
    move_battle_style: { name: string; url: string };
  }>;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
}

interface LocationData {
  id: number;
  name: string;
  region: { name: string; url: string };
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  game_indices: Array<{
    game_index: number;
    generation: { name: string; url: string };
  }>;
  areas: Array<{ name: string; url: string }>;
}

interface LocationAreaData {
  id: number;
  name: string;
  game_index: number;
  encounter_method_rates: Array<{
    encounter_method: { name: string; url: string };
    version_details: Array<{
      rate: number;
      version: { name: string; url: string };
    }>;
  }>;
  location: { name: string; url: string };
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  pokemon_encounters: Array<{
    pokemon: { name: string; url: string };
    version_details: Array<{
      version: { name: string; url: string };
      max_chance: number;
      encounter_details: Array<{
        min_level: number;
        max_level: number;
        condition_values: Array<{ name: string; url: string }>;
        chance: number;
        method: { name: string; url: string };
      }>;
    }>;
  }>;
}

interface GenerationData {
  id: number;
  name: string;
  abilities: Array<{ name: string; url: string }>;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  main_region: { name: string; url: string };
  moves: Array<{ name: string; url: string }>;
  pokemon_species: Array<{ name: string; url: string }>;
  types: Array<{ name: string; url: string }>;
  version_groups: Array<{ name: string; url: string }>;
}

interface EggGroupData {
  id: number;
  name: string;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  pokemon_species: Array<{ name: string; url: string }>;
}

interface RegionData {
  id: number;
  locations: Array<{ name: string; url: string }>;
  name: string;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  main_generation: { name: string; url: string };
  pokedexes: Array<{ name: string; url: string }>;
  version_groups: Array<{ name: string; url: string }>;
}

interface CharacteristicData {
  id: number;
  gene_modulo: number;
  possible_values: Array<number>;
  highest_stat: { name: string; url: string };
  descriptions: Array<{
    description: string;
    language: { name: string; url: string };
  }>;
}

interface GrowthRateData {
  id: number;
  name: string;
  formula: string;
  descriptions: Array<{
    description: string;
    language: { name: string; url: string };
  }>;
  levels: Array<{
    level: number;
    experience: number;
  }>;
  pokemon_species: Array<{ name: string; url: string }>;
}

interface ItemCategoryData {
  id: number;
  name: string;
  items: Array<{ name: string; url: string }>;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  pocket: { name: string; url: string };
}

interface ItemAttributeData {
  id: number;
  name: string;
  items: Array<{ name: string; url: string }>;
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
  descriptions: Array<{
    description: string;
    language: { name: string; url: string };
  }>;
}

interface BerryData {
  id: number;
  name: string;
  growth_time: number;
  max_harvest: number;
  natural_gift_power: number;
  size: number;
  smoothness: number;
  soil_dryness: number;
  firmness: { name: string; url: string };
  flavors: Array<{
    potency: number;
    flavor: { name: string; url: string };
  }>;
  item: { name: string; url: string };
  natural_gift_type: { name: string; url: string };
}

interface BerryFlavorData {
  id: number;
  name: string;
  berries: Array<{
    potency: number;
    berry: { name: string; url: string };
  }>;
  contest_type: { name: string; url: string };
  names: Array<{
    name: string;
    language: { name: string; url: string };
  }>;
}

interface LocationAreaEncounter {
  location_area: { name: string; url: string };
  version_details: Array<{
    version: { name: string; url: string };
    max_chance: number;
    encounter_details: Array<{
      min_level: number;
      max_level: number;
      condition_values: Array<{ name: string; url: string }>;
      chance: number;
      method: { name: string; url: string };
    }>;
  }>;
}

class PokemonAPIClient {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private cache: Map<string, unknown> = new Map();

  constructor(private enableCache: boolean = true) {}

  private async fetchWithCache(path: string): Promise<unknown> {
    const cacheKey = path;

    if (this.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(`PokeAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as unknown;

    if (this.enableCache) {
      this.cache.set(cacheKey, data);
    }

    return data;
  }

  async getPokemon(idOrName: string): Promise<PokemonData> {
    return this.fetchWithCache(`/pokemon/${idOrName.toLowerCase()}`) as Promise<PokemonData>;
  }

  async getPokemonSpecies(idOrName: string): Promise<PokemonSpecies> {
    return this.fetchWithCache(`/pokemon-species/${idOrName.toLowerCase()}`) as Promise<PokemonSpecies>;
  }

  async getEvolutionChain(id: number): Promise<EvolutionChain> {
    return this.fetchWithCache(`/evolution-chain/${id}`) as Promise<EvolutionChain>;
  }

  async getType(idOrName: string): Promise<TypeData> {
    return this.fetchWithCache(`/type/${idOrName.toLowerCase()}`) as Promise<TypeData>;
  }

  async getAbility(idOrName: string): Promise<AbilityData> {
    return this.fetchWithCache(`/ability/${idOrName.toLowerCase()}`) as Promise<AbilityData>;
  }

  async getMove(idOrName: string): Promise<MoveData> {
    return this.fetchWithCache(`/move/${idOrName.toLowerCase()}`) as Promise<MoveData>;
  }

  async getItem(idOrName: string): Promise<ItemData> {
    return this.fetchWithCache(`/item/${idOrName.toLowerCase()}`) as Promise<ItemData>;
  }

  async getNature(idOrName: string): Promise<NatureData> {
    return this.fetchWithCache(`/nature/${idOrName.toLowerCase()}`) as Promise<NatureData>;
  }

  async getGeneration(idOrName: string): Promise<GenerationData> {
    return this.fetchWithCache(`/generation/${idOrName.toLowerCase()}`) as Promise<GenerationData>;
  }

  async getEggGroup(idOrName: string): Promise<EggGroupData> {
    return this.fetchWithCache(`/egg-group/${idOrName.toLowerCase()}`) as Promise<EggGroupData>;
  }

  async getLocationArea(idOrName: string): Promise<LocationAreaData> {
    return this.fetchWithCache(`/location-area/${idOrName.toLowerCase()}`) as Promise<LocationAreaData>;
  }

  async getPokemonLocationEncounters(idOrName: string): Promise<LocationAreaEncounter[]> {
    return this.fetchWithCache(`/pokemon/${idOrName.toLowerCase()}/encounters`) as Promise<LocationAreaEncounter[]>;
  }

  async getRegion(idOrName: string): Promise<RegionData> {
    return this.fetchWithCache(`/region/${idOrName.toLowerCase()}`) as Promise<RegionData>;
  }

  async getCharacteristic(id: number): Promise<CharacteristicData> {
    return this.fetchWithCache(`/characteristic/${id}`) as Promise<CharacteristicData>;
  }

  async getGrowthRate(idOrName: string): Promise<GrowthRateData> {
    return this.fetchWithCache(`/growth-rate/${idOrName.toLowerCase()}`) as Promise<GrowthRateData>;
  }

  async getItemCategory(idOrName: string): Promise<ItemCategoryData> {
    return this.fetchWithCache(`/item-category/${idOrName.toLowerCase()}`) as Promise<ItemCategoryData>;
  }

  async getItemAttribute(idOrName: string): Promise<ItemAttributeData> {
    return this.fetchWithCache(`/item-attribute/${idOrName.toLowerCase()}`) as Promise<ItemAttributeData>;
  }

  async getBerry(idOrName: string): Promise<BerryData> {
    return this.fetchWithCache(`/berry/${idOrName.toLowerCase()}`) as Promise<BerryData>;
  }

  async getBerryFlavor(idOrName: string): Promise<BerryFlavorData> {
    return this.fetchWithCache(`/berry-flavor/${idOrName.toLowerCase()}`) as Promise<BerryFlavorData>;
  }

  async listResources(
    resource: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ count: number; next: string | null; previous: string | null; results: Array<{ name: string; url: string }> }> {
    return this.fetchWithCache(`/${resource}?limit=${limit}&offset=${offset}`) as Promise<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Array<{ name: string; url: string }>;
    }>;
  }

  async batchFetch(urls: string[]): Promise<unknown[]> {
    return Promise.all(
      urls.map((url) => {
        const path = url.replace(this.baseUrl, '');
        return this.fetchWithCache(path);
      })
    );
  }
}

// Helper functions
function calculateTypeEffectiveness(
  attackingType: TypeData,
  defendingTypes: TypeData[]
): number {
  let multiplier = 1;

  for (const defendingType of defendingTypes) {
    if (
      attackingType.damage_relations.double_damage_to.some(
        (t) => t.name === defendingType.name
      )
    ) {
      multiplier *= 2;
    } else if (
      attackingType.damage_relations.half_damage_to.some(
        (t) => t.name === defendingType.name
      )
    ) {
      multiplier *= 0.5;
    } else if (
      attackingType.damage_relations.no_damage_to.some(
        (t) => t.name === defendingType.name
      )
    ) {
      multiplier *= 0;
    }
  }

  return multiplier;
}

interface EvolutionNode {
  species: string;
  depth: number;
  evolutionDetails: ChainLink['evolution_details'];
  isBaby: boolean;
}

function parseEvolutionChain(chain: ChainLink): EvolutionNode[] {
  const nodes: EvolutionNode[] = [];

  const processChain = (link: ChainLink, depth: number = 0) => {
    nodes.push({
      species: link.species.name,
      depth,
      evolutionDetails: link.evolution_details,
      isBaby: link.is_baby,
    });

    for (const evolution of link.evolves_to) {
      processChain(evolution, depth + 1);
    }
  };

  processChain(chain);
  return nodes;
}

const handlePokemonError = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('404')) {
      return 'Pokemon or resource not found. Please check the name/ID and try again.';
    }
    if (message.includes('network')) {
      return 'Network error accessing PokeAPI. Please check your connection.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. PokeAPI might be experiencing issues.';
    }

    return `Error: ${error.message}`;
  }

  return `Unexpected error: ${String(error)}`;
};

export const PokemonConnectorConfig = mcpConnectorConfig({
  name: 'Pokemon',
  key: 'pokemon',
  version: '1.0.0',
  logo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  
  // No credentials needed - public API
  credentials: z.object({}),
  
  setup: z.object({
    defaultLanguage: z
      .string()
      .optional()
      .default('en')
      .describe('Default language for localized content'),
    cacheResponses: z
      .boolean()
      .optional()
      .default(true)
      .describe('Cache API responses to minimize requests'),
  }),
  
  examplePrompt: 
    'Get details about Pikachu including its stats and evolution chain. ' +
    'Compare Charizard and Blastoise\'s stats and type matchups. ' +
    'Build a team analysis for: Pikachu, Charizard, Venusaur, Blastoise, Snorlax, and Alakazam, checking for type coverage and weaknesses.',
  
  tools: (tool) => ({
    GET_POKEMON: tool({
      name: 'pokemon_get_pokemon',
      description: 'Get comprehensive details about a specific Pokemon including stats, abilities, moves, and sprites',
      schema: z.object({
        identifier: z.string().describe('Pokemon name or ID (e.g., "pikachu" or "25")'),
        includeSpecies: z
          .boolean()
          .optional()
          .describe('Include species data (legendary status, egg groups, etc.)'),
        includeEvolution: z
          .boolean()
          .optional()
          .describe('Fetch evolution chain data'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const pokemon = await client.getPokemon(args.identifier);
          const result: Record<string, unknown> = {
            id: pokemon.id,
            name: pokemon.name,
            height: pokemon.height,
            weight: pokemon.weight,
            base_experience: pokemon.base_experience,
            stats: pokemon.stats.map((s) => ({
              name: s.stat.name,
              base_stat: s.base_stat,
              effort: s.effort,
            })),
            types: pokemon.types
              .sort((a, b) => a.slot - b.slot)
              .map((t) => t.type.name),
            abilities: pokemon.abilities.map((a) => ({
              name: a.ability.name,
              is_hidden: a.is_hidden,
              slot: a.slot,
            })),
            sprite: pokemon.sprites.other?.['official-artwork']?.front_default || 
                   pokemon.sprites.front_default,
          };

          if (args.includeSpecies) {
            const species = await client.getPokemonSpecies(pokemon.species.name);
            result.species = {
              is_legendary: species.is_legendary,
              is_mythical: species.is_mythical,
              is_baby: species.is_baby,
              capture_rate: species.capture_rate,
              base_happiness: species.base_happiness,
              growth_rate: species.growth_rate.name,
              egg_groups: species.egg_groups.map((eg) => eg.name),
              generation: species.generation.name,
              evolution_chain_id: species.evolution_chain.url.split('/').slice(-2, -1)[0],
            };
          }

          if (args.includeEvolution && result.species) {
            const chainId = Number(
              (result.species as { evolution_chain_id: string }).evolution_chain_id
            );
            const evolutionChain = await client.getEvolutionChain(chainId);
            const evolutionNodes = parseEvolutionChain(evolutionChain.chain);
            
            result.evolution_chain = evolutionNodes.map((node) => ({
              species: node.species,
              stage: node.depth,
              is_baby: node.isBaby,
              evolution_details: node.evolutionDetails.map((detail) => ({
                trigger: detail.trigger.name,
                min_level: detail.min_level,
                item: detail.item?.name,
                held_item: detail.held_item?.name,
                known_move: detail.known_move?.name,
                time_of_day: detail.time_of_day,
              })),
            }));
          }

          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    SEARCH_POKEMON: tool({
      name: 'pokemon_search_pokemon',
      description: 'Search and list Pokemon with filtering options',
      schema: z.object({
        limit: z.number().optional().default(20).describe('Number of results'),
        offset: z.number().optional().default(0).describe('Pagination offset'),
        type: z.string().optional().describe('Filter by type (e.g., "electric")'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          // Get the list of Pokemon
          const pokemonList = await client.listResources('pokemon', args.limit, args.offset);
          
          // If filtering by type, fetch the type data
          let filteredResults = pokemonList.results;
          if (args.type) {
            const typeData = await client.getType(args.type);
            const typePokemonNames = typeData.pokemon.map((p) => p.pokemon.name);
            filteredResults = pokemonList.results.filter((p) =>
              typePokemonNames.includes(p.name)
            );
          }
          
          return JSON.stringify(
            {
              count: pokemonList.count,
              next: pokemonList.next,
              previous: pokemonList.previous,
              results: filteredResults.map((p) => ({
                name: p.name,
                id: p.url.split('/').slice(-2, -1)[0],
              })),
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_TYPE_EFFECTIVENESS: tool({
      name: 'pokemon_get_type_effectiveness',
      description: 'Get type matchup information and damage relations',
      schema: z.object({
        attackingType: z.string().describe('The attacking type'),
        defendingTypes: z
          .array(z.string())
          .optional()
          .describe('Defending type(s) to check against'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const attackingTypeData = await client.getType(args.attackingType);
          
          const result: Record<string, unknown> = {
            attacking_type: attackingTypeData.name,
            damage_relations: {
              double_damage_to: attackingTypeData.damage_relations.double_damage_to.map(
                (t) => t.name
              ),
              half_damage_to: attackingTypeData.damage_relations.half_damage_to.map(
                (t) => t.name
              ),
              no_damage_to: attackingTypeData.damage_relations.no_damage_to.map(
                (t) => t.name
              ),
              double_damage_from: attackingTypeData.damage_relations.double_damage_from.map(
                (t) => t.name
              ),
              half_damage_from: attackingTypeData.damage_relations.half_damage_from.map(
                (t) => t.name
              ),
              no_damage_from: attackingTypeData.damage_relations.no_damage_from.map(
                (t) => t.name
              ),
            },
          };
          
          if (args.defendingTypes && args.defendingTypes.length > 0) {
            const defendingTypeData = await Promise.all(
              args.defendingTypes.map((type) => client.getType(type))
            );
            
            const effectiveness = calculateTypeEffectiveness(
              attackingTypeData,
              defendingTypeData
            );
            
            result.specific_matchup = {
              defending_types: args.defendingTypes,
              effectiveness_multiplier: effectiveness,
              effectiveness_label:
                effectiveness === 0
                  ? 'No Effect'
                  : effectiveness < 1
                  ? `Not Very Effective (${effectiveness}x)`
                  : effectiveness > 1
                  ? `Super Effective (${effectiveness}x)`
                  : 'Normal Damage (1x)',
            };
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_EVOLUTION_CHAIN: tool({
      name: 'pokemon_get_evolution_chain',
      description: 'Get the complete evolution chain for a Pokemon species',
      schema: z.object({
        pokemonName: z.string().describe('Pokemon name to get evolution chain for'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          // First get the species to find the evolution chain ID
          const species = await client.getPokemonSpecies(args.pokemonName);
          const chainId = Number(species.evolution_chain.url.split('/').slice(-2, -1)[0]);
          
          // Get the evolution chain
          const evolutionChain = await client.getEvolutionChain(chainId);
          const evolutionNodes = parseEvolutionChain(evolutionChain.chain);
          
          // Format the evolution chain for display
          const formattedChain = evolutionNodes.map((node, index) => ({
            order: index + 1,
            species: node.species,
            stage: node.depth === 0 ? 'Base' : `Evolution Stage ${node.depth}`,
            is_baby: node.isBaby,
            evolution_methods:
              node.evolutionDetails.length > 0
                ? node.evolutionDetails.map((detail) => ({
                    trigger: detail.trigger.name,
                    min_level: detail.min_level,
                    item: detail.item?.name,
                    held_item: detail.held_item?.name,
                    known_move: detail.known_move?.name,
                    known_move_type: detail.known_move_type?.name,
                    location: detail.location?.name,
                    min_happiness: detail.min_happiness,
                    time_of_day: detail.time_of_day || 'any',
                    needs_rain: detail.needs_overworld_rain,
                  }))
                : null,
          }));
          
          return JSON.stringify(
            {
              chain_id: chainId,
              baby_trigger_item: evolutionChain.baby_trigger_item?.name,
              evolution_line: formattedChain,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    COMPARE_POKEMON: tool({
      name: 'pokemon_compare_pokemon',
      description: 'Compare stats, types, and abilities of multiple Pokemon',
      schema: z.object({
        pokemonList: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe('List of Pokemon names/IDs to compare'),
        aspects: z
          .array(z.enum(['stats', 'types', 'abilities', 'physical']))
          .optional()
          .describe('Specific aspects to compare'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          // Fetch all Pokemon data
          const pokemonData = await Promise.all(
            args.pokemonList.map((p) => client.getPokemon(p))
          );
          
          const aspects = args.aspects || ['stats', 'types', 'abilities', 'physical'];
          const comparison: Record<string, unknown> = {
            pokemon: pokemonData.map((p) => p.name),
          };
          
          if (aspects.includes('stats')) {
            comparison.stats_comparison = pokemonData.map((pokemon) => ({
              name: pokemon.name,
              total: pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0),
              hp: pokemon.stats.find((s) => s.stat.name === 'hp')?.base_stat || 0,
              attack: pokemon.stats.find((s) => s.stat.name === 'attack')?.base_stat || 0,
              defense:
                pokemon.stats.find((s) => s.stat.name === 'defense')?.base_stat || 0,
              'special-attack':
                pokemon.stats.find((s) => s.stat.name === 'special-attack')?.base_stat ||
                0,
              'special-defense':
                pokemon.stats.find((s) => s.stat.name === 'special-defense')?.base_stat ||
                0,
              speed: pokemon.stats.find((s) => s.stat.name === 'speed')?.base_stat || 0,
            }));
          }
          
          if (aspects.includes('types')) {
            comparison.types = pokemonData.map((pokemon) => ({
              name: pokemon.name,
              types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
            }));
          }
          
          if (aspects.includes('abilities')) {
            comparison.abilities = pokemonData.map((pokemon) => ({
              name: pokemon.name,
              abilities: pokemon.abilities
                .sort((a, b) => a.slot - b.slot)
                .map((a) => ({
                  name: a.ability.name,
                  is_hidden: a.is_hidden,
                })),
            }));
          }
          
          if (aspects.includes('physical')) {
            comparison.physical = pokemonData.map((pokemon) => ({
              name: pokemon.name,
              height_m: pokemon.height / 10,
              weight_kg: pokemon.weight / 10,
              base_experience: pokemon.base_experience,
            }));
          }
          
          return JSON.stringify(comparison, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_ABILITY: tool({
      name: 'pokemon_get_ability',
      description: 'Get detailed information about a Pokemon ability',
      schema: z.object({
        abilityName: z.string().describe('Ability name or ID'),
        includePokemon: z
          .boolean()
          .optional()
          .describe('Include list of Pokemon with this ability'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const ability = await client.getAbility(args.abilityName);
          
          // Find English effect entry
          const englishEffect = ability.effect_entries.find(
            (e) => e.language.name === setup.defaultLanguage || e.language.name === 'en'
          );
          
          const result: Record<string, unknown> = {
            id: ability.id,
            name: ability.name,
            generation: ability.generation.name,
            effect: englishEffect?.effect || 'No effect description available',
            short_effect:
              englishEffect?.short_effect || 'No short effect description available',
          };
          
          if (args.includePokemon) {
            result.pokemon = ability.pokemon.map((p) => ({
              name: p.pokemon.name,
              is_hidden: p.is_hidden,
              slot: p.slot,
            }));
            result.pokemon_count = ability.pokemon.length;
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_MOVE: tool({
      name: 'pokemon_get_move',
      description: 'Get detailed information about a Pokemon move',
      schema: z.object({
        moveName: z.string().describe('Move name or ID'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const move = await client.getMove(args.moveName);
          
          // Find English effect entry
          const englishEffect = move.effect_entries.find(
            (e) => e.language.name === setup.defaultLanguage || e.language.name === 'en'
          );
          
          return JSON.stringify(
            {
              id: move.id,
              name: move.name,
              type: move.type.name,
              damage_class: move.damage_class.name,
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp,
              priority: move.priority,
              target: move.target.name,
              effect: englishEffect?.effect || 'No effect description available',
              short_effect:
                englishEffect?.short_effect || 'No short effect description available',
              meta: move.meta ? {
                ailment: move.meta.ailment.name,
                category: move.meta.category.name,
                crit_rate: move.meta.crit_rate,
                drain: move.meta.drain,
                healing: move.meta.healing,
                flinch_chance: move.meta.flinch_chance,
                stat_chance: move.meta.stat_chance,
                ailment_chance: move.meta.ailment_chance,
              } : null,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_ITEM: tool({
      name: 'pokemon_get_item',
      description: 'Get detailed information about a Pokemon item',
      schema: z.object({
        itemName: z.string().describe('Item name or ID'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const item = await client.getItem(args.itemName);
          
          // Find English effect entry
          const englishEffect = item.effect_entries.find(
            (e) => e.language.name === setup.defaultLanguage || e.language.name === 'en'
          );
          
          return JSON.stringify(
            {
              id: item.id,
              name: item.name,
              cost: item.cost,
              category: item.category.name,
              attributes: item.attributes.map((a) => a.name),
              effect: englishEffect?.effect || 'No effect description available',
              short_effect:
                englishEffect?.short_effect || 'No short effect description available',
              fling_power: item.fling_power,
              sprite: item.sprites.default,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_NATURE: tool({
      name: 'pokemon_get_nature',
      description: 'Get Pokemon nature effects on stats and berry preferences',
      schema: z.object({
        natureName: z.string().describe('Nature name or ID (e.g., "adamant" or "1")'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const nature = await client.getNature(args.natureName);
          
          return JSON.stringify(
            {
              id: nature.id,
              name: nature.name,
              increased_stat: nature.increased_stat?.name || null,
              decreased_stat: nature.decreased_stat?.name || null,
              likes_flavor: nature.likes_flavor?.name || null,
              hates_flavor: nature.hates_flavor?.name || null,
              stat_changes: {
                increased: nature.increased_stat?.name ? `+10% ${nature.increased_stat.name}` : 'None',
                decreased: nature.decreased_stat?.name ? `-10% ${nature.decreased_stat.name}` : 'None',
              },
              pokeathlon_effects: nature.pokeathlon_stat_changes.map((change) => ({
                stat: change.pokeathlon_stat.name,
                max_change: change.max_change,
              })),
              battle_style_preferences: nature.move_battle_style_preferences.map((pref) => ({
                style: pref.move_battle_style.name,
                low_hp_preference: pref.low_hp_preference,
                high_hp_preference: pref.high_hp_preference,
              })),
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    FIND_POKEMON_LOCATIONS: tool({
      name: 'pokemon_find_locations',
      description: 'Find where a specific Pokemon can be encountered in the wild',
      schema: z.object({
        pokemonName: z.string().describe('Pokemon name to find locations for'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const encounters = await client.getPokemonLocationEncounters(args.pokemonName);
          
          if (!encounters || encounters.length === 0) {
            return JSON.stringify({
              pokemon: args.pokemonName,
              encounters: [],
              message: 'This Pokemon cannot be found in the wild or encounter data is not available.',
            });
          }
          
          const formattedEncounters = encounters.map((encounter) => ({
            location_area: encounter.location_area.name,
            versions: encounter.version_details.map((versionDetail) => ({
              version: versionDetail.version.name,
              max_chance: versionDetail.max_chance,
              encounter_methods: versionDetail.encounter_details.map((detail) => ({
                method: detail.method.name,
                chance: detail.chance,
                min_level: detail.min_level,
                max_level: detail.max_level,
                conditions: detail.condition_values.map((c) => c.name),
              })),
            })),
          }));
          
          return JSON.stringify(
            {
              pokemon: args.pokemonName,
              encounter_count: encounters.length,
              encounters: formattedEncounters,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_GENERATION_POKEMON: tool({
      name: 'pokemon_get_generation',
      description: 'Get all Pokemon, moves, and abilities introduced in a specific generation',
      schema: z.object({
        generation: z.string().describe('Generation name or ID (e.g., "generation-iv" or "4")'),
        includeDetails: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include detailed counts and examples'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const generation = await client.getGeneration(args.generation);
          
          const result: Record<string, unknown> = {
            id: generation.id,
            name: generation.name,
            main_region: generation.main_region.name,
            pokemon_count: generation.pokemon_species.length,
            abilities_count: generation.abilities.length,
            moves_count: generation.moves.length,
            types_count: generation.types.length,
          };
          
          if (args.includeDetails) {
            result.pokemon_species = generation.pokemon_species
              .slice(0, 20)
              .map((p) => p.name);
            result.abilities = generation.abilities.slice(0, 10).map((a) => a.name);
            result.moves = generation.moves.slice(0, 15).map((m) => m.name);
            result.types = generation.types.map((t) => t.name);
            result.version_groups = generation.version_groups.map((vg) => vg.name);
            
            if (generation.pokemon_species.length > 20) {
              result.note = `Showing first 20 of ${generation.pokemon_species.length} Pokemon species. Set includeDetails to false for counts only.`;
            }
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_BREEDING_INFO: tool({
      name: 'pokemon_get_breeding_info',
      description: 'Get breeding compatibility and egg group information for a Pokemon',
      schema: z.object({
        pokemonName: z.string().describe('Pokemon name to get breeding info for'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          // Get the species data first
          const species = await client.getPokemonSpecies(args.pokemonName);
          
          // Get egg group details
          const eggGroupData = await Promise.all(
            species.egg_groups.map((eg) => client.getEggGroup(eg.name))
          );
          
          return JSON.stringify(
            {
              pokemon: species.name,
              gender_rate: species.gender_rate,
              gender_ratio: {
                female_chance: species.gender_rate === -1 ? 'Genderless' : `${(species.gender_rate / 8) * 100}%`,
                male_chance: species.gender_rate === -1 ? 'Genderless' : `${((8 - species.gender_rate) / 8) * 100}%`,
              },
              egg_groups: eggGroupData.map((eg) => eg.name),
              hatch_counter: species.hatch_counter,
              breeding_compatibility: {
                can_breed: species.gender_rate !== -1 && !species.is_baby,
                is_baby: species.is_baby,
                breeding_requirements: species.is_baby 
                  ? 'Cannot breed - this is a baby Pokemon'
                  : species.gender_rate === -1
                  ? 'Cannot breed - this Pokemon is genderless'
                  : 'Can breed with Pokemon in the same egg groups',
              },
              compatible_species_count: eggGroupData.reduce(
                (total, eg) => total + eg.pokemon_species.length, 
                0
              ) - 1,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    EXPLORE_LOCATIONS: tool({
      name: 'pokemon_explore_locations',
      description: 'Get detailed location and area information including Pokemon encounters',
      schema: z.object({
        locationName: z.string().describe('Location name or ID'),
        includeEncounters: z.boolean().optional().describe('Include Pokemon encounter data for all areas'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const location = await client.getLocationArea(args.locationName);
          
          const result: Record<string, unknown> = {
            id: location.id,
            name: location.name,
            game_index: location.game_index,
            location_parent: location.location.name,
            encounter_methods: location.encounter_method_rates.map((rate) => ({
              method: rate.encounter_method.name,
              version_rates: rate.version_details.map((vd) => ({
                version: vd.version.name,
                rate: vd.rate,
              })),
            })),
          };
          
          if (args.includeEncounters) {
            result.pokemon_encounters = location.pokemon_encounters.map((enc) => ({
              pokemon: enc.pokemon.name,
              versions: enc.version_details.map((vd) => ({
                version: vd.version.name,
                max_chance: vd.max_chance,
                encounters: vd.encounter_details.map((ed) => ({
                  min_level: ed.min_level,
                  max_level: ed.max_level,
                  chance: ed.chance,
                  method: ed.method.name,
                  conditions: ed.condition_values.map((cv) => cv.name),
                })),
              })),
            }));
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_REGION_INFO: tool({
      name: 'pokemon_get_region_info',
      description: 'Get comprehensive region information including locations and Pokedexes',
      schema: z.object({
        regionName: z.string().describe('Region name or ID (e.g., "kanto" or "1")'),
        includeLocations: z.boolean().optional().describe('Include detailed location list'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const region = await client.getRegion(args.regionName);
          
          const result: Record<string, unknown> = {
            id: region.id,
            name: region.name,
            main_generation: region.main_generation.name,
            location_count: region.locations.length,
            pokedex_count: region.pokedexes.length,
            version_groups: region.version_groups.map((vg) => vg.name),
            pokedexes: region.pokedexes.map((pd) => pd.name),
          };
          
          if (args.includeLocations) {
            result.locations = region.locations.map((loc) => loc.name);
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_CHARACTERISTIC: tool({
      name: 'pokemon_get_characteristic',
      description: 'Get IV-based characteristic information that determines personality phrases',
      schema: z.object({
        characteristicId: z.number().describe('Characteristic ID (1-30)'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const characteristic = await client.getCharacteristic(args.characteristicId);
          
          // Find English description
          const englishDesc = characteristic.descriptions.find(
            (d) => d.language.name === setup.defaultLanguage || d.language.name === 'en'
          );
          
          return JSON.stringify(
            {
              id: characteristic.id,
              gene_modulo: characteristic.gene_modulo,
              highest_stat: characteristic.highest_stat.name,
              possible_values: characteristic.possible_values,
              description: englishDesc?.description || 'No description available',
              iv_calculation: {
                explanation: `This characteristic appears when the highest IV mod 5 equals ${characteristic.gene_modulo}`,
                possible_iv_values: characteristic.possible_values,
                affected_stat: characteristic.highest_stat.name,
              },
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_GROWTH_RATE: tool({
      name: 'pokemon_get_growth_rate',
      description: 'Get experience curve and leveling information for Pokemon species',
      schema: z.object({
        growthRateName: z.string().describe('Growth rate name (e.g., "slow", "medium-fast")'),
        includeSpecies: z.boolean().optional().describe('Include Pokemon species using this growth rate'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const growthRate = await client.getGrowthRate(args.growthRateName);
          
          // Find English description
          const englishDesc = growthRate.descriptions.find(
            (d) => d.language.name === setup.defaultLanguage || d.language.name === 'en'
          );
          
          const result: Record<string, unknown> = {
            id: growthRate.id,
            name: growthRate.name,
            formula: growthRate.formula,
            description: englishDesc?.description || 'No description available',
            total_species_count: growthRate.pokemon_species.length,
            experience_milestones: {
              level_10: growthRate.levels.find((l) => l.level === 10)?.experience || 0,
              level_25: growthRate.levels.find((l) => l.level === 25)?.experience || 0,
              level_50: growthRate.levels.find((l) => l.level === 50)?.experience || 0,
              level_100: growthRate.levels.find((l) => l.level === 100)?.experience || 0,
            },
          };
          
          if (args.includeSpecies) {
            result.pokemon_species = growthRate.pokemon_species
              .slice(0, 20)
              .map((ps) => ps.name);
              
            if (growthRate.pokemon_species.length > 20) {
              result.species_note = `Showing first 20 of ${growthRate.pokemon_species.length} species`;
            }
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_ITEM_CATEGORY: tool({
      name: 'pokemon_get_item_category',
      description: 'Get item category information and all items in that category',
      schema: z.object({
        categoryName: z.string().describe('Item category name or ID (e.g., "healing" or "27")'),
        includeItems: z.boolean().optional().describe('Include list of items in this category'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const category = await client.getItemCategory(args.categoryName);
          
          const result: Record<string, unknown> = {
            id: category.id,
            name: category.name,
            pocket: category.pocket.name,
            item_count: category.items.length,
          };
          
          if (args.includeItems) {
            result.items = category.items.slice(0, 30).map((item) => item.name);
            
            if (category.items.length > 30) {
              result.items_note = `Showing first 30 of ${category.items.length} items`;
            }
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    ADVANCED_ITEM_SEARCH: tool({
      name: 'pokemon_advanced_item_search',
      description: 'Search items by category, attributes, cost, or effects',
      schema: z.object({
        attributeName: z.string().optional().describe('Item attribute to filter by (e.g., "consumable")'),
        categoryName: z.string().optional().describe('Item category to filter by'),
        minCost: z.number().optional().describe('Minimum item cost'),
        maxCost: z.number().optional().describe('Maximum item cost'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          let itemResults: Array<{ name: string; category: string; cost: number; attributes: string[] }> = [];
          
          if (args.attributeName) {
            const attribute = await client.getItemAttribute(args.attributeName);
            
            // Get item details for each item with this attribute
            const itemDetails = await Promise.all(
              attribute.items.slice(0, 20).map(async (item) => {
                try {
                  const itemData = await client.getItem(item.name);
                  return {
                    name: itemData.name,
                    category: itemData.category.name,
                    cost: itemData.cost,
                    attributes: itemData.attributes.map((a) => a.name),
                  };
                } catch {
                  return null;
                }
              })
            );
            
            itemResults = itemDetails.filter((item) => item !== null) as Array<{
              name: string;
              category: string;
              cost: number;
              attributes: string[];
            }>;
          } else if (args.categoryName) {
            const category = await client.getItemCategory(args.categoryName);
            
            const itemDetails = await Promise.all(
              category.items.slice(0, 20).map(async (item) => {
                try {
                  const itemData = await client.getItem(item.name);
                  return {
                    name: itemData.name,
                    category: itemData.category.name,
                    cost: itemData.cost,
                    attributes: itemData.attributes.map((a) => a.name),
                  };
                } catch {
                  return null;
                }
              })
            );
            
            itemResults = itemDetails.filter((item) => item !== null) as Array<{
              name: string;
              category: string;
              cost: number;
              attributes: string[];
            }>;
          }
          
          // Apply cost filtering if specified
          if (args.minCost !== undefined || args.maxCost !== undefined) {
            itemResults = itemResults.filter((item) => {
              if (args.minCost !== undefined && item.cost < args.minCost) return false;
              if (args.maxCost !== undefined && item.cost > args.maxCost) return false;
              return true;
            });
          }
          
          // Sort by cost descending
          itemResults.sort((a, b) => b.cost - a.cost);
          
          return JSON.stringify(
            {
              search_criteria: {
                attribute: args.attributeName || null,
                category: args.categoryName || null,
                cost_range: {
                  min: args.minCost || null,
                  max: args.maxCost || null,
                },
              },
              result_count: itemResults.length,
              items: itemResults,
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_BERRY: tool({
      name: 'pokemon_get_berry',
      description: 'Get comprehensive information about a Pokemon berry including growth, effects, and flavors',
      schema: z.object({
        berryName: z.string().describe('Berry name or ID (e.g., "cheri" or "1")'),
        includeFlavors: z
          .boolean()
          .optional()
          .describe('Include detailed flavor analysis'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const berry = await client.getBerry(args.berryName);
          
          const result: Record<string, unknown> = {
            id: berry.id,
            name: berry.name,
            growth_time_hours: berry.growth_time,
            max_harvest: berry.max_harvest,
            size_mm: berry.size,
            smoothness: berry.smoothness,
            soil_dryness: berry.soil_dryness,
            firmness: berry.firmness.name,
            natural_gift: {
              power: berry.natural_gift_power,
              type: berry.natural_gift_type.name,
            },
            item_equivalent: berry.item.name,
            flavors: berry.flavors.map((f) => ({
              flavor: f.flavor.name,
              potency: f.potency,
            })),
          };
          
          if (args.includeFlavors) {
            // Get detailed flavor information
            const flavorData = await Promise.all(
              berry.flavors.map((f) => client.getBerryFlavor(f.flavor.name))
            );
            
            result.detailed_flavors = flavorData.map((flavor, index) => ({
              name: flavor.name,
              potency_in_berry: berry.flavors[index].potency,
              contest_type: flavor.contest_type.name,
              total_berries_with_flavor: flavor.berries.length,
            }));
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    GET_BERRY_FLAVOR: tool({
      name: 'pokemon_get_berry_flavor',
      description: 'Get berry flavor information and which berries have this flavor',
      schema: z.object({
        flavorName: z.string().describe('Berry flavor name or ID (e.g., "spicy" or "1")'),
        includeBerries: z
          .boolean()
          .optional()
          .describe('Include list of berries with this flavor'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          const flavor = await client.getBerryFlavor(args.flavorName);
          
          const result: Record<string, unknown> = {
            id: flavor.id,
            name: flavor.name,
            contest_type: flavor.contest_type.name,
            berries_with_flavor_count: flavor.berries.length,
          };
          
          if (args.includeBerries) {
            result.berries = flavor.berries
              .sort((a, b) => b.potency - a.potency) // Sort by potency descending
              .map((b) => ({
                name: b.berry.name,
                potency: b.potency,
              }));
              
            result.strongest_berry = flavor.berries.reduce((strongest, current) =>
              current.potency > strongest.potency ? current : strongest
            );
            
            result.weakest_berry = flavor.berries.reduce((weakest, current) =>
              current.potency < weakest.potency ? current : weakest
            );
          }
          
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),

    BUILD_TEAM_ANALYSIS: tool({
      name: 'pokemon_build_team_analysis',
      description: 'Analyze a Pokemon team for type coverage, weaknesses, and synergies',
      schema: z.object({
        team: z
          .array(z.string())
          .min(1)
          .max(6)
          .describe('List of Pokemon in the team'),
      }),
      handler: async (args, context) => {
        try {
          const setup = await context.getSetup();
          const client = new PokemonAPIClient(setup.cacheResponses);
          
          // Fetch all Pokemon and their types
          const teamPokemon = await Promise.all(
            args.team.map((p) => client.getPokemon(p))
          );
          
          // Get all unique types in the team
          const teamTypes = new Set<string>();
          teamPokemon.forEach((pokemon) => {
            pokemon.types.forEach((t) => teamTypes.add(t.type.name));
          });
          
          // Get type data for all types
          const allTypes = [
            'normal',
            'fighting',
            'flying',
            'poison',
            'ground',
            'rock',
            'bug',
            'ghost',
            'steel',
            'fire',
            'water',
            'grass',
            'electric',
            'psychic',
            'ice',
            'dragon',
            'dark',
            'fairy',
          ];
          
          const typeData = await Promise.all(
            allTypes.map((type) => client.getType(type))
          );
          
          // Calculate offensive coverage
          const offensiveCoverage: Record<string, number> = {};
          for (const defendingType of allTypes) {
            let maxMultiplier = 0;
            
            for (const attackingType of teamTypes) {
              const attackingTypeData = typeData.find((t) => t.name === attackingType)!;
              const defendingTypeData = typeData.find((t) => t.name === defendingType)!;
              
              const multiplier = calculateTypeEffectiveness(attackingTypeData, [
                defendingTypeData,
              ]);
              maxMultiplier = Math.max(maxMultiplier, multiplier);
            }
            
            offensiveCoverage[defendingType] = maxMultiplier;
          }
          
          // Calculate defensive weaknesses
          const defensiveWeaknesses: Record<string, { count: number; pokemon: string[] }> = {};
          
          for (const attackingType of allTypes) {
            const attackingTypeData = typeData.find((t) => t.name === attackingType)!;
            const weakPokemon: string[] = [];
            
            for (const pokemon of teamPokemon) {
              const pokemonTypes = pokemon.types.map((t) => t.type.name);
              const pokemonTypeData = pokemonTypes.map((type) =>
                typeData.find((t) => t.name === type)
              ) as TypeData[];
              
              const effectiveness = calculateTypeEffectiveness(
                attackingTypeData,
                pokemonTypeData
              );
              
              if (effectiveness > 1) {
                weakPokemon.push(pokemon.name);
              }
            }
            
            if (weakPokemon.length > 0) {
              defensiveWeaknesses[attackingType] = {
                count: weakPokemon.length,
                pokemon: weakPokemon,
              };
            }
          }
          
          // Team composition summary
          const teamSummary = teamPokemon.map((pokemon) => ({
            name: pokemon.name,
            types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
            total_stats: pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0),
            role:
              pokemon.stats.find((s) => s.stat.name === 'attack')!.base_stat >
              pokemon.stats.find((s) => s.stat.name === 'special-attack')!.base_stat
                ? 'Physical Attacker'
                : 'Special Attacker',
          }));
          
          return JSON.stringify(
            {
              team_composition: teamSummary,
              type_diversity: Array.from(teamTypes),
              offensive_coverage: {
                super_effective_against: Object.entries(offensiveCoverage)
                  .filter(([_, mult]) => mult >= 2)
                  .map(([type]) => type),
                normal_damage_against: Object.entries(offensiveCoverage)
                  .filter(([_, mult]) => mult === 1)
                  .map(([type]) => type),
                not_very_effective_against: Object.entries(offensiveCoverage)
                  .filter(([_, mult]) => mult > 0 && mult < 1)
                  .map(([type]) => type),
                no_effect_against: Object.entries(offensiveCoverage)
                  .filter(([_, mult]) => mult === 0)
                  .map(([type]) => type),
              },
              defensive_weaknesses: Object.entries(defensiveWeaknesses)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, data]) => ({
                  type,
                  vulnerable_pokemon_count: data.count,
                  vulnerable_pokemon: data.pokemon,
                })),
              recommendations: {
                coverage_gaps: Object.entries(offensiveCoverage)
                  .filter(([_, mult]) => mult < 1)
                  .map(([type]) => `Consider adding moves effective against ${type} types`),
                defensive_concerns: Object.entries(defensiveWeaknesses)
                  .filter(([_, data]) => data.count >= 3)
                  .map(
                    ([type, data]) =>
                      `${data.count} team members are weak to ${type} - consider adding resistant Pokemon`
                  ),
              },
            },
            null,
            2
          );
        } catch (error) {
          return handlePokemonError(error);
        }
      },
    }),
  }),
});