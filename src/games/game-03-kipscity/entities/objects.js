/**
 * Object Factory — places interactable objects in the world as ECS entities.
 *
 * Objects are entities so they participate in:
 *   - Spatial queries (nearby food, nearby bench)
 *   - Depth sort (Kip can be in front of or behind the bench)
 *   - The same render path as Kips (Sprite component, kind='object')
 *   - Interactable component for the action wheel & NPC AI
 *
 * For Batch 3f the objects are immutable once placed; Batch 3h's workshop
 * mode will reuse this factory for player-placed furniture.
 */

import {
  C, FACING,
  createTransform, createObjectSprite, createAnimator,
  createTagObject, createInteractable,
} from '../components/types.js';
import { tileCenter } from '../utils/iso-math.js';
import { OBJECT_AFFORDANCES, OBJECT_CATALOG } from '../interactions/affordance-catalog.js';

/**
 * Spawn one object at a tile.
 * @param {import('../ecs/world.js').World} world
 * @param {string} kind     object kind id (e.g. 'bed', 'fountain')
 * @param {{col:number, row:number}} tile
 * @returns {number} entity id
 */
export function createObject(world, kind, tile) {
  if (!OBJECT_CATALOG[kind]) {
    throw new Error(`Unknown object kind: ${kind}`);
  }
  const { x, y } = tileCenter(tile.col, tile.row);

  const id = world.createEntity();
  world.addComponent(id, C.Transform,    createTransform(x, y, FACING.S));
  world.addComponent(id, C.Sprite,       createObjectSprite(kind));
  world.addComponent(id, C.Animator,     createAnimator('idle', 1));
  world.addComponent(id, C.TagObject,    createTagObject());

  const interactable = createInteractable(kind, OBJECT_AFFORDANCES[kind] || []);
  interactable.col = tile.col;
  interactable.row = tile.row;
  world.addComponent(id, C.Interactable, interactable);

  return id;
}

/**
 * Default starter set of interactables for the demo map. Tile coords were
 * chosen by hand to cluster around the central plaza without overlapping
 * paths or water.
 */
export const STARTER_OBJECTS = Object.freeze([
  // Beds in a "house" north-east of plaza
  { kind: 'bed',       tile: { col: 22, row: 13 } },
  { kind: 'bed',       tile: { col: 24, row: 13 } },

  // Benches around the plaza
  { kind: 'bench',     tile: { col: 14, row: 18 } },
  { kind: 'bench',     tile: { col: 18, row: 18 } },

  // Central fountain (plaza-adjacent — on grass north of it)
  { kind: 'fountain',  tile: { col: 16, row: 13 } },

  // Food carts near south-east
  { kind: 'food_cart', tile: { col: 21, row: 18 } },
  { kind: 'food_cart', tile: { col: 13, row: 14 } },
]);

export function spawnStarterObjects(world) {
  const ids = [];
  for (const def of STARTER_OBJECTS) {
    try {
      ids.push(createObject(world, def.kind, def.tile));
    } catch (e) {
      console.warn('[objects] spawn failed', def, e);
    }
  }
  return ids;
}
