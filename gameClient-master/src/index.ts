import { createCamera, getTargetCameraZoom, setCameraPosition, setCameraZoom, updateCamera } from './gfx/camera.js';
import { createRenderLoop, initialiseCanvasContext, renderGrid, resetContextTransform, setContextTransform } from './gfx/canvas.js';
import { renderDiagnostics } from './gfx/diagnostic.js';
import {
    consumeChatEvents,
    consumeItemSelection,
    consumeScrollEvents,
    createInputListener,
    getMovementDirection,
    getNameInputContent,
    getPlayerDirection,
    isLeftButtonDown,
    isRightButtonDown
} from './input.js';
import {
    ChatMessage,
    connectClient,
    consumeChatMessages,
    getClientPlayerEntity,
    getVisibleEntities,
    isPlayerAlive,
    sendClientChatMessage,
    spawnClient,
    updateClientEquipment,
    updateClientInput
} from './net/client.js';
import { Entity, EntityType, VisibleEntity, VisiblePlayerEntity } from './net/entity.js';
import { hsla, rgba } from './util/colour.js';
import { clamp, getRandomInt, TAU } from './util/math.js';

// todo: constrain viewport size
// todo: better canvas rendering, asset loading, audio, rest api (api/)
// todo: eventually move some stuff in here into gfx/render & gfx/ui or ui/
// todo: take samples for render time & refresh rate as well
// todo: handle server disconnection / reconnection

let isInGame = false;
let hasSeenPlayerOnce = false;

const chatMessageDisplay: ChatMessage[] = [];

const canvas = document.querySelector('#game-canvas') as HTMLCanvasElement;
const menu = document.querySelector('#menu') as HTMLDivElement;
const ui = document.querySelector('#game-interface') as HTMLDivElement;
const chatHolder = document.querySelector('#chat-holder') as HTMLInputElement;

const context = initialiseCanvasContext(canvas, hsla(0.65, 0.75, 0.06));
const camera = createCamera({ x: 0, y: 0 }, 4 / 3);
const input = createInputListener();

const client = await connectClient();

const enterGame = async () => {
    isInGame = true;
    hasSeenPlayerOnce = false;

    menu.style.display = 'none';
    ui.style.display = 'block';

    await spawnClient(
        client,
        getNameInputContent(input) ?? 'unset',
        getRandomInt(0, SKIN_COUNT - 1)
    );
};

const exitGame = () => {
    isInGame = false;
    menu.style.display = 'block';
    ui.style.display = 'none';

    // todo: refactor
    chatHolder.style.display = 'none';
};

// todo: move to config.ts
const DEFAULT_ZOOM = 4 / 3;
const ZOOM_MAX_SCROLL = 3;
const ZOOM_MAX = 2;

const ZOOMING_SCALAR = (ZOOM_MAX / DEFAULT_ZOOM) ** (1 / ZOOM_MAX_SCROLL);
const ZOOM_MIN = DEFAULT_ZOOM / ZOOMING_SCALAR ** ZOOM_MAX_SCROLL;

const GRID_CELL_SIZE = 60;

const SKIN_COUNT = 5;

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

// todo: replace with palette in config.ts & use hsla / rgba fns from colour.ts
const SELF_COLOUR = rgba(0, 255, 140);
const ENEMY_COLOUR = rgba(255, 23, 60);
const ENTITY_COLOUR = rgba(50, 150, 255);
const BORDER_COLOUR = ENEMY_COLOUR;
const GRID_COLOUR = rgba(255, 255, 255, 12);

const getEntityColour = (entity: Entity, isSelf: boolean): string => {
    switch (entity.type) {
        case EntityType.BaseEntity: return ENTITY_COLOUR;
        case EntityType.Player: return isSelf ? SELF_COLOUR : ENEMY_COLOUR;
        default: return rgba(255, 255, 255);
    }
};

const renderEntity = (entity: VisibleEntity, isSelf: boolean) => {
    const isPlayer = entity.type === EntityType.Player;

    context.strokeStyle = getEntityColour(entity, isSelf);
    context.fillStyle = context.strokeStyle;

    context.save();
    context.translate(entity.position.x, -entity.position.y);

    context.fillText(`[id: ${entity.identifier}] ${entity.name}`, 0, -(entity.radius + 30));
    if (isPlayer) context.fillText(`[i: ${entity.item} / h: ${entity.hat} / a: ${entity.accessory}]`, 0, entity.radius + 30);
    context.fillText(`[hp: ${Math.round(entity.health)} / ${entity.healthCapacity}]`, 0, entity.radius + (isPlayer ? 60 : 30));

    if (isPlayer) context.fillText(String(entity.skin), 0, 0);
    context.rotate(entity.direction);

    context.beginPath();
    context.arc(0, 0, entity.radius, 0, TAU);
    context.lineTo(entity.type === EntityType.Player ? entity.radius / 2 : entity.radius, 0);
    context.stroke();

    context.restore();
};

const renderBorder = (mapSize: number) => {
    const lineWidth = context.lineWidth * camera.zoom;

    // todo: transformation has to be programmatic for this to work
    if (lineWidth <= 2) context.strokeRect(Math.round(-mapSize / 2), Math.round(-mapSize / 2), Math.round(mapSize), Math.round(mapSize));
    else context.strokeRect(-mapSize / 2, -mapSize / 2, mapSize, mapSize);
};

const renderViewportBorder = (player: VisiblePlayerEntity, width: number, height: number) => {
    width += context.lineWidth;
    height += context.lineWidth;

    context.save();
    context.translate(player.position.x, -player.position.y);
    context.strokeRect(-width / 2, -height / 2, width, height);
    context.restore();
};

createRenderLoop(context, (_, deltaTime, renderTime) => {
    if (input.hasPressedPlay) {
        input.hasPressedPlay = false;
        enterGame();
    }

    if (!isInGame) return;

    updateClientInput(client, {
        playerDirection: getPlayerDirection(input),
        movementDirection: getMovementDirection(input),
        isLeftButtonDown: isLeftButtonDown(input),
        isRightButtonDown: isRightButtonDown(input)
    });

    const item = consumeItemSelection(input);
    if (item !== null) updateClientEquipment(client, { item });

    for (const message of consumeChatEvents(input)) sendClientChatMessage(client, message);

    for (const delta of consumeScrollEvents(input)) {
        const scalar = delta > 0 ? (1 / ZOOMING_SCALAR) : ZOOMING_SCALAR;
        setCameraZoom(camera, clamp(scalar * getTargetCameraZoom(camera), ZOOM_MIN, ZOOM_MAX));
    }

    const { environment } = client;
    if (client.entityIdentifier === undefined || environment.server === undefined) return;

    const player = getClientPlayerEntity(client);
    if (player === null) return;

    if (isPlayerAlive(client, player)) hasSeenPlayerOnce = true;
    else {
        if (hasSeenPlayerOnce) return exitGame();
        else return;
    }

    setCameraPosition(camera, player.position);
    updateCamera(camera, deltaTime);

    context.lineJoin = 'miter';
    context.lineCap = 'butt';
    context.lineWidth = 3;
    context.strokeStyle = GRID_COLOUR;
    renderGrid(context, camera, GRID_CELL_SIZE);

    setContextTransform(context, camera);

    context.strokeStyle = BORDER_COLOUR;
    renderBorder(environment.server.mapSize);

    context.strokeStyle = rgba(50, 150, 255);
    renderViewportBorder(player, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    context.font = '800 18px Jetbrains Mono';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (const entity of getVisibleEntities(client)) {
        const isSelf = entity.identifier === client.entityIdentifier;
        renderEntity(entity, isSelf);
    }

    context.font = '20px Jetbrains Mono';
    context.fillStyle = rgba(225, 225, 255);
    context.strokeStyle = context.fillStyle;

    resetContextTransform(context);

    const PADDING = 50;
    const LINE_HEIGHT = 40;
    const COLUMN_WIDTH = 285;

    context.beginPath();
    context.moveTo(PADDING, canvas.height - PADDING - LINE_HEIGHT * 4.5);
    context.lineTo(PADDING + COLUMN_WIDTH, canvas.height - PADDING - LINE_HEIGHT * 4.5);
    context.stroke();

    for (const message of consumeChatMessages(client)) {
        chatMessageDisplay.unshift(message);
        setTimeout(() => chatMessageDisplay.pop(), 5_000);
    }

    context.textBaseline = 'top';
    context.textAlign = 'left';

    for (let index = 0, { length } = chatMessageDisplay; index < length; index++) {
        const message = chatMessageDisplay[index]!;

        context.fillText(
            `[${message.authorName}]: ${message.content}`,
            PADDING,
            canvas.height - PADDING - LINE_HEIGHT * (index + 5.75)
        );
    }

    const diagnostics = {
        render: { refreshRate: 1 / deltaTime, renderTime },
        client: client.diagnostics,
        resources: client.player?.resources,
        environment,
        input: client.input,
        camera,
        playerPosition: player.position
    };

    renderDiagnostics(context, diagnostics, PADDING, LINE_HEIGHT, COLUMN_WIDTH);
});
