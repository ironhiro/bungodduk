export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
