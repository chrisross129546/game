import { lerp, solveLambertW } from '../util/math.js';

// todo: easing for stuff like weapon animations (static / dynamic animations)
// todo: move to anim/static.ts (easing / keyframes) & anim/dynamic.ts (interpolation)

// todo: also eventually implement cubic beziers and find derivative to find the point when the movement
// todo: velocity is below a low threshold so that no element animation states are changed until they've
// todo: almost stopped moving to avoid jittery ui movement (example: player dies immediately (spawn
// todo: protection should be added but whatever) and wait until ui elements have stopped moving)

// todo: or just animate ui elements in javascript using spring interpolators (probably easier)

export type Interpolator = (animation: Animation, deltaTime: number) => void;

export type Animation = {
    targetValue: number,
    currentValue: number,
    velocity: number,
    interpolator: Interpolator
};

export const createAnimation = (currentValue: number, targetValue: number, interpolator: Interpolator): Animation => ({
    targetValue,
    currentValue,
    velocity: 0,
    interpolator
});

export const setAnimationTarget = (animation: Animation, targetValue: number) => {
    animation.targetValue = targetValue;
};

export const updateAnimation = (animation: Animation, deltaTime: number) => {
    animation.interpolator(animation, deltaTime);
};

export const createInstantaneousInterpolator = (): Interpolator => animation => {
    const { targetValue } = animation;
    animation.currentValue = targetValue;
};

export const createLinearInterpolator = (fraction: number): Interpolator => (animation, deltaTime) => {
    const { currentValue, targetValue } = animation;
    animation.currentValue = lerp(currentValue, targetValue, 1 - (1 - fraction) ** deltaTime);
};

// sourced from http://mathproofs.blogspot.com/2013/07/critically-damped-spring-smoothing.html
export const createSpringInterpolator = (fraction: number, time: number): Interpolator => {
    // note: only W₋₁ branch used (should always exist since fraction < 1)
    const w = solveLambertW((fraction - 1) / Math.E)[0]!;
    const omega = -(w + 1) / time, omega2 = omega ** 2;

    return (animation, deltaTime) => {
        const { currentValue, targetValue, velocity } = animation;

        animation.velocity = (velocity - omega2 * deltaTime * (currentValue - targetValue)) / (deltaTime * omega + 1) ** 2;
        animation.currentValue = currentValue + animation.velocity * deltaTime;
    };
};
