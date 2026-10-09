import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/BrewMyCoffee.tsx',import.meta.url),'utf8');

test('Brew My Coffee starts from persistent inventory',()=>{
  assert.match(source,/from\('user_bean_inventory'\)/);
  assert.match(source,/remaining_weight_grams!==0/);
  assert.doesNotMatch(source,/\.neq\('remaining_weight_grams',0\)/);
});
test('Brew My Coffee preserves the saved preferred recipe',()=>{
  assert.match(source,/selected\.preferred_recipe_id/);
  assert.match(source,/recipeId:selected\.preferred_recipe_id/);
});
