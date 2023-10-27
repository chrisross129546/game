import { getSeenEnities, movementTick, runPhysics } from "./Physics";
import { broadcast, emit } from "./Socket";
import { MAX_PLAYERS } from "./config";
import { PlayerController } from "./gameData/controllers/PlayerController";
import { Entity } from "./gameData/entities/Entity";
import { CBPacketIds } from "./packets/Packets";
import { Packet } from "./packets/writer";

export let Game: GameHandler;

export class GameHandler {
	players: PlayerController[] = new Array(MAX_PLAYERS);
	entities = new Map<number, Entity>();
	lastTick = Date.now();

	constructor() {
		Game = this;
		setInterval(() => this.tick(), 33);
	}

	playerLeave(id: number) {
		const player = this.players[id];
		if (player) {
			player.entity.active = false;
		}
		delete this.players[id];
	}

	addEntity(entity: Entity) {
		this.entities.set(entity.id, entity);
	}

	clearSeen(entity: Entity) {
		for (const player of this.players) {
			if (!player || !player.hasSpawned || !player.seenEntities.has(entity))
				continue;
			player.seenEntities.delete(entity);
		}
	}

	tick() {
		const delta = Date.now() - this.lastTick;
		this.lastTick = Date.now();

		movementTick(delta);
		runPhysics(delta);

		const removePacket = new Packet(CBPacketIds.RemoveEntity);
		let needRemove = false;

		for (const entity of this.entities.values()) {
			if (entity.active && entity.alive) {
				entity.tick(delta);
			} else if (!entity.active) {
				needRemove = true;
				removePacket.writeUint16(entity.id);
				this.entities.delete(entity.id);
				this.clearSeen(entity);
			} else if (entity.wasAlive) {
				needRemove = true;
				entity.wasAlive = false;
				removePacket.writeUint16(entity.id);
				this.clearSeen(entity);
			}
		}
		if (needRemove) {
			broadcast("broadcast", removePacket.buffer);
		}

		for (const player of this.players) {
			if (!player || !player.hasSpawned || !player.entity.active) continue;
			const canSee = getSeenEnities(player.entity);
			const updatePacket = new Packet(CBPacketIds.Update);
			const seePacket = new Packet(CBPacketIds.MeetEntities);
			let hasSeen = false;
			canSee.forEach((ent) => {
				if (!player.seenEntities.has(ent)) {
					player.seenEntities.add(ent);
					seePacket.appendBuffer(ent.meetBuffer);
					hasSeen = true;
				}
				updatePacket.appendBuffer(ent.updateBuffer);
			});
			if (hasSeen) {
				emit(player.id, seePacket.buffer);
			}
			emit(player.id, updatePacket.buffer);
		}
	}
}
