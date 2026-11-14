export interface ContestSessionScope {
  contestId: string;
  userId: string;
}

export const isContestScopeCurrent = (
  scope: ContestSessionScope | null,
  contestId?: string,
  userId?: string,
): boolean => Boolean(
  scope &&
  contestId &&
  userId &&
  scope.contestId === contestId &&
  scope.userId === userId
);

export const isSessionEndedForScope = (
  endedScope: ContestSessionScope | null,
  contestId?: string,
  userId?: string,
): boolean => isContestScopeCurrent(endedScope, contestId, userId);
