import { ComplexEntity } from "../entities/ComplexEntity";
import { BaseItem } from "./BaseItem";

export class BaseFood extends BaseItem {
	static heal = 15;
	static foodCost = 10;
	static canUse(entity: ComplexEntity) {
		return entity.hp < entity.maxHP;
	}
	static use(entity: ComplexEntity) {
		entity.damage(-this.heal, entity);
		entity.held = entity.items[0];
		entity.updateGear();
	}
}
