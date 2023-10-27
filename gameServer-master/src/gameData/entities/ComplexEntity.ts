import { BaseController } from "../controllers/BaseController";
import { BaseItem } from "../items/BaseItem";
import { Entity } from "./Entity";

export class ComplexEntity extends Entity {
	controller: BaseController | null = null;
	static items = [BaseItem];
	cooldowns: Map<typeof BaseItem, number> = new Map();
	// @ts-ignore
	items: typeof BaseItem[] = this.constructor.items.toSpliced();
	held = BaseItem;
	wood = 0;
	stone = 0;
	food = 0;
	gold = 0;
	kills = 0;
	usePrimary = false;
	keepPrimary = false;
	useSecondary = false;
	keepSecondary = false;

	spawn(x: number, y: number) {
		super.spawn(x, y);
		// @ts-ignore
		this.items = this.constructor.items.toSpliced();
		this.held = this.items[0];
		this.cooldowns = new Map();
		this.usePrimary = false;
		this.keepPrimary = false;
		this.useSecondary = false;
		this.keepSecondary = false;

		this.kills = 0;
		this.wood = 0;
		this.stone = 0;
		this.food = 100;
		this.gold = 0;
		if (this.controller) {
			this.controller.CSpawn();
		}
	}

	updateGear() {}

	updateResources() {
		if (this.controller) {
			this.controller.CUpdateResources();
		}
	}
	tick(delta: number) {
		super.tick(delta);
		if (this.controller) {
			this.controller.CTick(delta);
		}
		if (this.cooldowns.has(this.held)) {
			//@ts-ignore
			this.cooldowns.set(this.held, this.cooldowns.get(this.held) - delta);
		} else {
			this.cooldowns.set(this.held, 0);
		}

		if (this.usePrimary) {
			this.held.tryUse(this);
		}

		if (this.usePrimary && !this.keepPrimary) {
			this.usePrimary = false;
		}
		if (this.useSecondary && !this.useSecondary) {
			this.keepSecondary = false;
		}
	}
}
