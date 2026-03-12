import { ReaderProgressRecord } from "../../../../../platform/shared/src/reader/schema";

export function pickResumeProgress(
  localProgress: ReaderProgressRecord | undefined,
  remoteProgress: ReaderProgressRecord | undefined,
): ReaderProgressRecord | undefined {
  if (!localProgress) {
    return remoteProgress;
  }
  if (!remoteProgress) {
    return localProgress;
  }

  const localTs = new Date(localProgress.updatedAt).getTime();
  const remoteTs = new Date(remoteProgress.updatedAt).getTime();

  if (localTs === remoteTs) {
    return localProgress.progressPercent >= remoteProgress.progressPercent
      ? localProgress
      : remoteProgress;
  }

  return localTs >= remoteTs ? localProgress : remoteProgress;
}

export function shouldSyncProgress(
  previous: ReaderProgressRecord | undefined,
  next: ReaderProgressRecord,
): boolean {
  if (!previous) {
    return true;
  }

  const delta = Math.abs(next.progressPercent - previous.progressPercent);
  return delta >= 1 || next.positionKey !== previous.positionKey;
}
