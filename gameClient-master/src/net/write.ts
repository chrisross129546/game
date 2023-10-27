import { IS_LITTLE_ENDIAN_PROTOCOL } from '../config.js';
import { TAU } from '../util/math.js';

export type Writer = {
    readonly view: DataView,
    readonly u8view: Uint8Array,
    position: number
};

// todo: optimise text encoding so that .encode does not have to be called twice when writing a packet
const encodeUtf8String = TextEncoder.prototype.encode.bind(new TextEncoder());
export const getTextSize = (text: string) => encodeUtf8String(text).byteLength + 2;

const createWriter = (size: number): Writer => {
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const u8view = new Uint8Array(buffer);
    return { view, u8view, position: 0 };
};

export default createWriter;

const next = (writer: Writer, byteCount: number): number => {
    const { position } = writer;
    writer.position += byteCount;
    return position;
};

export const u8 = (writer: Writer, value: number) => writer.view.setUint8(next(writer, 1), value);
export const u16 = (writer: Writer, value: number) => writer.view.setUint16(next(writer, 2), value, IS_LITTLE_ENDIAN_PROTOCOL);
export const u32 = (writer: Writer, value: number) => writer.view.setUint32(next(writer, 4), value, IS_LITTLE_ENDIAN_PROTOCOL);

export const i8 = (writer: Writer, value: number) => writer.view.setInt8(next(writer, 1), value);
export const i16 = (writer: Writer, value: number) => writer.view.setInt16(next(writer, 2), value, IS_LITTLE_ENDIAN_PROTOCOL);
export const i32 = (writer: Writer, value: number) => writer.view.setInt32(next(writer, 4), value, IS_LITTLE_ENDIAN_PROTOCOL);

export const f32 = (writer: Writer, value: number) => writer.view.setFloat32(next(writer, 4), value, IS_LITTLE_ENDIAN_PROTOCOL);
export const f64 = (writer: Writer, value: number) => writer.view.setFloat64(next(writer, 8), value, IS_LITTLE_ENDIAN_PROTOCOL);

export const angle = (writer: Writer, value: number) => i8(writer, Math.floor((value / TAU) * 256));

export const text = (writer: Writer, value: string) => {
    const buffer = encodeUtf8String(value);
    const size = buffer.byteLength;
    u16(writer, size);
    writer.u8view.set(buffer, next(writer, size));
};

export const finish = (writer: Writer) => writer.view.buffer;
