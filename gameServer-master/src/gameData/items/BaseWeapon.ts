import { runAttack } from "../../Physics";
import { ComplexEntity } from "../entities/ComplexEntity";
import { Entity } from "../entities/Entity";
import { BaseItem } from "./BaseItem";

export class BaseWeapon extends BaseItem {
	static damage = 15;
	static cooldown = 300;
	static knockback = 1;
	static range = 65;
	static angle = Math.PI / 2;
	static hit(source: ComplexEntity, target: Entity, dir: number) {
		target.applyKnockBack(dir, this.knockback);
		target.damage(this.damage, source);
	}
	static use(entity: ComplexEntity) {
		runAttack(entity, this);
	}
}
