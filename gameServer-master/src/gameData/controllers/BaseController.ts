import { ComplexEntity } from "../entities/ComplexEntity";

export class BaseController {
	entity: ComplexEntity;
	eid: number;
	constructor(entity: ComplexEntity) {
		this.entity = entity;
		this.eid = entity.id;
		entity.controller = this;
	}
	CUpdateResources() {}
	CTick(delta: number) {}
	CSpawn() {}
}
