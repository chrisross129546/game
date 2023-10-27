import { Game, GameHandler } from "./GameHandler";
import { MAP_SIZE, MAX_PAYLOAD_LEN, MAX_PLAYERS, PORT } from "./config";
import { PlayerController } from "./gameData/controllers/PlayerController";
import { SBPacketIds } from "./packets/Packets";
import { CBPacketIds } from "./packets/Packets";
import { CloseCodes } from "./packets/SocketStatuses";
import { setReadBuffer } from "./packets/reader";
import { StaticPacket } from "./packets/staticWriter";

import { ServerWebSocket } from "bun";

// Pong
const PongPacket = new StaticPacket(2)
	.writeUint8(CBPacketIds.Pong, 0)
	.writeUint8(0, 1); // number of players

// Init
const InitPacket = new StaticPacket(15)
	.writeUint8(CBPacketIds.Init, 0)
	.writeUint8(0, 1)
	.writeUint16(MAP_SIZE, 2)
	.writeUint8(0, 4)
	.writeUint16(0, 5)
	.writeFloat64(Date.now(), 7);

const uniqueIds = new Set();
const sockets = new Array<ServerWebSocket<{ id: number }>>(MAX_PLAYERS);

let connectedSockets = 0;

const getSocketId = (): number => {
	let id = 1;
	while (uniqueIds.has(id)) {
		id++;
	}
	return id;
};

const server = Bun.serve<{ id: number }>({
	port: PORT,
	fetch(req, server) {
		const url = new URL(req.url);
		if (url.pathname === "/socket") {
			const success = server.upgrade(req, { data: { id: 0 } });
			return success
				? undefined
				: new Response("WebSocket upgrade error", { status: 400 });
		}

		return new Response("Hello world");
	},
	websocket: {
		maxPayloadLength: MAX_PAYLOAD_LEN,
		//handle shit better
		open(ws) {
			connectedSockets++;
			PongPacket.u8a[1] = connectedSockets;
			InitPacket.u8a[1] = connectedSockets;
			const id = getSocketId();
			if (id >= MAX_PLAYERS) {
				ws.close(CloseCodes.ServerFull);
				return;
			}
			ws.binaryType = "arraybuffer";
			ws.subscribe("broadcast");
			ws.data.id = id;
			uniqueIds.add(id);
			const player = new PlayerController(id);
			sockets[id] = ws;
			InitPacket.u8a[4] = id;
			InitPacket.writeUint16(player.eid, 5);
			ws.sendBinary(InitPacket.ab);
		},
		message(ws, message) {
			if (typeof message === "string") {
				ws.close(CloseCodes.BadRequest);
				return;
			}
			try {
				// @ts-ignore
				const packetId = setReadBuffer(message);
				const player = Game.players[ws.data.id];
				// TODO: move this to a diff file
				switch (packetId) {
					case SBPacketIds.Ping:
						ws.sendBinary(PongPacket.ab);
						break;
					case SBPacketIds.Spawn:
						player.onSpawn();
						break;
					case SBPacketIds.Input:
						player.onInput();
						break;
					case SBPacketIds.Chat:
						player.onChat();
						break;
					case SBPacketIds.Equip:
						player.onEquip();
						break;
					default:
						ws.close(CloseCodes.BadRequest);
				}
			} catch (error) {
				ws.close(CloseCodes.MessageReadFail);
			}
		},
		close(ws) {
			connectedSockets--;
			PongPacket.u8a[1] = connectedSockets;
			if (ws.data.id > 0) {
				delete sockets[ws.data.id];
				uniqueIds.delete(ws.data.id);
				Game.playerLeave(ws.data.id);
			}
		},
	},
});

export const broadcast = (topic: string, message: ArrayBuffer) => {
	server.publish(topic, message);
};

export const emit = (id: number, message: ArrayBuffer) => {
	const socket = sockets[id];
	if (socket && socket.readyState === 1) {
		socket.sendBinary(message);
	}
};

export const kick = (id: number, reason: CloseCodes) => {
	const socket = sockets[id];
	if (socket && socket.readyState === 1) {
		socket.close(reason);
	}
};

console.log(`Listening on ${server.hostname}:${server.port}`);
