import { Camera } from './camera.js';
import { Colour, hsla } from '../util/colour.js';
import { mod } from '../util/math.js';

export const resetContextTransform = (context: CanvasRenderingContext2D) => {
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};

export const initialiseCanvasContext = (canvas: HTMLCanvasElement, background: Colour = hsla(0, 0, 0)): CanvasRenderingContext2D => {
    const { style } = canvas;

    const context = canvas.getContext('2d');
    if (context === null) throw Error('Canvas rendering context initialisation failed');

    const resizeListener = () => {
        canvas.setAttribute('width', String(innerWidth * devicePixelRatio));
        canvas.setAttribute('height', String(innerHeight * devicePixelRatio));
        style.setProperty('width', innerWidth + 'px');
        style.setProperty('height', innerHeight + 'px');
    };

    resizeListener();
    style.setProperty('position', 'absolute');
    style.setProperty('background-color', background);

    addEventListener('resize', resizeListener);
    return context;
};

export const clearCanvas = (context: CanvasRenderingContext2D) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
};

// todo: render diagnostics (render time & fps)

type Callback = (tick: number, deltaTime: number, renderTime?: number) => void;
export const createRenderLoop = (context: CanvasRenderingContext2D, callback: Callback) => {
    let tick = 0, previousFrameTime: number, lastRenderTime: number;

    const renderFrame = (frameTime: number) => {
        const deltaTime = previousFrameTime === undefined ? 0 : (frameTime - previousFrameTime) / 1000;
        tick += deltaTime;

        const now = performance.now();

        resetContextTransform(context);
        clearCanvas(context);
        callback(tick, deltaTime, lastRenderTime);

        lastRenderTime = performance.now() - now;

        previousFrameTime = frameTime;
        requestAnimationFrame(renderFrame);
    };

    requestAnimationFrame(renderFrame);
};

export const setContextTransform = (context: CanvasRenderingContext2D, camera: Camera) => {
    resetContextTransform(context);
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.position.x, camera.position.y);
};

const transformX = (x: number, canvas: HTMLCanvasElement, camera: Camera): number => (
    (x - camera.position.x) * camera.zoom + canvas.width / 2
);

const transformY = (x: number, canvas: HTMLCanvasElement, camera: Camera): number => (
    canvas.height - ((x - camera.position.y) * camera.zoom + canvas.height / 2)
);

export const renderGrid = (context: CanvasRenderingContext2D, camera: Camera, cellSize: number) => {
    resetContextTransform(context);

    const { canvas } = context;
    const padding = context.lineWidth / 2;
    cellSize *= camera.zoom;

    context.beginPath();

    const horizontalEnd = canvas.width + padding;
    const horizontalStart = mod(transformX(0, canvas, camera) + padding, cellSize) - padding;

    for (let x = horizontalStart; x <= horizontalEnd; x += cellSize) {
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
    }

    const verticalEnd = canvas.height + padding;
    const verticalStart = mod(transformY(0, canvas, camera) + padding, cellSize) - padding;

    for (let y = verticalStart; y <= verticalEnd; y += cellSize) {
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
    }

    const previousLineWidth = context.lineWidth;
    context.lineWidth *= camera.zoom;
    context.stroke();
    context.lineWidth = previousLineWidth;
};

// todo: camera / rotational transformation & rendering helpers
// todo: apply transformations programmatically?
