import { MAP_SIZE } from "./config";
import { HALF_MAP } from "./consts";

export const getSpawnCoord = () => {
	return Math.random() * MAP_SIZE - HALF_MAP;
};
