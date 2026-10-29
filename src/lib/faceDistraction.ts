export interface FacePoseForDistraction {
  yaw: number
  pitch: number
}

/**
 * Only horizontal head rotation can trigger distraction.
 * Pitch is intentionally accepted as input but never participates in this rule,
 * so looking down cannot start or extend the distraction grace period.
 */
export function isSideLooking(
  pose: FacePoseForDistraction,
  baselineYaw: number,
  yawThreshold: number,
): boolean {
  return Math.abs(pose.yaw - baselineYaw) >= yawThreshold
}

