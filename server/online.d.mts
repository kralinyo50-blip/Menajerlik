import type { IncomingMessage, ServerResponse } from 'node:http';
export function createOnlineApi(options?: { dataFile?: string; now?: () => number; autoTick?: boolean }): ((req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>) & { close: () => void };
export function makeFixture(ids: string[]): { week: number; homeId: string; awayId: string; homeScore: number | null; awayScore: number | null }[];
