const PI2 = Math.PI / 2;

const encoder = new TextEncoder();

export class Packet {
	index = 0;
	len = 32;
	ab = new ArrayBuffer(this.len);
	dv = new DataView(this.ab);
	u8a = new Uint8Array(this.ab);

	constructor(id?: number) {
		if (id !== undefined) {
			this.writeUint8(id);
		}
	}

	expand(len: number) {
		if (this.index + len > this.len) {
			this.len = 2 * this.len;
			const ab = new ArrayBuffer(this.len);
			const u8a = new Uint8Array(ab);
			u8a.set(this.u8a);
			this.ab = ab;
			this.u8a = u8a;
			this.dv = new DataView(ab);
		}
	}

	writeUint8(n: number) {
		this.expand(1);
		this.dv.setUint8(this.index, n);
		this.index++;
		return this;
	}

	writeInt8(n: number) {
		this.expand(1);
		this.dv.setInt8(this.index, n);
		this.index++;
		return this;
	}

	writeUint16(n: number) {
		this.expand(2);
		this.dv.setUint16(this.index, n);
		this.index += 2;
		return this;
	}

	writeInt16(n: number) {
		this.expand(2);
		this.dv.setInt16(this.index, n);
		this.index += 2;
		return this;
	}

	writeUint32(n: number) {
		this.expand(4);
		this.dv.setUint32(this.index, n);
		this.index += 4;
		return this;
	}

	writeInt32(n: number) {
		this.expand(4);
		this.dv.setInt32(this.index, n);
		this.index += 4;
		return this;
	}

	writeFloat32(n: number) {
		this.expand(4);
		this.dv.setFloat32(this.index, n);
		this.index += 4;
		return this;
	}

	writeFloat64(n: number) {
		this.expand(8);
		this.dv.setFloat64(this.index, n);
		this.index += 8;
		return this;
	}

	writeAngle(n: number) {
		this.writeInt8(Math.floor((n / Math.PI) * 128));
		return this;
	}

	writeText(str: string) {
		const tmp = encoder.encode(str);
		this.writeUint16(tmp.length);
		this.expand(tmp.length);
		this.u8a.set(tmp, this.index);
		this.index += tmp.length;
		return this;
	}

	appendBuffer(buffer: ArrayBuffer) {
		this.expand(buffer.byteLength);
		this.u8a.set(new Uint8Array(buffer), this.index);
		this.index += buffer.byteLength;
		return this;
	}

	get buffer() {
		return this.ab.slice(0, this.index);
	}
}
