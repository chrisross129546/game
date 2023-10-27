import { StaticPacket, getEncodedLength } from "../../packets/staticWriter";
import { Apple } from "../items/Apple";
import { ToolHammer } from "../items/ToolHammer";
import { ComplexEntity } from "./ComplexEntity";
import { Entity } from "./Entity";
import { EntityTypes } from "./EntityTypes";

export class PlayerEntity extends ComplexEntity {
	static items = [ToolHammer, Apple];
	type = EntityTypes.Player;
	alive = false;
	color = 0;
	hat = 0;
	tail = 0;

	spawn(x: number, y: number) {
		super.spawn(x, y);
		this.initMeet();
		this.initUpdate();
	}

	initMeet(): void {
		// id, type, size, color, maxHP, nameLen, name
		this.meetPacket = new StaticPacket(
			2 + 1 + 1 + 1 + 4 + 2 + getEncodedLength(this.name),
		);
		this.meetPacket.writeUint16(this.id, 0);
		this.meetPacket.writeUint8(this.type, 2);
		this.meetPacket.writeUint8(this.size, 3);
		this.meetPacket.writeUint8(this.color, 4);
		this.meetPacket.writeFloat32(this.maxHP, 5);
		this.meetPacket.writeText(this.name, 9);
	}

	initUpdate() {
		// id type x y rot hp held hat tail
		this.updatePacket = new StaticPacket(2 + 1 + 4 + 4 + 1 + 4 + 1 + 1 + 1);
		this.updatePacket.writeUint16(this.id, 0);
		this.updatePacket.writeUint8(this.type, 2);
		this.updatePacket.writeFloat32(this.x, 3);
		this.updatePacket.writeFloat32(this.y, 7);
		this.updatePacket.writeAngle(this.rot, 11);
		this.updatePacket.writeFloat32(this.hp, 12);
		this.updatePacket.writeUint8(this.held?.id, 16);
		this.updatePacket.writeUint8(this.hat, 17);
		this.updatePacket.writeUint8(this.tail, 18);
	}

	updateGear() {
		this.updatePacket.writeUint8(this.held.id, 16);
		this.updatePacket.writeUint8(this.hat, 17);
		this.updatePacket.writeUint8(this.tail, 18);
	}

	serialize() {
		this.updatePacket.writeFloat32(this.x, 3);
		this.updatePacket.writeFloat32(this.y, 7);
		this.updatePacket.writeAngle(this.rot, 11);
	}

	collide(entity: Entity, _vel: number, dir: number, _dist: number) {
		/*if (this.usePrimary && this.held.id === 1) {
			entity.applyKnockBack(dir, 2);
			entity.damage(5, this);
		}*/
	}
}
