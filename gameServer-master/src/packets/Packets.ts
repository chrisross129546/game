// client bound packet ids
export enum CBPacketIds {
	Pong = 0,
	RemoveEntity = 1,
	Init = 2,
	Spawn = 3,
	MeetEntities = 4,
	Update = 5,
	Chat = 6,
	UpdateResources = 7,
}

// server bound packet ids
export enum SBPacketIds {
	Ping = 0,
	Spawn = 1,
	Input = 2,
	Chat = 3,
	Equip = 4,
}
