/**
 * Player factory.
 *
 * Creates the player Kip with all required components and returns its
 * entity id. Caller is responsible for setting up input wiring (see
 * systems/input-system.js).
 */

import {
  C, FACING, DEFAULT_KIP_SPEED,
  createTransform, createMotion, createPath, createAvatarSprite,
  createAnimator, createTagPlayer,
  createNeeds, createEmotion, createIntent,
} from '../components/types.js';
import { tileCenter, screenToTile } from '../utils/iso-math.js';

/**
 * @param {import('../ecs/world.js').World} world
 * @param {{col:number, row:number}} spawnTile
 * @param {{ avatarId?:string, speed?:number, facing?:string }} [opts]
 * @returns {number} entity id
 */
export function createPlayer(world, spawnTile, opts = {}) {
  const avatarId = opts.avatarId || 'player';
  const speed    = opts.speed    || DEFAULT_KIP_SPEED;
  const facing   = opts.facing   || FACING.S;

  const center = tileCenter(spawnTile.col, spawnTile.row);

  const id = world.createEntity();
  world.addComponent(id, C.Transform,  createTransform(center.x, center.y, facing));
  world.addComponent(id, C.Motion,     createMotion(speed));
  world.addComponent(id, C.Path,       createPath());
  world.addComponent(id, C.Sprite,     createAvatarSprite(avatarId));
  world.addComponent(id, C.Animator,   createAnimator('idle', 8));
  world.addComponent(id, C.TagPlayer,  createTagPlayer());

  // Batch 3d additions: needs + emotion
  world.addComponent(id, C.Needs,      createNeeds());
  world.addComponent(id, C.Emotion,    createEmotion());

  // Batch 3f: player can also have an Intent (when interacting with objects)
  world.addComponent(id, C.Intent,     createIntent());

  return id;
}

/**
 * Read an entity's current tile (col, row) by inverting iso-math from its
 * world-space center position.
 */
export function entityTile(world, entityId) {
  const t = world.getComponent(entityId, C.Transform);
  if (!t) return null;
  const tile = screenToTile(t.x, t.y - 16); // TILE.HH = 16
  return { col: Math.round(tile.col), row: Math.round(tile.row) };
}
