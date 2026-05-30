import { describe, expect, it } from 'vitest';
import { pokemonThemeCatalog, pokemonThemeCatalogByNumber } from './pokemon';

describe('pokemon theme catalog', () => {
  it('exposes Pokedex numbers on Pokemon theme definitions', () => {
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'bulbasaur')?.pokedexNumber).toBe(1);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'pikachu')?.pokedexNumber).toBe(79);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'abra')?.pokedexNumber).toBe(213);
    expect(pokemonThemeCatalog.find((pokemon) => pokemon.key === 'mew')?.pokedexNumber).toBe(300);
  });

  it('keeps local special-form keys aligned with Xzonn Pokemon rows', () => {
    expect(Object.fromEntries(pokemonThemeCatalog.map((pokemon) => [pokemon.key, pokemon]))).toMatchObject({
      'chef-dente': { name: '藏饱栗鼠（厨师）', englishName: 'Chef Dente', pokedexNumber: 192 },
      'dj-rotom': { name: '洛托姆（立体音响洛托姆）', englishName: 'DJ Rotom', pokedexNumber: 182 },
      'gastrodon-east-sea': { name: '海兔兽（东海）', englishName: 'Gastrodon (East Sea)', pokedexNumber: 60 },
      'gastrodon-west-sea': { name: '海兔兽（西海）', englishName: 'Gastrodon (West Sea)', pokedexNumber: 60 },
      mosslax: { name: '卡比兽（萌苔）', englishName: 'Mosslax', pokedexNumber: 108 },
      peakychu: { name: '浅浅丘', englishName: 'Peakychu', pokedexNumber: 79 },
      'prof-tangrowth': { name: '巨蔓藤（博士）', englishName: 'Prof. Tangrowth', pokedexNumber: 41 },
      'shellos-east-sea': { name: '无壳海兔（东海）', englishName: 'Shellos (East Sea)', pokedexNumber: 59 },
      'shellos-west-sea': { name: '无壳海兔（西海）', englishName: 'Shellos (West Sea)', pokedexNumber: 59 },
      smearguru: { name: '图图犬（彩绘匠）', englishName: 'Smearguru', pokedexNumber: 119 },
      'tatsugiri-curly-form': { name: '米立龙（上弓姿势）', englishName: 'Tatsugiri (Curly Form)', pokedexNumber: 145 },
      'tatsugiri-droopy-form': { name: '米立龙（下垂姿势）', englishName: 'Tatsugiri (Droopy Form)', pokedexNumber: 145 },
      'tatsugiri-stretchy-form': { name: '米立龙（平挺姿势）', englishName: 'Tatsugiri (Stretchy Form)', pokedexNumber: 145 },
      'toxtricity-amped-form': { name: '颤弦蝾螈（高调的样子）', englishName: 'Toxtricity (Amped Form)', pokedexNumber: 197 },
      'toxtricity-low-key-form': { name: '颤弦蝾螈（低调的样子）', englishName: 'Toxtricity (Low Key Form)', pokedexNumber: 197 },
    });
  });

  it('sorts Pokemon themes by Pokedex number', () => {
    expect(pokemonThemeCatalogByNumber.slice(0, 9).map((pokemon) => pokemon.key)).toEqual([
      'bulbasaur',
      'ivysaur',
      'venusaur',
      'charmander',
      'charmeleon',
      'charizard',
      'squirtle',
      'wartortle',
      'blastoise',
    ]);
    expect(pokemonThemeCatalogByNumber.at(-1)?.key).toBe('mew');
  });
});
