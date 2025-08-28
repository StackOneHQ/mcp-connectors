import type { MCPToolDefinition } from '@stackone/mcp-config-types';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockConnectorContext } from '../__mocks__/context';
import { PokemonConnectorConfig } from './pokemon';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#PokemonConnector', () => {
  describe('.GET_POKEMON', () => {
    describe('when Pokemon exists', () => {
      it('returns Pokemon details with stats and types', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/pikachu', () => {
            return HttpResponse.json({
              id: 25,
              name: 'pikachu',
              height: 4,
              weight: 60,
              base_experience: 112,
              stats: [
                { base_stat: 35, effort: 0, stat: { name: 'hp', url: 'https://pokeapi.co/api/v2/stat/1/' } },
                { base_stat: 55, effort: 0, stat: { name: 'attack', url: 'https://pokeapi.co/api/v2/stat/2/' } },
                { base_stat: 40, effort: 0, stat: { name: 'defense', url: 'https://pokeapi.co/api/v2/stat/3/' } },
                { base_stat: 50, effort: 0, stat: { name: 'special-attack', url: 'https://pokeapi.co/api/v2/stat/4/' } },
                { base_stat: 50, effort: 0, stat: { name: 'special-defense', url: 'https://pokeapi.co/api/v2/stat/5/' } },
                { base_stat: 90, effort: 2, stat: { name: 'speed', url: 'https://pokeapi.co/api/v2/stat/6/' } }
              ],
              types: [
                { slot: 1, type: { name: 'electric', url: 'https://pokeapi.co/api/v2/type/13/' } }
              ],
              abilities: [
                { is_hidden: false, slot: 1, ability: { name: 'static', url: 'https://pokeapi.co/api/v2/ability/9/' } },
                { is_hidden: true, slot: 3, ability: { name: 'lightning-rod', url: 'https://pokeapi.co/api/v2/ability/31/' } }
              ],
              species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
              sprites: {
                front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
                front_shiny: null,
                back_default: null,
                back_shiny: null,
                other: {
                  'official-artwork': {
                    front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
                    front_shiny: null
                  }
                }
              },
              forms: [],
              held_items: [],
              location_area_encounters: '',
              moves: []
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ identifier: 'pikachu' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(25);
        expect(parsed.name).toBe('pikachu');
        expect(parsed.types).toEqual(['electric']);
        expect(parsed.stats).toHaveLength(6);
        expect(parsed.stats[5]).toEqual({ name: 'speed', base_stat: 90, effort: 2 });
        expect(parsed.abilities).toHaveLength(2);
      });

      describe('and including species data', () => {
        it('fetches and includes species information', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/pokemon/pikachu', () => {
              return HttpResponse.json({
                id: 25,
                name: 'pikachu',
                height: 4,
                weight: 60,
                base_experience: 112,
                stats: [
                  { base_stat: 35, effort: 0, stat: { name: 'hp', url: 'https://pokeapi.co/api/v2/stat/1/' } }
                ],
                types: [
                  { slot: 1, type: { name: 'electric', url: 'https://pokeapi.co/api/v2/type/13/' } }
                ],
                abilities: [],
                species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
                sprites: { front_default: null, front_shiny: null, back_default: null, back_shiny: null },
                forms: [],
                held_items: [],
                location_area_encounters: '',
                moves: []
              });
            }),
            http.get('https://pokeapi.co/api/v2/pokemon-species/pikachu', () => {
              return HttpResponse.json({
                id: 25,
                name: 'pikachu',
                order: 35,
                gender_rate: 4,
                capture_rate: 190,
                base_happiness: 50,
                is_baby: false,
                is_legendary: false,
                is_mythical: false,
                hatch_counter: 10,
                has_gender_differences: true,
                forms_switchable: false,
                growth_rate: { name: 'medium-fast', url: 'https://pokeapi.co/api/v2/growth-rate/4/' },
                pokedex_numbers: [],
                egg_groups: [
                  { name: 'ground', url: 'https://pokeapi.co/api/v2/egg-group/5/' },
                  { name: 'fairy', url: 'https://pokeapi.co/api/v2/egg-group/6/' }
                ],
                color: { name: 'yellow', url: 'https://pokeapi.co/api/v2/pokemon-color/10/' },
                shape: { name: 'quadruped', url: 'https://pokeapi.co/api/v2/pokemon-shape/8/' },
                evolves_from_species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
                evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/10/' },
                habitat: { name: 'forest', url: 'https://pokeapi.co/api/v2/pokemon-habitat/2/' },
                generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
                names: [],
                flavor_text_entries: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_POKEMON as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

          const actual = await tool.handler(
            { identifier: 'pikachu', includeSpecies: true },
            mockContext
          );
          const parsed = JSON.parse(actual);

          expect(parsed.species).toBeDefined();
          expect(parsed.species.is_legendary).toBe(false);
          expect(parsed.species.is_mythical).toBe(false);
          expect(parsed.species.egg_groups).toEqual(['ground', 'fairy']);
          expect(parsed.species.evolution_chain_id).toBe('10');
        });
      });
    });

    describe('when Pokemon does not exist', () => {
      it('returns helpful error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/fakemon', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ identifier: 'fakemon' }, mockContext);

        expect(actual).toContain('not found');
        expect(actual).toContain('check the name/ID');
      });
    });

    describe('when network error occurs', () => {
      it('returns network error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/pikachu', () => {
            return HttpResponse.error();
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ identifier: 'pikachu' }, mockContext);

        expect(actual).toContain('Error');
      });
    });
  });

  describe('.SEARCH_POKEMON', () => {
    describe('when searching without filters', () => {
      it('returns paginated Pokemon list', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon', ({ request }) => {
            const url = new URL(request.url);
            const limit = url.searchParams.get('limit');
            const offset = url.searchParams.get('offset');

            expect(limit).toBe('20');
            expect(offset).toBe('0');

            return HttpResponse.json({
              count: 1302,
              next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
              previous: null,
              results: [
                { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
                { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
                { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.SEARCH_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ limit: 20, offset: 0 }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.count).toBe(1302);
        expect(parsed.next).toContain('offset=20');
        expect(parsed.results).toHaveLength(3);
        expect(parsed.results[0]).toEqual({ name: 'bulbasaur', id: '1' });
      });
    });

    describe('when filtering by type', () => {
      it('returns Pokemon of that type', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon', () => {
            return HttpResponse.json({
              count: 1302,
              next: null,
              previous: null,
              results: [
                { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
                { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
                { name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon/7/' }
              ]
            });
          }),
          http.get('https://pokeapi.co/api/v2/type/fire', () => {
            return HttpResponse.json({
              id: 10,
              name: 'fire',
              damage_relations: {
                no_damage_to: [],
                half_damage_to: [],
                double_damage_to: [],
                no_damage_from: [],
                half_damage_from: [],
                double_damage_from: []
              },
              pokemon: [
                { slot: 1, pokemon: { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' } },
                { slot: 1, pokemon: { name: 'charmeleon', url: 'https://pokeapi.co/api/v2/pokemon/5/' } },
                { slot: 1, pokemon: { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon/6/' } }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.SEARCH_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ type: 'fire' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.results).toHaveLength(1);
        expect(parsed.results[0].name).toBe('charmander');
      });
    });

    describe('when type does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon', () => {
            return HttpResponse.json({
              count: 1302,
              next: null,
              previous: null,
              results: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/type/invalid-type', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.SEARCH_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ type: 'invalid-type' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_TYPE_EFFECTIVENESS', () => {
    describe('when calculating single type matchup', () => {
      it('returns correct effectiveness relationships', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/type/fire', () => {
            return HttpResponse.json({
              id: 10,
              name: 'fire',
              damage_relations: {
                no_damage_to: [],
                half_damage_to: [
                  { name: 'fire', url: 'https://pokeapi.co/api/v2/type/10/' },
                  { name: 'water', url: 'https://pokeapi.co/api/v2/type/11/' },
                  { name: 'rock', url: 'https://pokeapi.co/api/v2/type/6/' },
                  { name: 'dragon', url: 'https://pokeapi.co/api/v2/type/16/' }
                ],
                double_damage_to: [
                  { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' },
                  { name: 'ice', url: 'https://pokeapi.co/api/v2/type/15/' },
                  { name: 'bug', url: 'https://pokeapi.co/api/v2/type/7/' },
                  { name: 'steel', url: 'https://pokeapi.co/api/v2/type/9/' }
                ],
                no_damage_from: [],
                half_damage_from: [
                  { name: 'fire', url: 'https://pokeapi.co/api/v2/type/10/' },
                  { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' },
                  { name: 'ice', url: 'https://pokeapi.co/api/v2/type/15/' },
                  { name: 'bug', url: 'https://pokeapi.co/api/v2/type/7/' },
                  { name: 'steel', url: 'https://pokeapi.co/api/v2/type/9/' },
                  { name: 'fairy', url: 'https://pokeapi.co/api/v2/type/18/' }
                ],
                double_damage_from: [
                  { name: 'water', url: 'https://pokeapi.co/api/v2/type/11/' },
                  { name: 'ground', url: 'https://pokeapi.co/api/v2/type/5/' },
                  { name: 'rock', url: 'https://pokeapi.co/api/v2/type/6/' }
                ]
              },
              pokemon: []
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_TYPE_EFFECTIVENESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ attackingType: 'fire' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.attacking_type).toBe('fire');
        expect(parsed.damage_relations.double_damage_to).toContain('grass');
        expect(parsed.damage_relations.double_damage_to).toContain('ice');
        expect(parsed.damage_relations.half_damage_to).toContain('water');
        expect(parsed.damage_relations.double_damage_from).toContain('water');
      });
    });

    describe('when calculating specific defending type matchup', () => {
      it('calculates effectiveness multiplier correctly', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/type/fire', () => {
            return HttpResponse.json({
              id: 10,
              name: 'fire',
              damage_relations: {
                no_damage_to: [],
                half_damage_to: [
                  { name: 'water', url: 'https://pokeapi.co/api/v2/type/11/' }
                ],
                double_damage_to: [
                  { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' }
                ],
                no_damage_from: [],
                half_damage_from: [],
                double_damage_from: []
              },
              pokemon: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/type/grass', () => {
            return HttpResponse.json({
              id: 12,
              name: 'grass',
              damage_relations: {
                no_damage_to: [],
                half_damage_to: [],
                double_damage_to: [],
                no_damage_from: [],
                half_damage_from: [],
                double_damage_from: []
              },
              pokemon: []
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_TYPE_EFFECTIVENESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler(
          { attackingType: 'fire', defendingTypes: ['grass'] },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.specific_matchup).toBeDefined();
        expect(parsed.specific_matchup.defending_types).toEqual(['grass']);
        expect(parsed.specific_matchup.effectiveness_multiplier).toBe(2);
        expect(parsed.specific_matchup.effectiveness_label).toContain('Super Effective');
      });
    });

    describe('when type does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/type/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_TYPE_EFFECTIVENESS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ attackingType: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_EVOLUTION_CHAIN', () => {
    describe('when fetching evolution chain', () => {
      it('returns properly formatted evolution chain', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon-species/pikachu', () => {
            return HttpResponse.json({
              id: 25,
              name: 'pikachu',
              evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/10/' },
              order: 35,
              gender_rate: 4,
              capture_rate: 190,
              base_happiness: 50,
              is_baby: false,
              is_legendary: false,
              is_mythical: false,
              hatch_counter: 10,
              has_gender_differences: true,
              forms_switchable: false,
              growth_rate: { name: 'medium-fast', url: '' },
              pokedex_numbers: [],
              egg_groups: [],
              color: { name: 'yellow', url: '' },
              shape: { name: 'quadruped', url: '' },
              evolves_from_species: null,
              habitat: null,
              generation: { name: 'generation-i', url: '' },
              names: [],
              flavor_text_entries: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/evolution-chain/10', () => {
            return HttpResponse.json({
              id: 10,
              baby_trigger_item: null,
              chain: {
                is_baby: true,
                species: { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' },
                evolution_details: [],
                evolves_to: [
                  {
                    is_baby: false,
                    species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
                    evolution_details: [
                      {
                        item: null,
                        trigger: { name: 'level-up', url: 'https://pokeapi.co/api/v2/evolution-trigger/1/' },
                        gender: null,
                        held_item: null,
                        known_move: null,
                        known_move_type: null,
                        location: null,
                        min_level: null,
                        min_happiness: 220,
                        min_beauty: null,
                        min_affection: null,
                        needs_overworld_rain: false,
                        party_species: null,
                        party_type: null,
                        relative_physical_stats: null,
                        time_of_day: '',
                        trade_species: null,
                        turn_upside_down: false
                      }
                    ],
                    evolves_to: [
                      {
                        is_baby: false,
                        species: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
                        evolution_details: [
                          {
                            item: { name: 'thunder-stone', url: 'https://pokeapi.co/api/v2/item/83/' },
                            trigger: { name: 'use-item', url: 'https://pokeapi.co/api/v2/evolution-trigger/3/' },
                            gender: null,
                            held_item: null,
                            known_move: null,
                            known_move_type: null,
                            location: null,
                            min_level: null,
                            min_happiness: null,
                            min_beauty: null,
                            min_affection: null,
                            needs_overworld_rain: false,
                            party_species: null,
                            party_type: null,
                            relative_physical_stats: null,
                            time_of_day: '',
                            trade_species: null,
                            turn_upside_down: false
                          }
                        ],
                        evolves_to: []
                      }
                    ]
                  }
                ]
              }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_EVOLUTION_CHAIN as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'pikachu' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.chain_id).toBe(10);
        expect(parsed.evolution_line).toHaveLength(3);
        expect(parsed.evolution_line[0].species).toBe('pichu');
        expect(parsed.evolution_line[0].stage).toBe('Base');
        expect(parsed.evolution_line[1].species).toBe('pikachu');
        expect(parsed.evolution_line[1].stage).toBe('Evolution Stage 1');
        expect(parsed.evolution_line[2].species).toBe('raichu');
        expect(parsed.evolution_line[2].evolution_methods[0].item).toBe('thunder-stone');
      });
    });

    describe('when species does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon-species/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_EVOLUTION_CHAIN as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ pokemonName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_ABILITY', () => {
    describe('when ability exists', () => {
      it('returns ability details with effect', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/ability/static', () => {
            return HttpResponse.json({
              id: 9,
              name: 'static',
              is_main_series: true,
              generation: { name: 'generation-iii', url: 'https://pokeapi.co/api/v2/generation/3/' },
              names: [],
              effect_entries: [
                {
                  effect: 'Contact with this Pokémon may cause paralysis.',
                  short_effect: 'May paralyze on contact.',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ],
              pokemon: [
                { is_hidden: false, slot: 1, pokemon: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' } },
                { is_hidden: false, slot: 1, pokemon: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' } }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ABILITY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ abilityName: 'static' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(9);
        expect(parsed.name).toBe('static');
        expect(parsed.effect).toContain('paralysis');
        expect(parsed.short_effect).toContain('paralyze');
      });

      describe('and including Pokemon list', () => {
        it('includes Pokemon with this ability', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/ability/static', () => {
              return HttpResponse.json({
                id: 9,
                name: 'static',
                is_main_series: true,
                generation: { name: 'generation-iii', url: 'https://pokeapi.co/api/v2/generation/3/' },
                names: [],
                effect_entries: [
                  {
                    effect: 'Contact with this Pokémon may cause paralysis.',
                    short_effect: 'May paralyze on contact.',
                    language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                  }
                ],
                pokemon: [
                  { is_hidden: false, slot: 1, pokemon: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' } },
                  { is_hidden: false, slot: 1, pokemon: { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' } },
                  { is_hidden: true, slot: 3, pokemon: { name: 'electrike', url: 'https://pokeapi.co/api/v2/pokemon/309/' } }
                ]
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_ABILITY as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

          const actual = await tool.handler({ abilityName: 'static', includePokemon: true }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.pokemon).toHaveLength(3);
          expect(parsed.pokemon[0]).toEqual({ name: 'pikachu', is_hidden: false, slot: 1 });
          expect(parsed.pokemon[2]).toEqual({ name: 'electrike', is_hidden: true, slot: 3 });
          expect(parsed.pokemon_count).toBe(3);
        });
      });

      describe('when no English translation exists', () => {
        it('returns fallback message', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/ability/static', () => {
              return HttpResponse.json({
                id: 9,
                name: 'static',
                is_main_series: true,
                generation: { name: 'generation-iii', url: 'https://pokeapi.co/api/v2/generation/3/' },
                names: [],
                effect_entries: [
                  {
                    effect: 'Kontakt mit diesem Pokémon kann Paralyse verursachen.',
                    short_effect: 'Kann bei Kontakt paralysieren.',
                    language: { name: 'de', url: 'https://pokeapi.co/api/v2/language/6/' }
                  }
                ],
                pokemon: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_ABILITY as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

          const actual = await tool.handler({ abilityName: 'static' }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.effect).toBe('No effect description available');
          expect(parsed.short_effect).toBe('No short effect description available');
        });
      });
    });

    describe('when ability does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/ability/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ABILITY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ abilityName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_MOVE', () => {
    describe('when move exists with meta data', () => {
      it('returns move details with meta information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/move/thunderbolt', () => {
            return HttpResponse.json({
              id: 85,
              name: 'thunderbolt',
              accuracy: 100,
              effect_chance: 10,
              pp: 15,
              priority: 0,
              power: 90,
              damage_class: { name: 'special', url: 'https://pokeapi.co/api/v2/move-damage-class/3/' },
              effect_entries: [
                {
                  effect: 'Has a 10% chance to paralyze the target.',
                  short_effect: 'Has a 10% chance to paralyze the target.',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ],
              type: { name: 'electric', url: 'https://pokeapi.co/api/v2/type/13/' },
              target: { name: 'selected-pokemon', url: 'https://pokeapi.co/api/v2/move-target/10/' },
              generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
              meta: {
                ailment: { name: 'paralysis', url: 'https://pokeapi.co/api/v2/move-ailment/1/' },
                category: { name: 'damage+ailment', url: 'https://pokeapi.co/api/v2/move-category/4/' },
                min_hits: null,
                max_hits: null,
                min_turns: null,
                max_turns: null,
                drain: 0,
                healing: 0,
                crit_rate: 0,
                ailment_chance: 10,
                flinch_chance: 0,
                stat_chance: 0
              }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_MOVE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ moveName: 'thunderbolt' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(85);
        expect(parsed.name).toBe('thunderbolt');
        expect(parsed.type).toBe('electric');
        expect(parsed.power).toBe(90);
        expect(parsed.accuracy).toBe(100);
        expect(parsed.meta).toBeDefined();
        expect(parsed.meta.ailment).toBe('paralysis');
        expect(parsed.meta.ailment_chance).toBe(10);
      });
    });

    describe('when move exists without meta data', () => {
      it('returns move details with null meta', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/move/splash', () => {
            return HttpResponse.json({
              id: 150,
              name: 'splash',
              accuracy: null,
              effect_chance: null,
              pp: 40,
              priority: 0,
              power: null,
              damage_class: { name: 'status', url: 'https://pokeapi.co/api/v2/move-damage-class/1/' },
              effect_entries: [
                {
                  effect: 'Does nothing.',
                  short_effect: 'Does nothing.',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ],
              type: { name: 'normal', url: 'https://pokeapi.co/api/v2/type/1/' },
              target: { name: 'user', url: 'https://pokeapi.co/api/v2/move-target/7/' },
              generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
              meta: null
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_MOVE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ moveName: 'splash' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('splash');
        expect(parsed.effect).toContain('Does nothing');
        expect(parsed.meta).toBeNull();
      });
    });

    describe('when move does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/move/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_MOVE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ moveName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_ITEM', () => {
    describe('when item exists', () => {
      it('returns item details with effect', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item/potion', () => {
            return HttpResponse.json({
              id: 17,
              name: 'potion',
              cost: 300,
              fling_power: 30,
              fling_effect: null,
              attributes: [
                { name: 'consumable', url: 'https://pokeapi.co/api/v2/item-attribute/1/' },
                { name: 'usable-in-battle', url: 'https://pokeapi.co/api/v2/item-attribute/2/' },
                { name: 'holdable', url: 'https://pokeapi.co/api/v2/item-attribute/5/' }
              ],
              category: { name: 'healing', url: 'https://pokeapi.co/api/v2/item-category/27/' },
              effect_entries: [
                {
                  effect: 'Restores 20 HP.',
                  short_effect: 'Restores 20 HP.',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ],
              sprites: {
                default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png'
              }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ITEM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ itemName: 'potion' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(17);
        expect(parsed.name).toBe('potion');
        expect(parsed.cost).toBe(300);
        expect(parsed.category).toBe('healing');
        expect(parsed.effect).toContain('Restores 20 HP');
        expect(parsed.attributes).toContain('consumable');
        expect(parsed.sprite).toContain('potion.png');
      });
    });

    describe('when item has no sprite', () => {
      it('returns item with null sprite', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item/test-item', () => {
            return HttpResponse.json({
              id: 999,
              name: 'test-item',
              cost: 0,
              fling_power: null,
              fling_effect: null,
              attributes: [],
              category: { name: 'other', url: 'https://pokeapi.co/api/v2/item-category/1/' },
              effect_entries: [],
              sprites: {
                default: null
              }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ITEM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ itemName: 'test-item' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.sprite).toBeNull();
      });
    });

    describe('when item does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ITEM as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ itemName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.COMPARE_POKEMON', () => {
    describe('when comparing multiple Pokemon', () => {
      it('returns comparison of requested aspects', async () => {
        const mockPokemonResponse = (name: string, id: number, type: string, attack: number, defense: number) => ({
          id,
          name,
          height: 10,
          weight: 100,
          base_experience: 100,
          stats: [
            { base_stat: 45, effort: 0, stat: { name: 'hp', url: '' } },
            { base_stat: attack, effort: 0, stat: { name: 'attack', url: '' } },
            { base_stat: defense, effort: 0, stat: { name: 'defense', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'special-attack', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'special-defense', url: '' } },
            { base_stat: 45, effort: 0, stat: { name: 'speed', url: '' } }
          ],
          types: [
            { slot: 1, type: { name: type, url: '' } }
          ],
          abilities: [
            { is_hidden: false, slot: 1, ability: { name: 'overgrow', url: '' } }
          ],
          species: { name, url: '' },
          sprites: { front_default: null, front_shiny: null, back_default: null, back_shiny: null },
          forms: [],
          held_items: [],
          location_area_encounters: '',
          moves: []
        });

        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/bulbasaur', () => {
            return HttpResponse.json(mockPokemonResponse('bulbasaur', 1, 'grass', 49, 49));
          }),
          http.get('https://pokeapi.co/api/v2/pokemon/charmander', () => {
            return HttpResponse.json(mockPokemonResponse('charmander', 4, 'fire', 52, 43));
          })
        );

        const tool = PokemonConnectorConfig.tools.COMPARE_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler(
          { pokemonList: ['bulbasaur', 'charmander'], aspects: ['stats', 'types'] },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.pokemon).toEqual(['bulbasaur', 'charmander']);
        expect(parsed.stats_comparison).toHaveLength(2);
        expect(parsed.stats_comparison[0].name).toBe('bulbasaur');
        expect(parsed.stats_comparison[0].attack).toBe(49);
        expect(parsed.stats_comparison[1].name).toBe('charmander');
        expect(parsed.stats_comparison[1].attack).toBe(52);
        expect(parsed.types[0].types).toEqual(['grass']);
        expect(parsed.types[1].types).toEqual(['fire']);
      });
    });
  });

  describe('.BUILD_TEAM_ANALYSIS', () => {
    describe('when analyzing team composition', () => {
      it('identifies type coverage and weaknesses', async () => {
        const mockPokemonResponse = (name: string, type1: string, type2?: string) => ({
          id: 1,
          name,
          height: 10,
          weight: 100,
          base_experience: 100,
          stats: [
            { base_stat: 45, effort: 0, stat: { name: 'hp', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'attack', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'defense', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'special-attack', url: '' } },
            { base_stat: 50, effort: 0, stat: { name: 'special-defense', url: '' } },
            { base_stat: 45, effort: 0, stat: { name: 'speed', url: '' } }
          ],
          types: [
            { slot: 1, type: { name: type1, url: '' } },
            ...(type2 ? [{ slot: 2, type: { name: type2, url: '' } }] : [])
          ],
          abilities: [],
          species: { name, url: '' },
          sprites: { front_default: null, front_shiny: null, back_default: null, back_shiny: null },
          forms: [],
          held_items: [],
          location_area_encounters: '',
          moves: []
        });

        const mockTypeResponse = (typeName: string, doubleTo: string[] = [], halfTo: string[] = []) => ({
          id: 1,
          name: typeName,
          damage_relations: {
            no_damage_to: [],
            half_damage_to: halfTo.map(t => ({ name: t, url: '' })),
            double_damage_to: doubleTo.map(t => ({ name: t, url: '' })),
            no_damage_from: [],
            half_damage_from: [],
            double_damage_from: []
          },
          pokemon: []
        });

        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/charizard', () => {
            return HttpResponse.json(mockPokemonResponse('charizard', 'fire', 'flying'));
          }),
          http.get('https://pokeapi.co/api/v2/pokemon/blastoise', () => {
            return HttpResponse.json(mockPokemonResponse('blastoise', 'water'));
          }),
          // Mock all type endpoints
          http.get('https://pokeapi.co/api/v2/type/fire', () => {
            return HttpResponse.json(mockTypeResponse('fire', ['grass', 'ice', 'bug', 'steel'], ['water', 'rock', 'dragon']));
          }),
          http.get('https://pokeapi.co/api/v2/type/water', () => {
            return HttpResponse.json(mockTypeResponse('water', ['fire', 'ground', 'rock'], ['water', 'grass', 'dragon']));
          }),
          http.get('https://pokeapi.co/api/v2/type/flying', () => {
            return HttpResponse.json(mockTypeResponse('flying', ['grass', 'fighting', 'bug'], ['electric', 'rock', 'steel']));
          }),
          // Mock all other type endpoints with basic responses
          http.get('https://pokeapi.co/api/v2/type/:type', ({ params }) => {
            return HttpResponse.json(mockTypeResponse(params.type as string));
          })
        );

        const tool = PokemonConnectorConfig.tools.BUILD_TEAM_ANALYSIS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false }); // Disable cache for this test

        const actual = await tool.handler(
          { team: ['charizard', 'blastoise'] },
          mockContext
        );
        const parsed = JSON.parse(actual);

        expect(parsed.team_composition).toHaveLength(2);
        expect(parsed.team_composition[0].name).toBe('charizard');
        expect(parsed.team_composition[0].types).toContain('fire');
        expect(parsed.team_composition[1].name).toBe('blastoise');
        expect(parsed.type_diversity).toContain('fire');
        expect(parsed.type_diversity).toContain('water');
        expect(parsed.offensive_coverage).toBeDefined();
        expect(parsed.defensive_weaknesses).toBeDefined();
        expect(parsed.recommendations).toBeDefined();
      });
    });
  });

  describe('.GET_NATURE', () => {
    describe('when nature exists with stat modifiers', () => {
      it('returns nature details with stat effects', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/nature/adamant', () => {
            return HttpResponse.json({
              id: 1,
              name: 'adamant',
              decreased_stat: { name: 'special-attack', url: 'https://pokeapi.co/api/v2/stat/4/' },
              increased_stat: { name: 'attack', url: 'https://pokeapi.co/api/v2/stat/2/' },
              hates_flavor: { name: 'dry', url: 'https://pokeapi.co/api/v2/berry-flavor/1/' },
              likes_flavor: { name: 'spicy', url: 'https://pokeapi.co/api/v2/berry-flavor/2/' },
              pokeathlon_stat_changes: [
                { max_change: 2, pokeathlon_stat: { name: 'power', url: 'https://pokeapi.co/api/v2/pokeathlon-stat/1/' } }
              ],
              move_battle_style_preferences: [
                { 
                  low_hp_preference: 56, 
                  high_hp_preference: 85, 
                  move_battle_style: { name: 'attack', url: 'https://pokeapi.co/api/v2/move-battle-style/1/' } 
                }
              ],
              names: []
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_NATURE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ natureName: 'adamant' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('adamant');
        expect(parsed.increased_stat).toBe('attack');
        expect(parsed.decreased_stat).toBe('special-attack');
        expect(parsed.likes_flavor).toBe('spicy');
        expect(parsed.stat_changes.increased).toBe('+10% attack');
        expect(parsed.stat_changes.decreased).toBe('-10% special-attack');
      });
    });

    describe('when nature has no stat modifiers', () => {
      it('returns nature with neutral stat effects', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/nature/docile', () => {
            return HttpResponse.json({
              id: 6,
              name: 'docile',
              decreased_stat: null,
              increased_stat: null,
              hates_flavor: null,
              likes_flavor: null,
              pokeathlon_stat_changes: [],
              move_battle_style_preferences: [],
              names: []
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_NATURE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ natureName: 'docile' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('docile');
        expect(parsed.increased_stat).toBeNull();
        expect(parsed.decreased_stat).toBeNull();
        expect(parsed.stat_changes.increased).toBe('None');
        expect(parsed.stat_changes.decreased).toBe('None');
      });
    });

    describe('when nature does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/nature/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_NATURE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ natureName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.FIND_POKEMON_LOCATIONS', () => {
    describe('when Pokemon has encounter data', () => {
      it('returns location encounter details', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/pikachu/encounters', () => {
            return HttpResponse.json([
              {
                location_area: { name: 'viridian-forest-area', url: 'https://pokeapi.co/api/v2/location-area/26/' },
                version_details: [
                  {
                    version: { name: 'yellow', url: 'https://pokeapi.co/api/v2/version/3/' },
                    max_chance: 5,
                    encounter_details: [
                      {
                        min_level: 3,
                        max_level: 5,
                        condition_values: [],
                        chance: 5,
                        method: { name: 'walk', url: 'https://pokeapi.co/api/v2/encounter-method/1/' }
                      }
                    ]
                  }
                ]
              }
            ]);
          })
        );

        const tool = PokemonConnectorConfig.tools.FIND_POKEMON_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'pikachu' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.pokemon).toBe('pikachu');
        expect(parsed.encounter_count).toBe(1);
        expect(parsed.encounters).toHaveLength(1);
        expect(parsed.encounters[0].location_area).toBe('viridian-forest-area');
        expect(parsed.encounters[0].versions[0].version).toBe('yellow');
        expect(parsed.encounters[0].versions[0].encounter_methods[0].method).toBe('walk');
        expect(parsed.encounters[0].versions[0].encounter_methods[0].min_level).toBe(3);
      });
    });

    describe('when Pokemon has no encounter data', () => {
      it('returns empty encounters list', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/mew/encounters', () => {
            return HttpResponse.json([]);
          })
        );

        const tool = PokemonConnectorConfig.tools.FIND_POKEMON_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'mew' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.pokemon).toBe('mew');
        expect(parsed.encounters).toEqual([]);
        expect(parsed.message).toContain('cannot be found in the wild');
      });
    });

    describe('when Pokemon does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon/invalid/encounters', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.FIND_POKEMON_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ pokemonName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_GENERATION_POKEMON', () => {
    describe('when generation exists', () => {
      it('returns generation summary with counts', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/generation/generation-i', () => {
            return HttpResponse.json({
              id: 1,
              name: 'generation-i',
              abilities: [
                { name: 'stench', url: 'https://pokeapi.co/api/v2/ability/1/' },
                { name: 'drizzle', url: 'https://pokeapi.co/api/v2/ability/2/' }
              ],
              names: [],
              main_region: { name: 'kanto', url: 'https://pokeapi.co/api/v2/region/1/' },
              moves: [
                { name: 'pound', url: 'https://pokeapi.co/api/v2/move/1/' },
                { name: 'karate-chop', url: 'https://pokeapi.co/api/v2/move/2/' }
              ],
              pokemon_species: [
                { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
                { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
                { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon-species/3/' }
              ],
              types: [
                { name: 'normal', url: 'https://pokeapi.co/api/v2/type/1/' },
                { name: 'fighting', url: 'https://pokeapi.co/api/v2/type/2/' }
              ],
              version_groups: [
                { name: 'red-blue', url: 'https://pokeapi.co/api/v2/version-group/1/' },
                { name: 'yellow', url: 'https://pokeapi.co/api/v2/version-group/2/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_GENERATION_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ generation: 'generation-i' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(1);
        expect(parsed.name).toBe('generation-i');
        expect(parsed.main_region).toBe('kanto');
        expect(parsed.pokemon_count).toBe(3);
        expect(parsed.abilities_count).toBe(2);
        expect(parsed.moves_count).toBe(2);
        expect(parsed.types_count).toBe(2);
      });
    });

    describe('when including detailed information', () => {
      it('includes lists of Pokemon, moves, and abilities', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/generation/generation-ii', () => {
            return HttpResponse.json({
              id: 2,
              name: 'generation-ii',
              abilities: [
                { name: 'intimidate', url: 'https://pokeapi.co/api/v2/ability/22/' }
              ],
              names: [],
              main_region: { name: 'johto', url: 'https://pokeapi.co/api/v2/region/2/' },
              moves: [
                { name: 'steel-wing', url: 'https://pokeapi.co/api/v2/move/211/' }
              ],
              pokemon_species: [
                { name: 'chikorita', url: 'https://pokeapi.co/api/v2/pokemon-species/152/' }
              ],
              types: [
                { name: 'dark', url: 'https://pokeapi.co/api/v2/type/17/' },
                { name: 'steel', url: 'https://pokeapi.co/api/v2/type/9/' }
              ],
              version_groups: [
                { name: 'gold-silver', url: 'https://pokeapi.co/api/v2/version-group/3/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_GENERATION_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ generation: 'generation-ii', includeDetails: true }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.pokemon_species).toEqual(['chikorita']);
        expect(parsed.abilities).toEqual(['intimidate']);
        expect(parsed.moves).toEqual(['steel-wing']);
        expect(parsed.types).toEqual(['dark', 'steel']);
        expect(parsed.version_groups).toEqual(['gold-silver']);
      });
    });

    describe('when generation does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/generation/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_GENERATION_POKEMON as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ generation: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_BREEDING_INFO', () => {
    describe('when Pokemon can breed', () => {
      it('returns breeding compatibility information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon-species/pikachu', () => {
            return HttpResponse.json({
              id: 25,
              name: 'pikachu',
              order: 35,
              gender_rate: 4,
              capture_rate: 190,
              base_happiness: 50,
              is_baby: false,
              is_legendary: false,
              is_mythical: false,
              hatch_counter: 10,
              has_gender_differences: true,
              forms_switchable: false,
              growth_rate: { name: 'medium-fast', url: '' },
              pokedex_numbers: [],
              egg_groups: [
                { name: 'field', url: 'https://pokeapi.co/api/v2/egg-group/1/' },
                { name: 'fairy', url: 'https://pokeapi.co/api/v2/egg-group/6/' }
              ],
              color: { name: 'yellow', url: '' },
              shape: { name: 'quadruped', url: '' },
              evolves_from_species: null,
              evolution_chain: { url: '' },
              habitat: null,
              generation: { name: 'generation-i', url: '' },
              names: [],
              flavor_text_entries: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/egg-group/field', () => {
            return HttpResponse.json({
              id: 1,
              name: 'field',
              names: [],
              pokemon_species: [
                { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
                { name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' },
                { name: 'growlithe', url: 'https://pokeapi.co/api/v2/pokemon-species/58/' }
              ]
            });
          }),
          http.get('https://pokeapi.co/api/v2/egg-group/fairy', () => {
            return HttpResponse.json({
              id: 6,
              name: 'fairy',
              names: [],
              pokemon_species: [
                { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
                { name: 'clefairy', url: 'https://pokeapi.co/api/v2/pokemon-species/35/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BREEDING_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'pikachu' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.gender_rate).toBe(4);
        expect(parsed.gender_ratio.female_chance).toBe('50%');
        expect(parsed.gender_ratio.male_chance).toBe('50%');
        expect(parsed.egg_groups).toEqual(['field', 'fairy']);
        expect(parsed.hatch_counter).toBe(10);
        expect(parsed.breeding_compatibility.can_breed).toBe(true);
        expect(parsed.compatible_species_count).toBe(4);
      });
    });

    describe('when Pokemon is genderless', () => {
      it('indicates Pokemon cannot breed', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon-species/magnemite', () => {
            return HttpResponse.json({
              id: 81,
              name: 'magnemite',
              order: 101,
              gender_rate: -1,
              capture_rate: 190,
              base_happiness: 50,
              is_baby: false,
              is_legendary: false,
              is_mythical: false,
              hatch_counter: 20,
              has_gender_differences: false,
              forms_switchable: false,
              growth_rate: { name: 'medium-fast', url: '' },
              pokedex_numbers: [],
              egg_groups: [
                { name: 'mineral', url: 'https://pokeapi.co/api/v2/egg-group/8/' }
              ],
              color: { name: 'gray', url: '' },
              shape: { name: 'ball', url: '' },
              evolves_from_species: null,
              evolution_chain: { url: '' },
              habitat: null,
              generation: { name: 'generation-i', url: '' },
              names: [],
              flavor_text_entries: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/egg-group/mineral', () => {
            return HttpResponse.json({
              id: 8,
              name: 'mineral',
              names: [],
              pokemon_species: [
                { name: 'magnemite', url: 'https://pokeapi.co/api/v2/pokemon-species/81/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BREEDING_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'magnemite' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.gender_ratio.female_chance).toBe('Genderless');
        expect(parsed.gender_ratio.male_chance).toBe('Genderless');
        expect(parsed.breeding_compatibility.can_breed).toBe(false);
        expect(parsed.breeding_compatibility.breeding_requirements).toContain('genderless');
      });
    });

    describe('when Pokemon is a baby', () => {
      it('indicates baby Pokemon cannot breed', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/pokemon-species/pichu', () => {
            return HttpResponse.json({
              id: 172,
              name: 'pichu',
              order: 205,
              gender_rate: 4,
              capture_rate: 190,
              base_happiness: 50,
              is_baby: true,
              is_legendary: false,
              is_mythical: false,
              hatch_counter: 10,
              has_gender_differences: true,
              forms_switchable: false,
              growth_rate: { name: 'medium-fast', url: '' },
              pokedex_numbers: [],
              egg_groups: [
                { name: 'undiscovered', url: 'https://pokeapi.co/api/v2/egg-group/15/' }
              ],
              color: { name: 'yellow', url: '' },
              shape: { name: 'quadruped', url: '' },
              evolves_from_species: null,
              evolution_chain: { url: '' },
              habitat: null,
              generation: { name: 'generation-ii', url: '' },
              names: [],
              flavor_text_entries: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/egg-group/undiscovered', () => {
            return HttpResponse.json({
              id: 15,
              name: 'undiscovered',
              names: [],
              pokemon_species: [
                { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon-species/172/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BREEDING_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ pokemonName: 'pichu' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.breeding_compatibility.can_breed).toBe(false);
        expect(parsed.breeding_compatibility.breeding_requirements).toContain('baby Pokemon');
      });
    });
  });

  describe('.GET_BERRY', () => {
    describe('when berry exists', () => {
      it('returns berry details with growth and flavor information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/berry/cheri', () => {
            return HttpResponse.json({
              id: 1,
              name: 'cheri',
              growth_time: 3,
              max_harvest: 5,
              natural_gift_power: 60,
              size: 20,
              smoothness: 25,
              soil_dryness: 15,
              firmness: { name: 'soft', url: 'https://pokeapi.co/api/v2/berry-firmness/2/' },
              flavors: [
                { potency: 10, flavor: { name: 'spicy', url: 'https://pokeapi.co/api/v2/berry-flavor/1/' } },
                { potency: 0, flavor: { name: 'dry', url: 'https://pokeapi.co/api/v2/berry-flavor/2/' } },
                { potency: 0, flavor: { name: 'sweet', url: 'https://pokeapi.co/api/v2/berry-flavor/3/' } },
                { potency: 0, flavor: { name: 'bitter', url: 'https://pokeapi.co/api/v2/berry-flavor/4/' } },
                { potency: 0, flavor: { name: 'sour', url: 'https://pokeapi.co/api/v2/berry-flavor/5/' } }
              ],
              item: { name: 'cheri-berry', url: 'https://pokeapi.co/api/v2/item/126/' },
              natural_gift_type: { name: 'fire', url: 'https://pokeapi.co/api/v2/type/10/' }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BERRY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ berryName: 'cheri' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(1);
        expect(parsed.name).toBe('cheri');
        expect(parsed.growth_time_hours).toBe(3);
        expect(parsed.max_harvest).toBe(5);
        expect(parsed.firmness).toBe('soft');
        expect(parsed.natural_gift.power).toBe(60);
        expect(parsed.natural_gift.type).toBe('fire');
        expect(parsed.flavors).toHaveLength(5);
        expect(parsed.flavors[0]).toEqual({ flavor: 'spicy', potency: 10 });
      });

      describe('and including detailed flavors', () => {
        it('fetches flavor details and contest relationships', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/berry/cheri', () => {
              return HttpResponse.json({
                id: 1,
                name: 'cheri',
                growth_time: 3,
                max_harvest: 5,
                natural_gift_power: 60,
                size: 20,
                smoothness: 25,
                soil_dryness: 15,
                firmness: { name: 'soft', url: '' },
                flavors: [
                  { potency: 10, flavor: { name: 'spicy', url: 'https://pokeapi.co/api/v2/berry-flavor/1/' } }
                ],
                item: { name: 'cheri-berry', url: '' },
                natural_gift_type: { name: 'fire', url: '' }
              });
            }),
            http.get('https://pokeapi.co/api/v2/berry-flavor/spicy', () => {
              return HttpResponse.json({
                id: 1,
                name: 'spicy',
                berries: [
                  { potency: 10, berry: { name: 'cheri', url: '' } },
                  { potency: 15, berry: { name: 'tamato', url: '' } }
                ],
                contest_type: { name: 'cool', url: '' },
                names: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_BERRY as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ berryName: 'cheri', includeFlavors: true }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.detailed_flavors).toHaveLength(1);
          expect(parsed.detailed_flavors[0].name).toBe('spicy');
          expect(parsed.detailed_flavors[0].contest_type).toBe('cool');
          expect(parsed.detailed_flavors[0].potency_in_berry).toBe(10);
          expect(parsed.detailed_flavors[0].total_berries_with_flavor).toBe(2);
        });
      });
    });

    describe('when berry does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/berry/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BERRY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ berryName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_BERRY_FLAVOR', () => {
    describe('when flavor exists', () => {
      it('returns flavor details with contest type', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/berry-flavor/spicy', () => {
            return HttpResponse.json({
              id: 1,
              name: 'spicy',
              berries: [
                { potency: 10, berry: { name: 'cheri', url: 'https://pokeapi.co/api/v2/berry/1/' } },
                { potency: 15, berry: { name: 'tamato', url: 'https://pokeapi.co/api/v2/berry/20/' } },
                { potency: 20, berry: { name: 'figy', url: 'https://pokeapi.co/api/v2/berry/3/' } }
              ],
              contest_type: { name: 'cool', url: 'https://pokeapi.co/api/v2/contest-type/1/' },
              names: [
                { name: 'Spicy', language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' } }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BERRY_FLAVOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ flavorName: 'spicy' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(1);
        expect(parsed.name).toBe('spicy');
        expect(parsed.contest_type).toBe('cool');
        expect(parsed.berries_with_flavor_count).toBe(3);
      });

      describe('and including berry list', () => {
        it('includes sorted berries with potency details', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/berry-flavor/sweet', () => {
              return HttpResponse.json({
                id: 3,
                name: 'sweet',
                berries: [
                  { potency: 5, berry: { name: 'pecha', url: 'https://pokeapi.co/api/v2/berry/5/' } },
                  { potency: 20, berry: { name: 'wiki', url: 'https://pokeapi.co/api/v2/berry/4/' } },
                  { potency: 10, berry: { name: 'oran', url: 'https://pokeapi.co/api/v2/berry/7/' } }
                ],
                contest_type: { name: 'cute', url: 'https://pokeapi.co/api/v2/contest-type/3/' },
                names: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_BERRY_FLAVOR as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ flavorName: 'sweet', includeBerries: true }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.berries).toHaveLength(3);
          expect(parsed.berries[0]).toEqual({ name: 'wiki', potency: 20 });
          expect(parsed.berries[2]).toEqual({ name: 'pecha', potency: 5 });
          expect(parsed.strongest_berry.berry.name).toBe('wiki');
          expect(parsed.weakest_berry.berry.name).toBe('pecha');
        });
      });
    });

    describe('when flavor does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/berry-flavor/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_BERRY_FLAVOR as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ flavorName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.EXPLORE_LOCATIONS', () => {
    describe('when location area exists', () => {
      it('returns detailed location and encounter information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/location-area/canalave-city-area', () => {
            return HttpResponse.json({
              id: 1,
              name: 'canalave-city-area',
              game_index: 1,
              encounter_method_rates: [
                {
                  encounter_method: { name: 'walk', url: 'https://pokeapi.co/api/v2/encounter-method/1/' },
                  version_details: [
                    { rate: 10, version: { name: 'diamond', url: 'https://pokeapi.co/api/v2/version/12/' } }
                  ]
                }
              ],
              location: { name: 'canalave-city', url: 'https://pokeapi.co/api/v2/location/1/' },
              names: [],
              pokemon_encounters: [
                {
                  pokemon: { name: 'tentacool', url: 'https://pokeapi.co/api/v2/pokemon/72/' },
                  version_details: [
                    {
                      version: { name: 'diamond', url: 'https://pokeapi.co/api/v2/version/12/' },
                      max_chance: 60,
                      encounter_details: [
                        {
                          min_level: 20,
                          max_level: 30,
                          condition_values: [],
                          chance: 60,
                          method: { name: 'surf', url: 'https://pokeapi.co/api/v2/encounter-method/5/' }
                        }
                      ]
                    }
                  ]
                }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.EXPLORE_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ locationName: 'canalave-city-area', includeEncounters: true }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('canalave-city-area');
        expect(parsed.location_parent).toBe('canalave-city');
        expect(parsed.pokemon_encounters).toHaveLength(1);
        expect(parsed.pokemon_encounters[0].pokemon).toBe('tentacool');
        expect(parsed.pokemon_encounters[0].versions[0].encounters[0].method).toBe('surf');
      });

      describe('and excluding encounters', () => {
        it('returns location info without encounter data', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/location-area/test-area', () => {
              return HttpResponse.json({
                id: 2,
                name: 'test-area',
                game_index: 2,
                encounter_method_rates: [],
                location: { name: 'test-location', url: '' },
                names: [],
                pokemon_encounters: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.EXPLORE_LOCATIONS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ locationName: 'test-area', includeEncounters: false }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.name).toBe('test-area');
          expect(parsed.pokemon_encounters).toBeUndefined();
        });
      });
    });

    describe('when location does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/location-area/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.EXPLORE_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ locationName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });

    describe('when network error occurs', () => {
      it('returns network error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/location-area/test', () => {
            return HttpResponse.error();
          })
        );

        const tool = PokemonConnectorConfig.tools.EXPLORE_LOCATIONS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ locationName: 'test' }, mockContext);

        expect(actual).toContain('Error');
      });
    });
  });

  describe('.GET_REGION_INFO', () => {
    describe('when region exists', () => {
      it('returns comprehensive region information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/region/kanto', () => {
            return HttpResponse.json({
              id: 1,
              locations: [
                { name: 'pallet-town', url: 'https://pokeapi.co/api/v2/location/1/' },
                { name: 'viridian-city', url: 'https://pokeapi.co/api/v2/location/2/' }
              ],
              name: 'kanto',
              names: [],
              main_generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
              pokedexes: [
                { name: 'kanto', url: 'https://pokeapi.co/api/v2/pokedex/2/' }
              ],
              version_groups: [
                { name: 'red-blue', url: 'https://pokeapi.co/api/v2/version-group/1/' },
                { name: 'yellow', url: 'https://pokeapi.co/api/v2/version-group/2/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_REGION_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ regionName: 'kanto', includeLocations: true }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('kanto');
        expect(parsed.main_generation).toBe('generation-i');
        expect(parsed.location_count).toBe(2);
        expect(parsed.locations).toEqual(['pallet-town', 'viridian-city']);
        expect(parsed.version_groups).toEqual(['red-blue', 'yellow']);
      });

      describe('and excluding locations', () => {
        it('returns region info without location details', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/region/johto', () => {
              return HttpResponse.json({
                id: 2,
                locations: [
                  { name: 'new-bark-town', url: 'https://pokeapi.co/api/v2/location/10/' }
                ],
                name: 'johto',
                names: [],
                main_generation: { name: 'generation-ii', url: '' },
                pokedexes: [
                  { name: 'johto', url: '' }
                ],
                version_groups: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_REGION_INFO as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ regionName: 'johto', includeLocations: false }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.name).toBe('johto');
          expect(parsed.location_count).toBe(1);
          expect(parsed.locations).toBeUndefined();
        });
      });
    });

    describe('when region does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/region/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_REGION_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ regionName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_CHARACTERISTIC', () => {
    describe('when characteristic exists', () => {
      it('returns IV-based characteristic details', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/characteristic/1', () => {
            return HttpResponse.json({
              id: 1,
              gene_modulo: 0,
              possible_values: [0, 5, 10, 15, 20, 25, 30],
              highest_stat: { name: 'hp', url: 'https://pokeapi.co/api/v2/stat/1/' },
              descriptions: [
                {
                  description: 'Loves to eat',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_CHARACTERISTIC as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ characteristicId: 1 }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe(1);
        expect(parsed.gene_modulo).toBe(0);
        expect(parsed.highest_stat).toBe('hp');
        expect(parsed.description).toBe('Loves to eat');
        expect(parsed.possible_values).toEqual([0, 5, 10, 15, 20, 25, 30]);
        expect(parsed.iv_calculation.explanation).toContain('mod 5 equals 0');
      });

      describe('when using non-English language', () => {
        it('returns description in requested language', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/characteristic/1', () => {
              return HttpResponse.json({
                id: 1,
                gene_modulo: 0,
                possible_values: [0, 5, 10, 15, 20, 25, 30],
                highest_stat: { name: 'hp', url: 'https://pokeapi.co/api/v2/stat/1/' },
                descriptions: [
                  {
                    description: 'Aime manger',
                    language: { name: 'fr', url: 'https://pokeapi.co/api/v2/language/5/' }
                  }
                ]
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_CHARACTERISTIC as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'fr' });

          const actual = await tool.handler({ characteristicId: 1 }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.description).toBe('Aime manger');
        });
      });

      describe('when no matching language description exists', () => {
        it('returns fallback message', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/characteristic/1', () => {
              return HttpResponse.json({
                id: 1,
                gene_modulo: 0,
                possible_values: [0, 5, 10, 15, 20, 25, 30],
                highest_stat: { name: 'hp', url: 'https://pokeapi.co/api/v2/stat/1/' },
                descriptions: [
                  {
                    description: 'Aime manger',
                    language: { name: 'fr', url: 'https://pokeapi.co/api/v2/language/5/' }
                  }
                ]
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_CHARACTERISTIC as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

          const actual = await tool.handler({ characteristicId: 1 }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.description).toBe('No description available');
        });
      });
    });

    describe('when characteristic does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/characteristic/999', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_CHARACTERISTIC as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ characteristicId: 999 }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_GROWTH_RATE', () => {
    describe('when growth rate exists', () => {
      it('returns experience curve information', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/growth-rate/medium-fast', () => {
            return HttpResponse.json({
              id: 4,
              name: 'medium-fast',
              formula: 'n^3',
              descriptions: [
                {
                  description: 'Uses the standard experience formula',
                  language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' }
                }
              ],
              levels: [
                { level: 1, experience: 0 },
                { level: 10, experience: 1000 },
                { level: 25, experience: 15625 },
                { level: 50, experience: 125000 },
                { level: 100, experience: 1000000 }
              ],
              pokemon_species: [
                { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
                { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon-species/4/' }
              ]
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_GROWTH_RATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

        const actual = await tool.handler({ growthRateName: 'medium-fast', includeSpecies: true }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('medium-fast');
        expect(parsed.formula).toBe('n^3');
        expect(parsed.experience_milestones.level_50).toBe(125000);
        expect(parsed.pokemon_species).toEqual(['bulbasaur', 'charmander']);
      });

      describe('when excluding species list', () => {
        it('returns growth rate without species data', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/growth-rate/slow', () => {
              return HttpResponse.json({
                id: 1,
                name: 'slow',
                formula: 'n^3',
                descriptions: [],
                levels: [
                  { level: 50, experience: 156250 }
                ],
                pokemon_species: [
                  { name: 'caterpie', url: '' }
                ]
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_GROWTH_RATE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true, defaultLanguage: 'en' });

          const actual = await tool.handler({ growthRateName: 'slow', includeSpecies: false }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.pokemon_species).toBeUndefined();
          expect(parsed.total_species_count).toBe(1);
        });
      });

      describe('when many species use growth rate', () => {
        it('shows note for truncated species list', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/growth-rate/medium-fast', () => {
              return HttpResponse.json({
                id: 4,
                name: 'medium-fast',
                formula: 'n^3',
                descriptions: [],
                levels: [],
                pokemon_species: Array.from({ length: 50 }, (_, i) => ({ 
                  name: `pokemon-${i + 1}`, 
                  url: `https://pokeapi.co/api/v2/pokemon-species/${i + 1}/` 
                }))
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_GROWTH_RATE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ growthRateName: 'medium-fast', includeSpecies: true }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.total_species_count).toBe(50);
          expect(parsed.pokemon_species).toHaveLength(20);
          expect(parsed.species_note).toContain('Showing first 20 of 50 species');
        });
      });

      describe('when level milestone is missing', () => {
        it('returns zero for missing experience values', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/growth-rate/test', () => {
              return HttpResponse.json({
                id: 99,
                name: 'test',
                formula: 'test',
                descriptions: [],
                levels: [
                  { level: 50, experience: 50000 }
                ],
                pokemon_species: []
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_GROWTH_RATE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ growthRateName: 'test' }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.experience_milestones.level_10).toBe(0);
          expect(parsed.experience_milestones.level_25).toBe(0);
          expect(parsed.experience_milestones.level_50).toBe(50000);
          expect(parsed.experience_milestones.level_100).toBe(0);
        });
      });
    });

    describe('when growth rate does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/growth-rate/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_GROWTH_RATE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ growthRateName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.GET_ITEM_CATEGORY', () => {
    describe('when item category exists', () => {
      it('returns category details with item listing', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-category/healing', () => {
            return HttpResponse.json({
              id: 27,
              name: 'healing',
              items: [
                { name: 'potion', url: 'https://pokeapi.co/api/v2/item/17/' },
                { name: 'super-potion', url: 'https://pokeapi.co/api/v2/item/18/' },
                { name: 'hyper-potion', url: 'https://pokeapi.co/api/v2/item/19/' }
              ],
              names: [],
              pocket: { name: 'items', url: 'https://pokeapi.co/api/v2/item-pocket/1/' }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ITEM_CATEGORY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ categoryName: 'healing', includeItems: true }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.name).toBe('healing');
        expect(parsed.pocket).toBe('items');
        expect(parsed.item_count).toBe(3);
        expect(parsed.items).toEqual(['potion', 'super-potion', 'hyper-potion']);
      });

      describe('when excluding items list', () => {
        it('returns category info without item details', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/item-category/healing', () => {
              return HttpResponse.json({
                id: 27,
                name: 'healing',
                items: [
                  { name: 'potion', url: 'https://pokeapi.co/api/v2/item/17/' }
                ],
                names: [],
                pocket: { name: 'items', url: '' }
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_ITEM_CATEGORY as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ categoryName: 'healing', includeItems: false }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.items).toBeUndefined();
          expect(parsed.item_count).toBe(1);
        });
      });

      describe('when category has many items', () => {
        it('shows note for truncated items list', async () => {
          server.use(
            http.get('https://pokeapi.co/api/v2/item-category/medicine', () => {
              return HttpResponse.json({
                id: 1,
                name: 'medicine',
                items: Array.from({ length: 50 }, (_, i) => ({ 
                  name: `item-${i + 1}`, 
                  url: `https://pokeapi.co/api/v2/item/${i + 1}/` 
                })),
                names: [],
                pocket: { name: 'items', url: '' }
              });
            })
          );

          const tool = PokemonConnectorConfig.tools.GET_ITEM_CATEGORY as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

          const actual = await tool.handler({ categoryName: 'medicine', includeItems: true }, mockContext);
          const parsed = JSON.parse(actual);

          expect(parsed.item_count).toBe(50);
          expect(parsed.items).toHaveLength(30);
          expect(parsed.items_note).toContain('Showing first 30 of 50 items');
        });
      });
    });

    describe('when item category does not exist', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-category/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.GET_ITEM_CATEGORY as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ categoryName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });
  });

  describe('.ADVANCED_ITEM_SEARCH', () => {
    describe('when searching by attribute', () => {
      it('returns items with specified attribute', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-attribute/consumable', () => {
            return HttpResponse.json({
              id: 1,
              name: 'consumable',
              items: [
                { name: 'potion', url: 'https://pokeapi.co/api/v2/item/17/' }
              ],
              names: [],
              descriptions: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/potion', () => {
            return HttpResponse.json({
              id: 17,
              name: 'potion',
              cost: 300,
              fling_power: 30,
              fling_effect: null,
              attributes: [
                { name: 'consumable', url: 'https://pokeapi.co/api/v2/item-attribute/1/' }
              ],
              category: { name: 'healing', url: 'https://pokeapi.co/api/v2/item-category/27/' },
              effect_entries: [],
              sprites: { default: null }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ attributeName: 'consumable' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.search_criteria.attribute).toBe('consumable');
        expect(parsed.result_count).toBe(1);
        expect(parsed.items[0].name).toBe('potion');
        expect(parsed.items[0].attributes).toEqual(['consumable']);
      });
    });

    describe('when searching by category', () => {
      it('returns items in specified category', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-category/healing', () => {
            return HttpResponse.json({
              id: 27,
              name: 'healing',
              items: [
                { name: 'super-potion', url: 'https://pokeapi.co/api/v2/item/18/' }
              ],
              names: [],
              pocket: { name: 'items', url: '' }
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/super-potion', () => {
            return HttpResponse.json({
              id: 18,
              name: 'super-potion',
              cost: 700,
              fling_power: 30,
              fling_effect: null,
              attributes: [
                { name: 'consumable', url: '' }
              ],
              category: { name: 'healing', url: '' },
              effect_entries: [],
              sprites: { default: null }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ categoryName: 'healing' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.search_criteria.category).toBe('healing');
        expect(parsed.items[0].name).toBe('super-potion');
        expect(parsed.items[0].category).toBe('healing');
      });
    });

    describe('when using cost filters', () => {
      it('filters items by cost range and sorts by cost descending', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-attribute/consumable', () => {
            return HttpResponse.json({
              id: 1,
              name: 'consumable',
              items: [
                { name: 'potion', url: 'https://pokeapi.co/api/v2/item/17/' },
                { name: 'super-potion', url: 'https://pokeapi.co/api/v2/item/18/' }
              ],
              names: [],
              descriptions: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/potion', () => {
            return HttpResponse.json({
              id: 17,
              name: 'potion',
              cost: 300,
              fling_power: 30,
              fling_effect: null,
              attributes: [{ name: 'consumable', url: '' }],
              category: { name: 'healing', url: '' },
              effect_entries: [],
              sprites: { default: null }
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/super-potion', () => {
            return HttpResponse.json({
              id: 18,
              name: 'super-potion',
              cost: 700,
              fling_power: 30,
              fling_effect: null,
              attributes: [{ name: 'consumable', url: '' }],
              category: { name: 'healing', url: '' },
              effect_entries: [],
              sprites: { default: null }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ attributeName: 'consumable', minCost: 400, maxCost: 800 }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.result_count).toBe(1);
        expect(parsed.items[0].name).toBe('super-potion');
        expect(parsed.items[0].cost).toBe(700);
      });
    });

    describe('when some item fetches fail', () => {
      it('filters out failed items and continues', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-attribute/consumable', () => {
            return HttpResponse.json({
              id: 1,
              name: 'consumable',
              items: [
                { name: 'potion', url: 'https://pokeapi.co/api/v2/item/17/' },
                { name: 'broken-item', url: 'https://pokeapi.co/api/v2/item/999/' }
              ],
              names: [],
              descriptions: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/potion', () => {
            return HttpResponse.json({
              id: 17,
              name: 'potion',
              cost: 300,
              fling_power: 30,
              fling_effect: null,
              attributes: [{ name: 'consumable', url: '' }],
              category: { name: 'healing', url: '' },
              effect_entries: [],
              sprites: { default: null }
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/broken-item', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ attributeName: 'consumable' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.result_count).toBe(1);
        expect(parsed.items[0].name).toBe('potion');
      });
    });

    describe('when both attribute and category are provided', () => {
      it('uses attribute search as primary path', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-attribute/consumable', () => {
            return HttpResponse.json({
              id: 1,
              name: 'consumable',
              items: [
                { name: 'attribute-item', url: 'https://pokeapi.co/api/v2/item/100/' }
              ],
              names: [],
              descriptions: []
            });
          }),
          http.get('https://pokeapi.co/api/v2/item/attribute-item', () => {
            return HttpResponse.json({
              id: 100,
              name: 'attribute-item',
              cost: 500,
              fling_power: null,
              fling_effect: null,
              attributes: [{ name: 'consumable', url: '' }],
              category: { name: 'other', url: '' },
              effect_entries: [],
              sprites: { default: null }
            });
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({ attributeName: 'consumable', categoryName: 'healing' }, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.search_criteria.attribute).toBe('consumable');
        expect(parsed.search_criteria.category).toBe('healing');
        expect(parsed.items[0].name).toBe('attribute-item');
      });
    });

    describe('when invalid attribute is provided', () => {
      it('returns error message', async () => {
        server.use(
          http.get('https://pokeapi.co/api/v2/item-attribute/invalid', () => {
            return HttpResponse.json(
              { detail: 'Not found.' },
              { status: 404 }
            );
          })
        );

        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: false });

        const actual = await tool.handler({ attributeName: 'invalid' }, mockContext);

        expect(actual).toContain('not found');
      });
    });

    describe('when no search criteria provided', () => {
      it('returns empty result set', async () => {
        const tool = PokemonConnectorConfig.tools.ADVANCED_ITEM_SEARCH as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        mockContext.getSetup = vi.fn().mockResolvedValue({ cacheResponses: true });

        const actual = await tool.handler({}, mockContext);
        const parsed = JSON.parse(actual);

        expect(parsed.result_count).toBe(0);
        expect(parsed.items).toEqual([]);
      });
    });
  });

  describe('configuration', () => {
    it('should be properly configured', () => {
      expect(PokemonConnectorConfig).toBeDefined();
      expect(PokemonConnectorConfig.name).toBe('Pokemon');
      expect(PokemonConnectorConfig.key).toBe('pokemon');
      expect(PokemonConnectorConfig.version).toBe('1.0.0');
    });

    it('should have no required credentials', () => {
      const credentialsSchema = PokemonConnectorConfig.credentials;
      expect(() => credentialsSchema.parse({})).not.toThrow();
    });

    it('should have optional setup configuration', () => {
      const setupSchema = PokemonConnectorConfig.setup;
      
      expect(() => setupSchema.parse({})).not.toThrow();
      
      const parsed = setupSchema.parse({ defaultLanguage: 'ja', cacheResponses: false });
      expect(parsed.defaultLanguage).toBe('ja');
      expect(parsed.cacheResponses).toBe(false);
    });

    it('should have an example prompt', () => {
      expect(PokemonConnectorConfig.examplePrompt).toBeDefined();
      expect(typeof PokemonConnectorConfig.examplePrompt).toBe('string');
      expect(PokemonConnectorConfig.examplePrompt?.length).toBeGreaterThan(0);
    });

    it('should have tools object with expected tools', () => {
      expect(typeof PokemonConnectorConfig.tools).toBe('object');
      expect(PokemonConnectorConfig.tools).toBeDefined();

      const expectedTools = [
        'GET_POKEMON',
        'SEARCH_POKEMON',
        'GET_TYPE_EFFECTIVENESS',
        'GET_EVOLUTION_CHAIN',
        'COMPARE_POKEMON',
        'GET_ABILITY',
        'GET_MOVE',
        'GET_ITEM',
        'BUILD_TEAM_ANALYSIS',
        'GET_NATURE',
        'FIND_POKEMON_LOCATIONS',
        'GET_GENERATION_POKEMON',
        'GET_BREEDING_INFO',
        'GET_BERRY',
        'GET_BERRY_FLAVOR',
        'EXPLORE_LOCATIONS',
        'GET_REGION_INFO',
        'GET_CHARACTERISTIC',
        'GET_GROWTH_RATE',
        'GET_ITEM_CATEGORY',
        'ADVANCED_ITEM_SEARCH'
      ];

      for (const toolName of expectedTools) {
        expect(PokemonConnectorConfig.tools[toolName]).toBeDefined();
      }
    });
  });
});