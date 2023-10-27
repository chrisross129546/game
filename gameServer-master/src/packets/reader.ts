import { MAX_PAYLOAD_LEN } from "../config";

const PI2 = Math.PI / 2;

const ab = new ArrayBuffer(MAX_PAYLOAD_LEN);
const dv = new DataView(ab);
const u8a = new Uint8Array(ab);
let index = 0;
let byteLen = 0;

const decoder = new TextDecoder();

export const readUint8 = (): number => {
	if (!canRead()) {
		throw Error();
	}
	return dv.getUint8(index++);
};

export const readInt8 = (): number => {
	if (!canRead()) {
		throw Error();
	}
	return dv.getInt8(index++);
};

export const readUint16 = (): number => {
	if (!canRead(2)) {
		throw Error();
	}
	const tmp = dv.getUint16(index);
	index += 2;
	return tmp;
};

export const readInt16 = (): number => {
	if (!canRead(2)) {
		throw Error();
	}
	const tmp = dv.getInt16(index);
	index += 2;
	return tmp;
};

export const readUint32 = (): number => {
	if (!canRead(4)) {
		throw Error();
	}
	const tmp = dv.getUint32(index);
	index += 4;
	return tmp;
};

export const readInt32 = (): number => {
	if (!canRead(4)) {
		throw Error();
	}
	const tmp = dv.getInt32(index);
	index += 4;
	return tmp;
};

export const readFloat32 = (): number => {
	if (!canRead(4)) {
		throw Error();
	}
	const tmp = dv.getFloat32(index);
	index += 4;
	return tmp;
};

export const readFloat64 = (): number => {
	if (!canRead(8)) {
		throw Error();
	}
	const tmp = dv.getFloat64(index);
	index += 8;
	return tmp;
};

export const readAngle = (): number => {
	if (!canRead()) {
		throw Error();
	}
	return (readInt8() / 128) * Math.PI;
};

export const readText = (): string => {
	if (!canRead(2)) {
		throw Error();
	}
	const len = readUint16();
	if (!canRead(len)) {
		throw Error();
	}
	const buf = ab.slice(index, index + len);
	index += len;
	return decoder.decode(buf);
};

export const canRead = (bytes = 1): boolean => index + bytes <= byteLen;

export const setReadBuffer = (data: ArrayBuffer): number => {
	byteLen = data.byteLength;
	u8a.set(new Uint8Array(data));
	index = 0;
	return readUint8();
};
