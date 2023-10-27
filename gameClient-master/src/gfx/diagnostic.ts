import { Camera, getTargetCameraZoom } from './camera.js';
import { ClientDiagnostics, ClientEnvironment, ClientInputState, ClientPlayerResourceCollection } from '../net/client.js';
import { MAX_PLAYER_COUNT } from '../config.js';
import { toDegrees } from '../util/math.js';
import Vector from '../util/vector.js';

// todo: move all of this somewhere else later + refactor

type RenderDiagnostics = Readonly<{
    refreshRate: number,
    renderTime: number | undefined
}>;

type Diagnostics = Readonly<{
    render: RenderDiagnostics,
    client: ClientDiagnostics,
    resources: ClientPlayerResourceCollection | undefined,
    environment: ClientEnvironment,
    input: ClientInputState,
    camera: Camera,
    playerPosition: Vector
}>;

// todo: move stuff like this to canvas.ts as const enums
// type TextAlign = 'left' | 'right';
type TextBaseline = 'bottom' | 'top';

type DiagnosticOrientation = {
    position: Vector,
    baseline: TextBaseline,
    isReversed: boolean
};

const DIAGNOSTIC_ORIENTATIONS = {
    TOP_LEFT: {
        position: { x: -1, y: 1 },
        baseline: 'top',
        isReversed: false
    },

    TOP_RIGHT: {
        position: { x: 1, y: 1 },
        baseline: 'top',
        isReversed: true
    },

    BOTTOM_LEFT: {
        position: { x: -1, y: -1 },
        baseline: 'bottom',
        isReversed: false
    },

    BOTTOM_RIGHT: {
        position: { x: 1, y: -1 },
        baseline: 'bottom',
        isReversed: true
    }
} as const;

const renderDiagnosticItem = (
    context: CanvasRenderingContext2D,
    orientation: DiagnosticOrientation,
    key: string,
    value: string,
    padding: number,
    verticalOffset: number,
    columnWidth: number
) => {
    const { width, height } = context.canvas;
    context.textBaseline = orientation.baseline;

    const kx = (padding + (orientation.isReversed ? columnWidth : 0)) * (orientation.position.x === 1 ? -1 : 1) + (width * (orientation.position.x + 1)) / 2;
    const ky = height - ((padding + verticalOffset) * (orientation.position.y === 1 ? -1 : 1) + (height * (orientation.position.y + 1)) / 2);

    context.textAlign = 'left';
    context.fillText(key, kx, ky);

    const vx = (padding + (orientation.isReversed ? 0 : columnWidth)) * (orientation.position.x === 1 ? -1 : 1) + (width * (orientation.position.x + 1)) / 2;
    const vy = height - ((padding + verticalOffset) * (orientation.position.y === 1 ? -1 : 1) + (height * (orientation.position.y + 1)) / 2);

    context.textAlign = 'right';
    context.fillText(value, vx, vy);
};

export const renderDiagnostics = (
    context: CanvasRenderingContext2D,
    diagnostics: Diagnostics,
    padding: number,
    lineHeight: number,
    columnWidth: number
) => {
    const {
        render: { refreshRate, renderTime },
        client: { playerCount, latencies, tickRates },
        input: { playerDirection, movementDirection, isLeftButtonDown, isRightButtonDown },
        resources,
        environment: { server },
        camera,
        playerPosition
    } = diagnostics;

    const averageLatency = latencies.length === 0 ? null : latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
    const averageTickRate = tickRates.length === 0 ? null : tickRates.reduce((sum, tickRate) => sum + tickRate, 0) / tickRates.length;

    const topLeftDiagnostics = [
        ['Refresh', refreshRate.toFixed(1) + ' Hz'],
        ['Render', (renderTime?.toFixed(1) ?? '-') + ' ms'],
        ['Latency', (averageLatency?.toFixed(1) ?? '-') + ' ms'],
        ['Tick', (averageTickRate?.toFixed(1) ?? '-') + ' Hz']
    ] as const;

    for (let index = 0, { length } = topLeftDiagnostics; index < length; index++) {
        const [key, value] = topLeftDiagnostics[index]!;
        renderDiagnosticItem(context, DIAGNOSTIC_ORIENTATIONS.TOP_LEFT, key, value, padding, lineHeight * index, columnWidth);
    }

    const bottomLeftDiagnostics = [
        ['Food', String(resources?.food ?? '-')],
        ['Wood', String(resources?.wood ?? '-')],
        ['Stone', String(resources?.stone ?? '-')],
        ['Gold', String(resources?.gold ?? '-')]
    ] as const;

    for (let index = 0, { length } = bottomLeftDiagnostics; index < length; index++) {
        const [key, value] = bottomLeftDiagnostics[index]!;
        renderDiagnosticItem(context, DIAGNOSTIC_ORIENTATIONS.BOTTOM_LEFT, key, value, padding, lineHeight * index, columnWidth);
    }

    const topRightDiagnostics = [
        ['Player Count', `${playerCount} / ${MAX_PLAYER_COUNT}`],
        ['Map Size', String(server?.mapSize ?? '-') + ' units'],
        ['Player X', playerPosition.x.toFixed(1) + ' units'],
        ['Player Y', playerPosition.y.toFixed(1) + ' units']
    ] as const;

    for (let index = 0, { length } = topRightDiagnostics; index < length; index++) {
        const [key, value] = topRightDiagnostics[index]!;
        renderDiagnosticItem(context, DIAGNOSTIC_ORIENTATIONS.TOP_RIGHT, key, value, padding, lineHeight * index, columnWidth);
    }

    const bottomRightDiagnostics = [
        ['Input Movement', (movementDirection === null ? '-' : toDegrees(movementDirection).toFixed(1)) + '°'],
        ['Input Direction', toDegrees(playerDirection).toFixed(1) + '°'],
        ['Left Button', isLeftButtonDown ? 'Down' : 'Up'],
        ['Right Button', isRightButtonDown ? 'Down' : 'Up'],
        ['Camera Zoom', getTargetCameraZoom(camera).toFixed(2) + 'x']
    ] as const;

    for (let index = 0, { length } = bottomRightDiagnostics; index < length; index++) {
        const [key, value] = bottomRightDiagnostics[index]!;
        renderDiagnosticItem(context, DIAGNOSTIC_ORIENTATIONS.BOTTOM_RIGHT, key, value, padding, lineHeight * index, columnWidth);
    }
};
