import { ComplexEntity } from "../entities/ComplexEntity";

export class BaseItem {
	static id = 255;
	static name = this.constructor.name;
	static cooldown = 0;
	static upgrades: (undefined | typeof BaseItem[])[] = [];
	static woodCost = 0;
	static stoneCost = 0;
	static foodCost = 0;
	static goldCost = 0;
	static canUse(entity: ComplexEntity) {
		return true;
	}
	static tryUse(entity: ComplexEntity) {
		if (
			entity.cooldowns.has(this) &&
			// @ts-ignore
			entity.cooldowns.get(this) <= 0 &&
			entity.wood >= this.woodCost &&
			entity.stone >= this.stoneCost &&
			entity.food >= this.foodCost &&
			entity.gold >= this.goldCost &&
			this.canUse(entity)
		) {
			entity.cooldowns.set(this, this.cooldown);
			entity.wood -= this.woodCost;
			entity.gold -= this.goldCost;
			entity.stone -= this.stoneCost;
			entity.food -= this.foodCost;
			this.use(entity);
			entity.updateResources();
		}
	}
	static use(entity: ComplexEntity) {}
}
