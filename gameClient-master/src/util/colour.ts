export type Colour = string;

const formatColourByte = (n: number): string => Math.floor(n).toString(16).padStart(2, '0');

export const rgba = (r: number, g: number, b: number, a: number = 255): Colour => (
    `#${formatColourByte(r)}${formatColourByte(g)}${formatColourByte(b)}${formatColourByte(a)}`
);

const getRgbComponent = (h: number, l: number, a: number, n: number): number => {
    const k = (h * 12 + n) % 12;
    return l - Math.max(Math.min(k - 3, 9 - k, 1), -1) * a;
};

export const hsla = (h: number, s: number, l: number, a: number = 1): Colour => {
    const _a = s * Math.min(l, 1 - l);

    return rgba(
        getRgbComponent(h, l, _a, 0) * 0xff,
        getRgbComponent(h, l, _a, 8) * 0xff,
        getRgbComponent(h, l, _a, 4) * 0xff,
        a * 0xff
    );
};
