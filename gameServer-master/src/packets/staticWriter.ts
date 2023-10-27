const PI2 = Math.PI / 2;

const encoder = new TextEncoder();

export const getEncodedLength = (str: string) => {
	return encoder.encode(str).length;
};

export class StaticPacket {
	ab: ArrayBuffer;
	dv: DataView;
	u8a: Uint8Array;
	constructor(len: number) {
		this.ab = new ArrayBuffer(len);
		this.dv = new DataView(this.ab);
		this.u8a = new Uint8Array(this.ab);
	}
	writeUint8(n: number, index: number) {
		this.dv.setUint8(index, n);
		return this;
	}

	writeInt8(n: number, index: number) {
		this.dv.setInt8(index, n);
		return this;
	}

	writeUint16(n: number, index: number) {
		this.dv.setUint16(index, n);
		return this;
	}

	writeInt16(n: number, index: number) {
		this.dv.setInt16(index, n);
		return this;
	}

	writeUint32(n: number, index: number) {
		this.dv.setUint32(index, n);
		return this;
	}

	writeInt32(n: number, index: number) {
		this.dv.setInt32(index, n);
		return this;
	}

	writeFloat32(n: number, index: number) {
		this.dv.setFloat32(index, n);
		return this;
	}

	writeFloat64(n: number, index: number) {
		this.dv.setFloat64(index, n);
		return this;
	}

	writeAngle(n: number, index: number) {
		this.writeInt8(Math.floor((n / Math.PI) * 128), index);
		return this;
	}

	writeText(str: string, index: number) {
		const tmp = encoder.encode(str);
		this.writeUint16(tmp.length, index);
		this.u8a.set(tmp, index + 2);
		return this;
	}
}
