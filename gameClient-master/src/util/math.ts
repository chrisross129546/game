export const TAU = Math.PI * 2;
export const toDegrees = (radians: number): number => (radians / TAU) * 360;

export const mod = (a: number, b: number): number => (a % b + b) % b;
export const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

export const getRandomFloat = (minimum: number = 0, maximum: number = 1): number => (
    (Math.random() * (maximum - minimum)) + minimum
);

export const getRandomInt = (minimum: number, maximum: number): number => (
    Math.floor(getRandomFloat(minimum, maximum + 1))
);

export const oscillate = (tick: number, offset: number, frequency: number, amplitude: number): number => (
    ((Math.sin((tick * frequency + offset) * TAU) + 1) / 2) * amplitude
);

export const clamp = (value: number, min: number, max: number = Number.POSITIVE_INFINITY) => (
    Math.max(Math.min(value, max), min)
);

// lambert w evaluation below is sourced from https://github.com/protobi/lambertw/blob/master/lambertw.js
const DOUBLE_EPSILON = 2.220446049250313e-16;
const RECIPROCAL_E = 1 / Math.E;

const halleyIterate = (x: number, w: number, iterations: number): number => {
    for (let i = 0; i < iterations; i++) {
        const e = Math.exp(w), p = w + 1;
        let t = w * e - x;

        if (w > 0) t = (t / p) / e;
        else t /= e * p - 0.5 * (p + 1) * t / p;

        w -= t;

        const tolerance = DOUBLE_EPSILON * Math.max(Math.abs(w), 1 / (Math.abs(p) * e));
        if (Math.abs(t) < tolerance) return w;
    }

    // this should never happen
    throw Error(`halley iteration could not converge within ${iterations} iterations`);
};

const evaluateSeries = (r: number): number => {
    const t8 = -8.401032217523978 + r * (12.25075350131446 + r * (-18.10069701247244 + r * 27.029044799010563));
    const t5 = 3.0668589010506317 + r * (-4.175335600258177 + r * (5.858023729874774 + r * t8));
    const t1 = 2.331643981597124 + r * (-1.8121878856393634 + r * (1.9366311144923598 + r * (-2.3535512018816145 + r * t5)));
    return r * t1 - 1;
};

const w0 = (x: number): number => {
    if (x === 0) return 0;

    const q = x + RECIPROCAL_E;

    if (q === 0) return -1;
    if (q < 1e-3) return evaluateSeries(Math.sqrt(q));

    let w;

    if (x < 1) {
        const p = Math.sqrt(q * Math.E * 2);
        w = p * (1 + p * (-1 / 3 + p * 11 / 72)) - 1;
    } else {
        w = Math.log(x);
        if (x > 3) w -= Math.log(w);
    }

    return halleyIterate(x, w, 100);
};

const wm1 = (x: number): number => {
    if (x === 0) return 0;

    const q = x + RECIPROCAL_E;
    let w;

    if (x < -1e-6) {
        const r = -Math.sqrt(q);
        w = evaluateSeries(r);
        if (q < 3e-3) return w;
    } else {
        const l1 = Math.log(-x);
        const l2 = Math.log(-l1);
        w = l1 - l2 + l2 / l1;
    }

    return halleyIterate(x, w, 32);
};

type Solution = [] | [number] | [number, number];
export const solveLambertW = (x: number): Solution => {
    if (x < -RECIPROCAL_E) return [];
    else if (x < 0) return [wm1(x), w0(x)];
    else return [w0(x)];
};
