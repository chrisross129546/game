import { MAX_QUAD_DEPTH } from "../config";
import { Entity } from "./entities/Entity";

export class QuadNode {
	x: number;
	y: number;
	width: number;
	height: number;
	depth: number;
	children: QuadNode[] = [];
	objects: Entity[] = [];
	subNodes = false;

	constructor(
		x: number,
		y: number,
		width: number,
		height: number,
		depth: number,
	) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.depth = depth;
	}

	clear() {
		this.children = [];
		this.objects = [];
		this.subNodes = false;
	}

	insert(entity: Entity) {
		if (this.subNodes) {
			const ex = entity.x - entity.size;
			const ey = entity.y - entity.size;
			const ex2 = entity.x + entity.size;
			const ey2 = entity.y + entity.size;
			for (const child of this.children) {
				if (
					ex >= child.x &&
					ex2 <= child.x + child.width &&
					ey >= child.y &&
					ey2 <= child.y + child.height
				) {
					child.insert(entity);
					return;
				}
			}
			this.objects.push(entity);
		} else if (this.objects.length === 4 && this.depth !== MAX_QUAD_DEPTH) {
			this.subNodes = true;
			this.children = [
				new QuadNode(
					this.x,
					this.y,
					this.width / 2,
					this.height / 2,
					this.depth + 1,
				),
				new QuadNode(
					this.x + this.width / 2,
					this.y,
					this.width / 2,
					this.height / 2,
					this.depth + 1,
				),
				new QuadNode(
					this.x,
					this.y + this.height / 2,
					this.width / 2,
					this.height / 2,
					this.depth + 1,
				),
				new QuadNode(
					this.x + this.width / 2,
					this.y + this.height / 2,
					this.width / 2,
					this.height / 2,
					this.depth + 1,
				),
			];

			const ents = this.objects;
			this.objects = [];

			ents.forEach((e) => this.insert(e));
			this.insert(entity);
		} else {
			this.objects.push(entity);
		}
	}
}
