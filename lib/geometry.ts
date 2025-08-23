export type Vec2 = { x: number; y: number };
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
