import { Game } from "./GameHandler";
import {
	BOUND_FORCE,
	COLLISION_STRENGTH,
	FRICTION,
	MAP_SIZE,
	MAX_SIZE,
	VELOCITY_MULT,
	VIEWPORT_HEIGHT,
	VIEWPORT_OVERSCAN,
	VIEWPORT_WIDTH,
} from "./config";
import { HALF_MAP } from "./consts";
import { QuadNode } from "./gameData/Quad";
import { ComplexEntity } from "./gameData/entities/ComplexEntity";
import { Entity } from "./gameData/entities/Entity";
import { BaseWeapon } from "./gameData/items/BaseWeapon";

const QuadTree = new QuadNode(
	-HALF_MAP - MAX_SIZE,
	-HALF_MAP - MAX_SIZE,
	(MAP_SIZE + MAX_SIZE) * 2,
	(MAP_SIZE + MAX_SIZE) * 2,
	0,
);

const getAngleDist = (angle1: number, angle2: number) => {
	const angle = Math.abs(angle2 - angle1) % (Math.PI * 2);
	return angle > Math.PI ? Math.PI * 2 - angle : angle;
};

const dynamicCollision = (entA: Entity, entB: Entity, delta: number) => {
	const dx = entB.x - entA.x;
	const dy = entB.y - entA.y;
	const dvx = entA.xVel - entB.xVel;
	const dvy = entA.yVel - entB.yVel;
	const size = entA.size + entB.size;
	if (
		(Math.sign(dx) === Math.sign(dvx) || Math.sign(dy) === Math.sign(dvy)) &&
		Math.max(Math.abs(dx), Math.abs(dy)) < size
	) {
		const dist = Math.hypot(dx, dy) - size;
		const dir = Math.atan2(entA.y - entB.y, entA.x - entB.x);
		if (dist <= 0) {
			const vel = Math.abs(dvx * Math.cos(dir) + dvy * Math.sin(dir));
			const diff = COLLISION_STRENGTH / ((1 + Math.hypot(dx, dy) / 2) * delta);
			entA.xVel += (entA.x - entB.x) / diff;
			entA.yVel += (entA.y - entB.y) / diff;
			entB.xVel -= (entA.x - entB.x) / diff;
			entB.yVel -= (entA.y - entB.y) / diff;
			entA.collide(entB, vel, dir - Math.PI, dist);
			entB.collide(entA, vel, dir, dist);
		}
	}
};

const staticCollision = (sta: Entity, dyn: Entity) => {
	const dx = sta.x - dyn.x;
	const dy = sta.y - dyn.y;
	const size = sta.size + dyn.size;
	if (
		(Math.sign(dyn.xVel) === Math.sign(dx) ||
			Math.sign(dyn.yVel) === Math.sign(dy)) &&
		Math.max(Math.abs(dx), Math.abs(dy)) < size
	) {
		const dist = Math.hypot(dx, dy) - size;
		if (dist <= 0) {
			const dir = Math.atan2(sta.y - dyn.y, sta.x - dyn.x);
			const vel = Math.abs(dyn.xVel * Math.cos(dir) + dyn.yVel * Math.sin(dir));
			dyn.x = sta.x + size * Math.cos(dir);
			dyn.y = sta.y + size * Math.sin(dir);
			dyn.xVel *= sta.friction;
			dyn.yVel *= sta.friction;
			sta.collide(dyn, vel, dir - Math.PI, dist);
			dyn.collide(sta, vel, dir, dist);
		}
	}
};

export const runAttack = (entity: ComplexEntity, weapon: typeof BaseWeapon) => {
	const size = weapon.range + entity.size;
	const attackSearch = (tree: QuadNode) => {
		if (tree.objects.length) {
			for (const ent of tree.objects) {
				if (!ent.active || !ent.alive || ent === entity) continue;
				const dx = ent.x - entity.x;
				const dy = ent.y - entity.y;
				const size = weapon.range + ent.size;
				if (Math.max(Math.abs(dx), Math.abs(dy)) < size) {
					const dist = Math.hypot(dx, dy) - size;
					const dir = Math.atan2(ent.y - entity.y, ent.x - entity.x);
					if (dist <= 0 && getAngleDist(dir, -entity.rot) <= weapon.angle) {
						weapon.hit(entity, ent, dir);
					}
				}
			}
		}
		tree.children.forEach((child) => {
			if (
				Math.abs(entity.x - child.x) <= size &&
				Math.abs(entity.y - child.y) <= size
			) {
				attackSearch(child);
			}
		});
	};
	attackSearch(QuadTree);
};

const collideSearch = (collisions: Entity[], tree: QuadNode, delta: number) => {
	if (tree.objects.length > 0) {
		tree.objects.forEach((entity, index) => {
			if (entity.active && entity.alive) {
				for (const ent of collisions) {
					if (ent.active && ent.alive && (!entity.static || !ent.static)) {
						if (!entity.active || !entity.alive) return;
						if (entity.static) {
							staticCollision(entity, ent);
						} else if (ent.static) {
							staticCollision(ent, entity);
						} else {
							dynamicCollision(entity, ent, delta);
						}
					}
				}
				for (let i = index + 1; i < tree.objects.length; i++) {
					const ent = tree.objects[i];
					if (ent.active && ent.alive && (!entity.static || !ent.static)) {
						if (!entity.active || !entity.alive) return;
						if (entity.static) {
							staticCollision(entity, ent);
						} else if (ent.static) {
							staticCollision(ent, entity);
						} else {
							dynamicCollision(entity, ent, delta);
						}
					}
				}
			}
		});
	}
	const collide = collisions.concat(tree.objects);
	tree.children.forEach((child) => {
		collideSearch(collide, child, delta);
	});
};

export const runPhysics = (delta: number) => {
	QuadTree.clear();
	for (const entity of Game.entities.values()) {
		if (entity.active && entity.alive) {
			QuadTree.insert(entity);
		}
	}

	collideSearch([], QuadTree, delta);
};

export const movementTick = (delta: number) => {
	const decel = FRICTION ** delta;
	const velMod = delta * VELOCITY_MULT;

	for (const entity of Game.entities.values()) {
		if (entity.active && entity.alive) {
			if (!entity.static) {
				entity.xVel += entity.xDelta * entity.speed * velMod;
				entity.yVel += entity.yDelta * entity.speed * velMod;

				if (Math.abs(entity.x) + entity.size > HALF_MAP) {
					entity.xVel -=
						Math.sign(entity.x) *
						BOUND_FORCE *
						(Math.abs(entity.x) + entity.size - HALF_MAP) *
						velMod;
				}
				if (Math.abs(entity.y) + entity.size > HALF_MAP) {
					entity.yVel -=
						Math.sign(entity.y) *
						BOUND_FORCE *
						(Math.abs(entity.y) + entity.size - HALF_MAP) *
						velMod;
				}

				entity.xVel *= decel;
				entity.yVel *= decel;

				entity.x += entity.xVel * delta;
				entity.y += entity.yVel * delta;

				// fallback just in case something gets too far away
				if (
					Math.max(Math.abs(entity.x), Math.abs(entity.y)) >
					HALF_MAP + MAX_SIZE
				) {
					entity.x = 0;
					entity.y = 0;
					entity.xVel = 0;
					entity.yVel = 0;
					entity.xDelta = 0;
					entity.yDelta = 0;
				}
			}
		}
	}
};

const VIEW_X = (VIEWPORT_WIDTH + VIEWPORT_OVERSCAN) / 2;
const VIEW_Y = (VIEWPORT_HEIGHT + VIEWPORT_OVERSCAN) / 2;

export const getSeenEnities = (entity: Entity) => {
	const canSee: Entity[] = [];
	const left = entity.x - VIEW_X;
	const top = entity.y + VIEW_Y;
	const right = entity.x + VIEW_X;
	const bottom = entity.y - VIEW_Y;
	const search = (tree: QuadNode) => {
		if (tree.objects.length !== 0) {
			tree.objects.forEach((ent) => {
				if (!ent.active || !ent.alive || !ent.canBeSeen(entity)) return;
				const dx = ent.x - entity.x;
				const dy = ent.y - entity.y;
				if (
					Math.abs(dx) + ent.size < VIEW_X &&
					Math.abs(dy) + ent.size < VIEW_Y
				) {
					canSee.push(ent);
				}
			});
		}
		tree.children.forEach((child) => {
			if (
				child.x < right &&
				child.x + child.width > left &&
				child.y + child.height > bottom &&
				child.y < top
			) {
				search(child);
			}
		});
	};
	search(QuadTree);
	return canSee;
};
