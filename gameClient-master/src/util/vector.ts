type Vector = Readonly<{ x: number, y: number }>;
export default Vector;

export const resolvePolarForm = (direction = 0, magnitude = 0): Vector => ({
    x: Math.cos(direction) * magnitude,
    y: Math.sin(direction) * magnitude
});

export const getDirection = (vector: Vector): number => Math.atan2(vector.y, vector.x);
export const getMagnitude = (vector: Vector): number => Math.hypot(vector.y, vector.x);

export const getDistanceBetween = (source: Vector, destination: Vector): number => {
    return Math.hypot(destination.y - source.y, destination.x - source.x);
};

export const getAngleBetween = (source: Vector, destination: Vector): number => {
    return Math.atan2(destination.y - source.y, destination.x - source.x);
};

export const add = (source: Vector, vector: Vector): Vector => ({
    x: source.x + vector.x,
    y: source.y + vector.y
});

export const subtract = (source: Vector, vector: Vector): Vector => ({
    x: source.x - vector.x,
    y: source.y - vector.y
});

export const multiply = (source: Vector, vector: Vector): Vector => ({
    x: source.x * vector.x,
    y: source.y * vector.y
});

export const divide = (source: Vector, vector: Vector): Vector => ({
    x: source.x / vector.x,
    y: source.y / vector.y
});

export const scale = (source: Vector, scalar: number): Vector => ({
    x: source.x * scalar,
    y: source.y * scalar
});
