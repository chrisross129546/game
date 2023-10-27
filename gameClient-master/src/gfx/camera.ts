import { Animation, Interpolator, createAnimation, setAnimationTarget, updateAnimation, createInstantaneousInterpolator } from './animation.js';
import Vector from '../util/vector.js';

export type Camera = {
    position: Vector,
    positionComponentAnimation: { x: Animation, y: Animation },
    zoom: number,
    zoomAnimation: Animation
};

const defaultCameraInterpolator = createInstantaneousInterpolator();

export const createCamera = (
    position: Vector,
    zoom: number,
    positionInterpolator: Interpolator = defaultCameraInterpolator,
    zoomInterpolator: Interpolator = defaultCameraInterpolator
): Camera => {
    const positionComponentAnimation = {
        x: createAnimation(position.x, position.x, positionInterpolator),
        y: createAnimation(position.y, position.y, positionInterpolator)
    };

    const zoomAnimation = createAnimation(zoom, zoom, zoomInterpolator);

    return {
        position,
        positionComponentAnimation,
        zoom,
        zoomAnimation
    };
};

export const getTargetCameraPosition = ({ positionComponentAnimation: { x, y } }: Camera): Vector => ({
    x: x.targetValue,
    y: y.targetValue
});

export const setCameraPosition = (camera: Camera, position: Vector) => {
    const { positionComponentAnimation: { x, y } } = camera;
    setAnimationTarget(x, position.x);
    setAnimationTarget(y, position.y);
};

export const getTargetCameraZoom = ({ zoomAnimation }: Camera): number => zoomAnimation.targetValue;

export const setCameraZoom = (camera: Camera, zoom: number) => {
    const { zoomAnimation } = camera;
    setAnimationTarget(zoomAnimation, zoom);
};

export const updateCamera = (camera: Camera, deltaTime: number) => {
    const { positionComponentAnimation: { x, y }, zoomAnimation: zoom } = camera;

    updateAnimation(x, deltaTime);
    updateAnimation(y, deltaTime);
    camera.position = { x: x.currentValue, y: y.currentValue };

    updateAnimation(zoom, deltaTime);
    camera.zoom = zoom.currentValue;
};
