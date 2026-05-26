/**
 * Object Factory — places interactable objects in the world as ECS entities.
 *
 * Big City spawn: populates each district with district-appropriate
 * buildings, trees, and street furniture, distributed evenly so the world
 * feels alive — not clumped at the plaza.
 */

import {
  C, FACING,
  createTransform, createObjectSprite, createAnimator,
  createTagObject, createInteractable,
} from '../components/types.js';
import { tileCenter } from '../utils/iso-math.js';
import { OBJECT_AFFORDANCES, OBJECT_CATALOG } from '../interactions/affordance-catalog.js';
import { DISTRICTS } from '../world/world-builder.js';

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
 * Big City starter spawn — populates ~80 objects across 4 districts.
 * Layout is hand-tuned to look like a real neighborhood, not a grid.
 */
export const STARTER_OBJECTS = Object.freeze([
  // ===========================================================
  // ASIAN QUARTER (NW: cols 1-60, rows 1-60)
  // ===========================================================
  // Asian houses lining a street
  { kind: 'house_asian', tile: { col: 8,  row: 8  } },
  { kind: 'house_asian', tile: { col: 18, row: 8  } },
  { kind: 'house_asian', tile: { col: 30, row: 8  } },
  { kind: 'house_asian', tile: { col: 42, row: 8  } },
  { kind: 'house_asian', tile: { col: 54, row: 8  } },
  // Second row of houses
  { kind: 'house_asian', tile: { col: 12, row: 22 } },
  { kind: 'house_asian', tile: { col: 26, row: 22 } },
  { kind: 'house_asian', tile: { col: 48, row: 22 } },
  // Warungs scattered
  { kind: 'warung',      tile: { col: 22, row: 14 } },
  { kind: 'warung',      tile: { col: 38, row: 30 } },
  { kind: 'warung',      tile: { col: 8,  row: 36 } },
  // Motorcycles parked near houses
  { kind: 'motorcycle',  tile: { col: 20, row: 12 } },
  { kind: 'motorcycle',  tile: { col: 32, row: 12 } },
  { kind: 'motorcycle',  tile: { col: 44, row: 12 } },
  { kind: 'motorcycle',  tile: { col: 50, row: 26 } },
  // Cherry trees (Asian aesthetic)
  { kind: 'tree_cherry', tile: { col: 14, row: 36 } },
  { kind: 'tree_cherry', tile: { col: 28, row: 40 } },
  { kind: 'tree_cherry', tile: { col: 44, row: 38 } },
  { kind: 'tree_cherry', tile: { col: 56, row: 32 } },
  // Lampposts along secondary street
  { kind: 'lamppost',    tile: { col: 16, row: 30 } },
  { kind: 'lamppost',    tile: { col: 36, row: 30 } },
  { kind: 'lamppost',    tile: { col: 56, row: 30 } },
  // Mailbox at street corner
  { kind: 'mailbox',     tile: { col: 4,  row: 50 } },

  // ===========================================================
  // URBAN MODERN DISTRICT (NE: cols 68-127, rows 1-60)
  // ===========================================================
  // Tall apartments
  { kind: 'apartment_3story', tile: { col: 76,  row: 10 } },
  { kind: 'apartment_3story', tile: { col: 92,  row: 10 } },
  { kind: 'apartment_3story', tile: { col: 108, row: 10 } },
  { kind: 'apartment_3story', tile: { col: 122, row: 12 } },
  // Modern shops along the central road
  { kind: 'shop_modern', tile: { col: 78,  row: 28 } },
  { kind: 'shop_modern', tile: { col: 94,  row: 28 } },
  { kind: 'shop_modern', tile: { col: 110, row: 28 } },
  // Cafes
  { kind: 'cafe',        tile: { col: 86,  row: 42 } },
  { kind: 'cafe',        tile: { col: 102, row: 42 } },
  { kind: 'cafe',        tile: { col: 118, row: 42 } },
  // Sedans parked on streets
  { kind: 'car_sedan',   tile: { col: 80,  row: 38 } },
  { kind: 'car_sedan',   tile: { col: 96,  row: 38 } },
  { kind: 'car_sedan',   tile: { col: 112, row: 38 } },
  // Compact cars
  { kind: 'car_compact', tile: { col: 88,  row: 56 } },
  { kind: 'car_compact', tile: { col: 104, row: 56 } },
  // Bus stops on main road
  { kind: 'bus_stop',    tile: { col: 72,  row: 56 } },
  { kind: 'bus_stop',    tile: { col: 122, row: 56 } },
  // Lampposts everywhere
  { kind: 'lamppost',    tile: { col: 72,  row: 22 } },
  { kind: 'lamppost',    tile: { col: 100, row: 22 } },
  { kind: 'lamppost',    tile: { col: 124, row: 22 } },
  { kind: 'lamppost',    tile: { col: 86,  row: 50 } },
  { kind: 'lamppost',    tile: { col: 116, row: 50 } },
  // Traffic lights at intersections
  { kind: 'traffic_pole', tile: { col: 70,  row: 70 } },
  { kind: 'traffic_pole', tile: { col: 124, row: 70 } },

  // ===========================================================
  // COZY SUBURBS (SW: cols 1-60, rows 68-127)
  // ===========================================================
  // Single-family homes in neat rows
  { kind: 'house_cozy',   tile: { col: 8,  row: 76  } },
  { kind: 'house_cozy',   tile: { col: 22, row: 76  } },
  { kind: 'house_cozy',   tile: { col: 36, row: 76  } },
  { kind: 'house_cozy',   tile: { col: 50, row: 76  } },
  // Second row — 2-story houses
  { kind: 'house_2story', tile: { col: 14, row: 96  } },
  { kind: 'house_2story', tile: { col: 32, row: 96  } },
  { kind: 'house_2story', tile: { col: 50, row: 96  } },
  // Third row — more cozy
  { kind: 'house_cozy',   tile: { col: 8,  row: 116 } },
  { kind: 'house_cozy',   tile: { col: 24, row: 116 } },
  { kind: 'house_cozy',   tile: { col: 40, row: 116 } },
  { kind: 'house_cozy',   tile: { col: 54, row: 116 } },
  // Trees along the streets
  { kind: 'tree_oak',     tile: { col: 4,  row: 84  } },
  { kind: 'tree_oak',     tile: { col: 18, row: 84  } },
  { kind: 'tree_oak',     tile: { col: 32, row: 84  } },
  { kind: 'tree_oak',     tile: { col: 46, row: 84  } },
  { kind: 'tree_pine',    tile: { col: 6,  row: 104 } },
  { kind: 'tree_pine',    tile: { col: 26, row: 104 } },
  { kind: 'tree_pine',    tile: { col: 44, row: 104 } },
  // Lampposts
  { kind: 'lamppost',     tile: { col: 12, row: 90  } },
  { kind: 'lamppost',     tile: { col: 30, row: 90  } },
  { kind: 'lamppost',     tile: { col: 48, row: 90  } },
  { kind: 'lamppost',     tile: { col: 12, row: 110 } },
  { kind: 'lamppost',     tile: { col: 36, row: 110 } },
  // Family sedans in driveways
  { kind: 'car_sedan',    tile: { col: 12, row: 78  } },
  { kind: 'car_sedan',    tile: { col: 26, row: 78  } },
  { kind: 'car_sedan',    tile: { col: 44, row: 78  } },
  { kind: 'car_compact',  tile: { col: 18, row: 98  } },
  { kind: 'car_compact',  tile: { col: 36, row: 98  } },
  // Mailboxes by each home
  { kind: 'mailbox',      tile: { col: 4,  row: 76  } },
  { kind: 'mailbox',      tile: { col: 4,  row: 96  } },
  { kind: 'mailbox',      tile: { col: 4,  row: 116 } },

  // ===========================================================
  // MARKET DISTRICT (SE: cols 68-127, rows 68-127)
  // ===========================================================
  // Central market area with food carts + benches + fountain
  { kind: 'fountain',    tile: { col: 100, row: 84  } },
  { kind: 'food_cart',   tile: { col: 80,  row: 78  } },
  { kind: 'food_cart',   tile: { col: 90,  row: 78  } },
  { kind: 'food_cart',   tile: { col: 110, row: 78  } },
  { kind: 'food_cart',   tile: { col: 120, row: 78  } },
  // Benches near fountain
  { kind: 'bench',       tile: { col: 92,  row: 88  } },
  { kind: 'bench',       tile: { col: 108, row: 88  } },
  { kind: 'bench',       tile: { col: 96,  row: 80  } },
  { kind: 'bench',       tile: { col: 104, row: 80  } },
  // Beach area (SE corner near pond) — palm trees!
  { kind: 'tree_palm',   tile: { col: 88,  row: 70  } },
  { kind: 'tree_palm',   tile: { col: 98,  row: 68  } },
  { kind: 'tree_palm',   tile: { col: 90,  row: 76  } },
  // More cafes
  { kind: 'cafe',        tile: { col: 76,  row: 100 } },
  { kind: 'cafe',        tile: { col: 116, row: 100 } },
  // Trees scattered
  { kind: 'tree_oak',    tile: { col: 84,  row: 110 } },
  { kind: 'tree_oak',    tile: { col: 100, row: 116 } },
  { kind: 'tree_oak',    tile: { col: 120, row: 110 } },
  // Lampposts
  { kind: 'lamppost',    tile: { col: 76,  row: 90  } },
  { kind: 'lamppost',    tile: { col: 100, row: 100 } },
  { kind: 'lamppost',    tile: { col: 124, row: 90  } },
  // Bus stop near market entrance
  { kind: 'bus_stop',    tile: { col: 72,  row: 72  } },

  // ===========================================================
  // CENTRAL PLAZA (around the main intersection)
  // ===========================================================
  { kind: 'lamppost',    tile: { col: 56,  row: 56  } },
  { kind: 'lamppost',    tile: { col: 72,  row: 56  } },
  { kind: 'lamppost',    tile: { col: 56,  row: 72  } },
  { kind: 'lamppost',    tile: { col: 72,  row: 72  } },
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
