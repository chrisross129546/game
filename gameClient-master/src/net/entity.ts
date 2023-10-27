import Vector from '../util/vector.js';

// todo: ensure the only optional fields on entities are all sent on update (otherwise Required<Entity> will be incorrect)

export const enum EntityType {
    // todo: remove / replace this
    BaseEntity = 0x00,

    Player = 0x01
}

type SharedEntityProperties = {
    // sent on meet
    readonly identifier: number,
    readonly type: number,
    readonly radius: number,
    readonly healthCapacity: number,

    // todo: this should only be on players
    readonly name: string

    // used to decide whether to draw on screen or not
    lastUpdateTick: number,

    // sent on update
    position?: Vector,
    direction?: number,
    health?: number
};

export type BaseEntity = SharedEntityProperties & { readonly type: EntityType.BaseEntity };
export type VisibleBaseEntity = Required<BaseEntity>;

export type PlayerEntity = SharedEntityProperties & {
    // sent on meet
    readonly type: EntityType.Player,
    readonly skin: number,

    // sent on update
    item?: number,
    hat?: number,
    accessory?: number
};

export type VisiblePlayerEntity = Required<PlayerEntity>;

export type Entity = BaseEntity | PlayerEntity;
export type VisibleEntity = VisibleBaseEntity | VisiblePlayerEntity;
