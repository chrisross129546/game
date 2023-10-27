// todo: eventually, some of the stuff in here should be made configurable and moved to in-game settings / local storage
export const IS_LITTLE_ENDIAN_PROTOCOL = false;

const SERVER_PROTOCOL = 'ws';
const SERVER_HOST = 'localhost';
const SERVER_PATH = 'socket';
const SERVER_PORT = 8080;

export const SERVER_URL = `${SERVER_PROTOCOL}://${SERVER_HOST}:${SERVER_PORT}/${SERVER_PATH}` as const;

// in ms
export const CONNECTION_TIMEOUT = 10_000;
export const PING_RATE = 500;

// across 10 seconds
export const LATENCY_SAMPLE_SIZE = 10_000 / PING_RATE;

// todo: change if this gets updated later
const TICK_RATE = 1000 / 30;

// across 10 seconds
export const TICK_RATE_SAMPLE_SIZE = 10_000 / TICK_RATE;

// only for diagnostics so far
export const MAX_PLAYER_COUNT = 50;

export const PALETTE = {

} as const;
