import { Game } from "../../GameHandler";
import { broadcast, emit, kick } from "../../Socket";
import {
	CHAT_COOLDOWN,
	MAX_CHAT_LEN,
	MAX_NAME_LEN,
	SKIN_COLORS,
} from "../../config";
import { CBPacketIds } from "../../packets/Packets";
import { CloseCodes } from "../../packets/SocketStatuses";
import { readAngle, readText, readUint8 } from "../../packets/reader";
import { StaticPacket } from "../../packets/staticWriter";
import { Packet } from "../../packets/writer";
import { getSpawnCoord } from "../../util";
import { Entity } from "../entities/Entity";
import { PlayerEntity } from "../entities/PlayerEntity";
import { BaseController } from "./BaseController";

const SpawnPacket = new StaticPacket(17)
	.writeUint8(CBPacketIds.Spawn, 0)
	.writeFloat32(0, 1)
	.writeFloat32(0, 5)
	.writeUint16(0, 9)
	.writeUint16(0, 11)
	.writeUint16(0, 13)
	.writeUint16(0, 15);

const ResourcesPacket = new StaticPacket(9)
	.writeUint8(CBPacketIds.UpdateResources, 0)
	.writeUint16(0, 1)
	.writeUint16(0, 3)
	.writeUint16(0, 5)
	.writeUint16(0, 7);

export class PlayerController extends BaseController {
	entity: PlayerEntity;
	id: number;
	lastChat = 0;
	hasSpawned = false;
	seenEntities: Set<Entity> = new Set();
	constructor(id: number) {
		const entity = new PlayerEntity("Unknown");
		super(entity);
		this.id = id;
		this.entity = entity;
		Game.addEntity(this.entity);
		Game.players[this.id] = this;
	}

	emit(packet: ArrayBuffer) {
		emit(this.id, packet);
	}

	onSpawn() {
		const name = readText();
		if (name.length > MAX_NAME_LEN) {
			kick(this.id, CloseCodes.BadRequest);
			return;
		}
		const entity = this.entity;
		entity.name = name;
		const skin = readUint8();
		entity.color = skin < SKIN_COLORS.length ? skin : 0;
		const xLoc = getSpawnCoord();
		const yLoc = getSpawnCoord();
		entity.spawn(xLoc, yLoc);
	}

	onChat() {
		if (!this.entity.alive || Date.now() - this.lastChat < CHAT_COOLDOWN)
			return;
		const message = readText();
		if (message.length > MAX_CHAT_LEN) return;
		const chat = new Packet(CBPacketIds.Chat);
		chat.writeUint16(this.eid);
		chat.writeText(this.entity.name);
		chat.writeText(message);
		if (message.startsWith("/tp ")) {
			const [_, xT, yT] = message.split(" ");
			let x = parseInt(xT);
			let y = parseInt(yT);
			if (isNaN(x)) {
				x = 0;
			}
			if (isNaN(y)) {
				y = 0;
			}
			this.entity.x = x;
			this.entity.y = y;
		}
		broadcast("broadcast", chat.buffer);
	}

	onInput() {
		const bitFlags = readUint8();
		if (bitFlags & 0b1) {
			this.entity.rot = readAngle();
		}
		if (bitFlags & 0b10) {
			const moveDir = readAngle();
			this.entity.xDelta = Math.cos(moveDir);
			this.entity.yDelta = Math.sin(moveDir);
		}
		if (bitFlags & 0b100) {
			this.entity.xDelta = 0;
			this.entity.yDelta = 0;
		}
		if (bitFlags & 0b1000) {
			this.entity.useSecondary = true;
			this.entity.keepSecondary = true;
		} else {
			this.entity.keepSecondary = false;
		}

		if (bitFlags & 0b10000) {
			this.entity.usePrimary = true;
			this.entity.keepPrimary = true;
		} else {
			this.entity.keepPrimary = false;
		}
	}

	onEquip() {
		if (!this.entity.alive) return;
		const bitFlags = readUint8();
		if (bitFlags & 0b1) {
			const id = readUint8();
			const item = this.entity.items.find((item) => item.id === id);
			if (item !== undefined && id !== 255) {
				this.entity.held = item;
			}
		}
		if (bitFlags & 0b10) {
			this.entity.hat = readUint8();
		}
		if (bitFlags & 0b100) {
			this.entity.tail = readUint8();
		}
		this.entity.updateGear();
	}

	CUpdateResources() {
		ResourcesPacket.writeUint16(this.entity.wood, 1)
			.writeUint16(this.entity.stone, 3)
			.writeUint16(this.entity.food, 5)
			.writeUint16(this.entity.gold, 7);
		this.emit(ResourcesPacket.ab);
	}
	CSpawn() {
		SpawnPacket.writeFloat32(this.entity.x, 1)
			.writeFloat32(this.entity.y, 5)
			.writeUint16(this.entity.wood, 9)
			.writeUint16(this.entity.stone, 11)
			.writeUint16(this.entity.food, 13)
			.writeUint16(this.entity.gold, 15);
		this.emit(SpawnPacket.ab);

	this.hasSpawned = true;
	}
}
