import { EntityType, Entity, PlayerEntity, VisibleEntity, VisiblePlayerEntity } from './entity.js';
import { ClientBoundPacketIdentifier, ServerBoundPacketIdentifier, InputPacketFlag, EquipPacketFlag, createPacketReader, createPacketWriter } from './packet.js';
import * as read from './read.js';
import * as write from './write.js';
import { Socket, SocketError, SocketErrorCode, openSocket, closeSocket, addSocketErrorCallback, getMessageStream, sendMessage } from './socket.js';
import CloseCode from './close.js';
import { SERVER_URL, CONNECTION_TIMEOUT, PING_RATE, LATENCY_SAMPLE_SIZE, TICK_RATE_SAMPLE_SIZE } from '../config.js';

// todo: split into multiple modules?
// todo: remove throwing errors in production (replace with client-side protocol-error)

export type ChatMessage = Readonly<{
    author: number,
    authorName: string,
    content: string
}>;

// todo: decide whether or not to remove this eventually
export type ServerData = Readonly<{
    mapSize: number,
    serverStartTime: number
}>;

export type ClientEnvironment = {
    readonly entities: Map<number, Entity>,
    chatMessageQueue: ChatMessage[],
    server?: ServerData,
    tick: number
};

// todo: some of this stuff could be removed on production build
export type ClientDiagnostics = {
    playerCount?: number,

    lastPing?: number,
    readonly latencies: number[],

    lastTick?: number,
    readonly tickRates: number[]
};

export type ClientInputState = {
    playerDirection: number,
    movementDirection: number | null,

    isLeftButtonDown: boolean,
    isRightButtonDown: boolean,

    // todo: this could be removed
    item: number,

    // todo: will this be needed?
    hat: number,
    accessory: number
};

export type ClientPlayerResourceCollection = Readonly<{
    food: number,
    wood: number,
    stone: number,
    gold: number
}>;

export type ClientPlayer = { resources: ClientPlayerResourceCollection };

export type Client = {
    readonly socket: Socket,
    readonly environment: ClientEnvironment,
    readonly diagnostics: ClientDiagnostics,
    readonly input: ClientInputState,
    readonly pingInterval: number,
    entityIdentifier?: number,
    player?: ClientPlayer
};

const resetInputState = (state: ClientInputState): ClientInputState => {
    // todo: update once this is implemented on the server

    // state.playerDirection = 0;
    state.movementDirection = null;
    state.isLeftButtonDown = false;
    state.isRightButtonDown = false;
    state.item = 0;
    state.hat = 0;
    state.accessory = 0;

    return state;
};

export const connectClient = async () => {
    const socket = await openSocket(SERVER_URL, CONNECTION_TIMEOUT);

    const environment: ClientEnvironment = { entities: new Map(), chatMessageQueue: [], tick: -1 };
    const diagnostics: ClientDiagnostics = { latencies: [], tickRates: [] };

    const input: ClientInputState = {
        playerDirection: 0,
        movementDirection: null,

        isLeftButtonDown: false,
        isRightButtonDown: false,

        item: 0,
        hat: 0,
        accessory: 0
    };

    const pingInterval = setInterval(() => {
        diagnostics.lastPing = performance.now();
        ping(socket);
    }, PING_RATE);

    const client: Client = { socket, environment, diagnostics, input, pingInterval };
    handleMessageStream(client, socket);

    return client;
};

export const disconnectClient = ({ socket }: Client) => closeSocket(socket);

export const enum ClientError {
    NetworkError,
    ServerFull,
    ProtocolError,
    BadRequest,
    UnknownClose
}

type PossibleSocketErrorCode = SocketErrorCode.NetworkError | SocketErrorCode.UnexpectedClose;
export const getClientError = (error: SocketError): ClientError => {
    switch (error.code as PossibleSocketErrorCode) {
        case SocketErrorCode.NetworkError: return ClientError.NetworkError;

        case SocketErrorCode.UnexpectedClose: {
            const { code } = error.event as CloseEvent;

            switch (code) {
                case CloseCode.ServerFull: return ClientError.ServerFull;
                case CloseCode.ProtocolError: return ClientError.ProtocolError;
                case CloseCode.BadRequest: return ClientError.BadRequest;
                default: return ClientError.UnknownClose;
            }
        }
    }
};

type ErrorCallback = (error: ClientError) => void;
export const addClientErrorCallback = (client: Client, callback: ErrorCallback) => (
    addSocketErrorCallback(client.socket, error => callback(getClientError(error)))
);

const handleMessageStream = async (client: Client, socket: Socket) => {
    for await (const message of getMessageStream(socket)) handleIncomingMessage(client, message);
    clearInterval(client.pingInterval);
};

const handleIncomingMessage = (client: Client, data: ArrayBuffer) => {
    const { environment, diagnostics, input } = client;
    const [identifier, reader] = createPacketReader(data);

    // todo: split into multiple functions?
    switch (identifier) {
        case ClientBoundPacketIdentifier.Pong: {
            if (diagnostics.lastPing !== undefined) {
                const { latencies } = diagnostics;
                const latency = performance.now() - diagnostics.lastPing;
                latencies.push(latency);
                if (latencies.length > LATENCY_SAMPLE_SIZE) latencies.shift();
            }

            diagnostics.playerCount = read.u8(reader);
            break;
        }

        case ClientBoundPacketIdentifier.RemoveEntities: {
            const { entities } = environment;

            while (!read.isAtEnd(reader)) {
                const identifier = read.u16(reader);
                entities.delete(identifier);
            }

            break;
        }

        case ClientBoundPacketIdentifier.InitialiseClient: {
            diagnostics.playerCount = read.u8(reader);
            const mapSize = read.u16(reader);

            // todo: implement once used in other packets
            /* const playerIdentifier = */ read.u8(reader);

            client.entityIdentifier = read.u16(reader);
            const serverStartTime = read.f64(reader);
            environment.server = { mapSize, serverStartTime };
            break;
        }

        case ClientBoundPacketIdentifier.ClientSpawn: {
            resetInputState(input);

            // todo: callback to update camera position to spawn coordinates (resolve to spawnClient promise)
            /* const x = */ read.f32(reader);
            /* const y = */ read.f32(reader);

            const wood = read.u16(reader);
            const stone = read.u16(reader);
            const food = read.u16(reader);
            const gold = read.u16(reader);

            // todo: should resources be on entity instead?
            client.player = { resources: { wood, stone, food, gold } };
            break;
        }

        case ClientBoundPacketIdentifier.MeetEntities: {
            if (client.entityIdentifier === undefined) throw Error('client entity identifier not set');
            const { entities } = environment;

            while (!read.isAtEnd(reader)) {
                const identifier = read.u16(reader);
                const type = read.u8(reader);
                if (identifier === client.entityIdentifier && type !== EntityType.Player) throw Error('client entity is not player');

                const radius = read.u8(reader);

                switch (type) {
                    case EntityType.BaseEntity: {
                        const healthCapacity = read.f32(reader);
                        const name = read.text(reader);

                        entities.set(identifier, { identifier, type, radius, healthCapacity, name, lastUpdateTick: -1 });
                        break;
                    }

                    case EntityType.Player: {
                        const skin = read.u8(reader);
                        const healthCapacity = read.f32(reader);
                        const name = read.text(reader);

                        entities.set(identifier, { identifier, type, radius, healthCapacity, name, skin, lastUpdateTick: -1 });
                        break;
                    }

                    default: break;
                }
            }

            break;
        }

        case ClientBoundPacketIdentifier.UpdateEntities: {
            environment.tick++;
            const now = performance.now();

            if (diagnostics.lastTick !== undefined) {
                const { tickRates } = diagnostics;
                const tickRate = 1000 / (now - diagnostics.lastTick);
                tickRates.push(tickRate);
                if (tickRates.length > TICK_RATE_SAMPLE_SIZE) tickRates.shift();
            }

            const { entities, tick } = environment;

            while (!read.isAtEnd(reader)) {
                const identifier = read.u16(reader);
                const entity = entities.get(identifier);
                if (entity === undefined) continue;

                /* const type = */ read.u8(reader);
                const x = read.f32(reader);
                const y = read.f32(reader);
                const position = { x, y };

                const direction = read.angle(reader);
                const health = read.f32(reader);

                switch (entity.type) {
                    case EntityType.Player: {
                        entity.item = read.u8(reader);
                        entity.hat = read.u8(reader);
                        entity.accessory = read.u8(reader);
                        break;
                    }
                }

                entity.lastUpdateTick = tick;
                entity.position = position;
                entity.direction = direction;
                entity.health = health;
            }

            diagnostics.lastTick = now;
            break;
        }

        case ClientBoundPacketIdentifier.EntityChatMessage: {
            const author = read.u16(reader);
            const authorName = read.text(reader);
            const content = read.text(reader);

            environment.chatMessageQueue.push({ author, authorName, content });
            break;
        }

        case ClientBoundPacketIdentifier.UpdateResources: {
            if (client.player === undefined) throw Error('resources updated before spawn');

            const wood = read.u16(reader);
            const stone = read.u16(reader);
            const food = read.u16(reader);
            const gold = read.u16(reader);

            client.player.resources = { wood, stone, food, gold };
            break;
        }

        default: break;
    }
};

export const getClientPlayerEntity = (client: Client): PlayerEntity | null => {
    if (client.entityIdentifier === undefined) return null;
    const player = client.environment.entities.get(client.entityIdentifier);
    return (player as PlayerEntity | undefined) ?? null;
};

export const isEntityVisible = (client: Client, { lastUpdateTick }: Entity): boolean => (
    lastUpdateTick !== -1 && lastUpdateTick === client.environment.tick
);

export const isPlayerAlive = (client: Client, player: PlayerEntity): player is VisiblePlayerEntity => isEntityVisible(client, player);

export const getVisibleEntities = (client: Client): VisibleEntity[] => (
    [...client.environment.entities.values()].filter(entity => isEntityVisible(client, entity)) as VisibleEntity[]
);

export const consumeChatMessages = ({ environment }: Client): ChatMessage[] => {
    const messages = [...environment.chatMessageQueue];
    environment.chatMessageQueue = [];
    return messages;
};

const PING_PACKET = write.finish(createPacketWriter(ServerBoundPacketIdentifier.Ping));
const ping = (socket: Socket) => sendMessage(socket, PING_PACKET);

const spawn = (socket: Socket, name: string, skin: number) => {
    const size = write.getTextSize(name) + 1;
    const writer = createPacketWriter(ServerBoundPacketIdentifier.Spawn, size);
    write.text(writer, name);
    write.u8(writer, skin);
    sendMessage(socket, write.finish(writer));
};

export type InputData = Readonly<{
    playerDirection: number | undefined,
    movementDirection: number | null | undefined,

    // todo: rename
    isLeftButtonDown: boolean,
    isRightButtonDown: boolean
}>;

const input = (
    socket: Socket,
    { playerDirection, movementDirection, isLeftButtonDown, isRightButtonDown }: InputData
) => {
    const isTurning = playerDirection !== undefined;
    const isMoving = movementDirection !== null && movementDirection !== undefined;

    const size = Number(isTurning) + Number(isMoving) + 1;
    const writer = createPacketWriter(ServerBoundPacketIdentifier.Input, size);

    let flag = 0x00;
    if (isTurning) flag |= InputPacketFlag.PlayerDirection;
    if (isMoving) flag |= InputPacketFlag.MovementDirection;
    else if (movementDirection === null) flag |= InputPacketFlag.CancelMovement;
    if (isLeftButtonDown) flag |= InputPacketFlag.LeftMouseButton;
    if (isRightButtonDown) flag |= InputPacketFlag.RightMouseButton;

    write.u8(writer, flag);

    if (isTurning) write.angle(writer, playerDirection);
    if (isMoving) write.angle(writer, movementDirection);

    sendMessage(socket, write.finish(writer));
};

const chat = (socket: Socket, message: string) => {
    const size = write.getTextSize(message);
    const writer = createPacketWriter(ServerBoundPacketIdentifier.Chat, size);
    write.text(writer, message);
    sendMessage(socket, write.finish(writer));
};

export type EquipData = Readonly<{
    item: number | undefined,
    hat: number | undefined,
    accessory: number | undefined
}>;

const equip = (
    socket: Socket,
    { item, hat, accessory }: EquipData
) => {
    const isEquippingItem = item !== undefined;
    const isEquippingHat = hat !== undefined;
    const isEquippingAccessory = accessory !== undefined;

    const size = Number(isEquippingItem) + Number(isEquippingHat) + Number(isEquippingAccessory) + 1;
    const writer = createPacketWriter(ServerBoundPacketIdentifier.Equip, size);

    let flag = 0x00;
    if (isEquippingItem) flag |= EquipPacketFlag.Item;
    if (isEquippingHat) flag |= EquipPacketFlag.Hat;
    if (isEquippingAccessory) flag |= EquipPacketFlag.Accessory;

    write.u8(writer, flag);

    if (isEquippingItem) write.u8(writer, item);
    if (isEquippingHat) write.u8(writer, hat);
    if (isEquippingAccessory) write.u8(writer, accessory);

    sendMessage(socket, write.finish(writer));
};

// todo: clean up and make sure this works and doesn't cause a memory leak or something
// todo: also make sure it will always receive the event after spawn data has been set in the message handler
export const spawnClient = async ({ socket }: Client, name: string, skin: number) => {
    spawn(socket, name, skin);

    for await (const message of getMessageStream(socket)) {
        const [identifier] = createPacketReader(message);
        if (identifier === ClientBoundPacketIdentifier.ClientSpawn) break;
    }
};

export const updateClientInput = (
    { socket, input: state }: Client,
    { playerDirection, movementDirection, isLeftButtonDown, isRightButtonDown }: Partial<InputData>
) => {
    const reducedInputData: InputData = {
        playerDirection: playerDirection === state.playerDirection ? undefined : playerDirection,
        movementDirection: movementDirection === state.movementDirection ? undefined : movementDirection,

        isLeftButtonDown: isLeftButtonDown === state.isLeftButtonDown || isLeftButtonDown === undefined
            ? state.isLeftButtonDown
            : isLeftButtonDown,

        isRightButtonDown: isRightButtonDown === state.isRightButtonDown || isRightButtonDown === undefined
            ? state.isRightButtonDown
            : isRightButtonDown
    };

    // todo: refactor
    if (
        Object.values(reducedInputData).every(value => value === undefined || typeof value === 'boolean') &&
        (isLeftButtonDown === state.isLeftButtonDown || isLeftButtonDown === undefined) &&
        (isRightButtonDown === state.isRightButtonDown || isRightButtonDown === undefined)
    ) return;

    if (playerDirection !== undefined) state.playerDirection = playerDirection;
    if (movementDirection !== undefined) state.movementDirection = movementDirection;
    if (isLeftButtonDown !== undefined) state.isLeftButtonDown = isLeftButtonDown;
    if (isRightButtonDown !== undefined) state.isRightButtonDown = isRightButtonDown;

    input(socket, reducedInputData);
};

export const sendClientChatMessage = ({ socket }: Client, message: string) => chat(socket, message);

export const updateClientEquipment = (
    { socket, input: state }: Client,
    { item, hat, accessory }: Partial<EquipData>
) => {
    const reducedEquipData = {
        // items can be re-selected
        item,

        hat: item === state.hat ? undefined : hat,
        accessory: item === state.accessory ? undefined : accessory
    };

    if (Object.values(reducedEquipData).every(value => value === undefined)) return;

    if (item !== undefined) state.item = item;
    if (hat !== undefined) state.hat = hat;
    if (accessory !== undefined) state.accessory = accessory;

    equip(socket, reducedEquipData);
};
