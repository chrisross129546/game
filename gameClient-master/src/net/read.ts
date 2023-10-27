import { IS_LITTLE_ENDIAN_PROTOCOL } from '../config.js';
import { TAU } from '../util/math.js';

export type Reader = {
    readonly view: DataView,
    position: number
};

const createReader = (data: ArrayBuffer): Reader => {
    const view = new DataView(data);
    return { view, position: 0 };
};

export default createReader;

const next = (reader: Reader, byteCount: number): number => {
    const { position } = reader;
    reader.position += byteCount;
    return position;
};

export const u8 = (reader: Reader): number => reader.view.getUint8(next(reader, 1));
export const u16 = (reader: Reader): number => reader.view.getUint16(next(reader, 2), IS_LITTLE_ENDIAN_PROTOCOL);
export const u32 = (reader: Reader): number => reader.view.getUint32(next(reader, 4), IS_LITTLE_ENDIAN_PROTOCOL);

export const i8 = (reader: Reader): number => reader.view.getInt8(next(reader, 1));
export const i16 = (reader: Reader): number => reader.view.getInt16(next(reader, 2), IS_LITTLE_ENDIAN_PROTOCOL);
export const i32 = (reader: Reader): number => reader.view.getInt32(next(reader, 4), IS_LITTLE_ENDIAN_PROTOCOL);

export const f32 = (reader: Reader): number => reader.view.getFloat32(next(reader, 4), IS_LITTLE_ENDIAN_PROTOCOL);
export const f64 = (reader: Reader): number => reader.view.getFloat64(next(reader, 8), IS_LITTLE_ENDIAN_PROTOCOL);

export const angle = (reader: Reader): number => (i8(reader) / 256) * TAU;

const decodeUtf8Buffer = TextDecoder.prototype.decode.bind(new TextDecoder());
export const text = (reader: Reader): string => {
    const length = u16(reader);
    const slice = reader.view.buffer.slice(next(reader, length), reader.position);
    return decodeUtf8Buffer(slice);
};

export const isAtEnd = (reader: Reader): boolean => reader.position >= reader.view.buffer.byteLength;
