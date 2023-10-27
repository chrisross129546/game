import { VELOCITY_MULT } from "../../config";
import { StaticPacket, getEncodedLength } from "../../packets/staticWriter";
import { EntityTypes } from "./EntityTypes";
const entityIds = new Set<number>();

const kbMult = 100 * VELOCITY_MULT;

const createId = () => {
	let id = 0;
	do {
		id = (Math.random() * 0xffff) | 0;
	} while (entityIds.has(id));
	entityIds.add(id);
	return id;
};

export class Entity {
	//@ts-ignore
	updatePacket: StaticPacket;
	//@ts-ignore
	meetPacket: StaticPacket;
	id = createId();
	active = true;
	alive = false;
	wasAlive = false;
	maxHP = 100;
	hp = this.maxHP;
	dmgMult = 1;
	x = 0;
	y = 0;
	xVel = 0;
	yVel = 0;
	speed = 1;
	xDelta = 0;
	yDelta = 0;
	size = 35;
	rot = 0;
	static = false;
	friction = 0.75;
	type = EntityTypes.BaseEntity;
	name: string;

	canBeSeen(entity: Entity): boolean {
		return true;
	}

	constructor(name = "Unknown") {
		this.name = name;
		this.initMeet();
		this.initUpdate();
	}

	get updateBuffer() {
		return this.updatePacket.ab;
	}

	get meetBuffer() {
		return this.meetPacket.ab;
	}

	tick(delta: number) {
		this.serialize();
	}

	initMeet() {
		// id, type, size, maxHP, nameLen, name
		this.meetPacket = new StaticPacket(
			2 + 1 + 1 + 4 + 2 + getEncodedLength(this.name),
		);
		this.meetPacket.writeUint16(this.id, 0);
		this.meetPacket.writeUint8(this.type, 2);
		this.meetPacket.writeUint8(this.size, 3);
		this.meetPacket.writeFloat32(this.maxHP, 4);
		this.meetPacket.writeText(this.name, 8);
	}

	initUpdate() {
		// id, type, x, y, rot, hp
		this.updatePacket = new StaticPacket(2 + 1 + 4 + 4 + 1 + 4);
		this.updatePacket.writeUint16(this.id, 0);
		this.updatePacket.writeUint8(this.type, 2);
		this.updatePacket.writeFloat32(this.x, 3);
		this.updatePacket.writeFloat32(this.y, 7);
		this.updatePacket.writeAngle(this.rot, 11);
		this.updatePacket.writeFloat32(this.hp, 12);
	}
	serialize() {
		this.updatePacket.writeFloat32(this.x, 3);
		this.updatePacket.writeFloat32(this.y, 7);
		this.updatePacket.writeAngle(this.rot, 11);
	}

	spawn(x = 0, y = 0) {
		this.xVel = 0;
		this.yVel = 0;
		this.xDelta = 0;
		this.yDelta = 0;
		this.x = x;
		this.y = y;
		this.hp = this.maxHP;
		this.alive = true;
		this.wasAlive = true;
	}

	applyKnockBack(dir: number, velocity: number) {
		this.xVel += Math.cos(dir) * velocity * kbMult;
		this.yVel += Math.sin(dir) * velocity * kbMult;
	}

	damage(amount: number, source: Entity) {
		this.hp -= amount * this.dmgMult;
		if (this.hp <= 0) {
			this.die(source);
		} else if (this.hp > this.maxHP) {
			this.hp = this.maxHP;
		}
		this.updatePacket.writeFloat32(this.hp, 12);
	}

	collide(entity: Entity, vel: number, dir: number, dist: number) {}

	die(killer: Entity) {
		this.alive = false;
	}

	delete() {
		entityIds.delete(this.id);
	}
}
