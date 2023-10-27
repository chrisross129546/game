import * as read from './read.js';
import createReader, { Reader } from './read.js';
import * as write from './write.js';
import createWriter, { Writer } from './write.js';

export const enum ServerBoundPacketIdentifier {
    Ping = 0x00,
    Spawn = 0x01,
    Input = 0x02,
    Chat = 0x03,
    Equip = 0x04
}

export const enum ClientBoundPacketIdentifier {
    Pong = 0x00,
    RemoveEntities = 0x01,
    InitialiseClient = 0x02,
    ClientSpawn = 0x03,
    MeetEntities = 0x04,
    UpdateEntities = 0x05,
    EntityChatMessage = 0x06,
    UpdateResources = 0x07
}

export const enum InputPacketFlag {
    PlayerDirection = 1 << 0,
    MovementDirection = 1 << 1,
    CancelMovement = 1 << 2,

    // todo: rename
    RightMouseButton = 1 << 3,
    LeftMouseButton = 1 << 4
}

export const enum EquipPacketFlag {
    Item = 1 << 0,
    Hat = 1 << 1,
    Accessory = 1 << 2
}

export const createPacketWriter = (identifier: number, size = 0): Writer => {
    const writer = createWriter(size + 1);
    write.u8(writer, identifier);
    return writer;
};

export const createPacketReader = (data: ArrayBuffer): [number, Reader] => {
    const reader = createReader(data);
    const identifier = read.u8(reader);
    return [identifier, reader];
};
