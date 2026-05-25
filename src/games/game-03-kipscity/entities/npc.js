/**
 * NPC factory.
 *
 * Spawns one autonomous Kip with reduced needs (vs. player), full personality,
 * intent slot, memory + relations buffers. The AI decision system + intent
 * execution system drive everything.
 */

import {
  C, FACING, DEFAULT_KIP_SPEED,
  createTransform, createMotion, createPath, createAvatarSprite,
  createAnimator, createTagNPC,
  createNeeds, createEmotion, createPersonality, createIntent,
  createMemory, createRelations,
} from '../components/types.js';
import { tileCenter } from '../utils/iso-math.js';

/**
 * Spawn an NPC.
 * @param {import('../ecs/world.js').World} world
 * @param {object} npcDef — entry from NPC_ROSTER
 * @returns {number} entity id
 */
export function createNPC(world, npcDef) {
  const center = tileCenter(npcDef.spawnTile.col, npcDef.spawnTile.row);

  // NPCs walk slightly slower than the player so the city has a relaxed pace
  const speed = DEFAULT_KIP_SPEED * 0.85;

  const id = world.createEntity();
  world.addComponent(id, C.Transform, createTransform(center.x, center.y, FACING.S));
  world.addComponent(id, C.Motion,    createMotion(speed));
  world.addComponent(id, C.Path,      createPath());
  world.addComponent(id, C.Sprite,    createAvatarSprite(npcDef.avatarId));
  world.addComponent(id, C.Animator,  createAnimator('idle', 7));
  world.addComponent(id, C.TagNPC,    createTagNPC());

  // Slightly de-randomized starting needs so different NPCs make different
  // first decisions (some hungry, some sleepy, some social) — natural variety
  const seed = hashString(npcDef.id);
  world.addComponent(id, C.Needs, createNeeds({
    hunger: 60 + (seed % 30),
    energy: 60 + ((seed >> 3) % 30),
    social: 50 + ((seed >> 5) % 30),
    fun:    60 + ((seed >> 7) % 30),
  }));
  world.addComponent(id, C.Emotion,     createEmotion());
  world.addComponent(id, C.Personality, createPersonality(npcDef.personality));
  world.addComponent(id, C.Intent,      createIntent());
  world.addComponent(id, C.Memory,      createMemory(32));
  world.addComponent(id, C.Relations,   createRelations());

  return id;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
