import { useState, useEffect, useMemo } from 'react';
import type { LeaderboardEntry, Contest } from '../problem.types';
import { contestApi } from '@/services/api/contestApi';
import { useAuth } from '@/lib/AuthContext';

export const useLeaderboard = (contestId: string) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(true);
  const currentUserId = user?.uid;

  useEffect(() => {
    if (!contestId) {
      setLeaderboard([]);
      setContest(null);
      setIsLoading(false);
      setError(null);
      setHasStarted(true);
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch contest details first to verify contest timing & status
        const contestData = await contestApi.getContestById(contestId);
        if (!contestData) {
          setError('Contest not found');
          setContest(null);
          setIsLoading(false);
          return;
        }

        setContest(contestData);

        const now = Date.now();
        if (contestData.start_time && now < contestData.start_time) {
          setHasStarted(false);
          setLeaderboard([]);
          setIsLoading(false);
          return;
        }

        setHasStarted(true);
        const leaderboardData = await contestApi.getContestLeaderboard(contestId);
        setLeaderboard(leaderboardData);
      } catch (err: any) {
        const errorResponse = err?.response?.data?.error;
        const status = err?.response?.status;
        if (
          status === 403 &&
          (errorResponse === 'contest has not started yet' ||
            errorResponse === 'contest is not running' ||
            (typeof errorResponse === 'string' && errorResponse.toLowerCase().includes('not started')))
        ) {
          setHasStarted(false);
          setLeaderboard([]);
        } else {
          setError(errorResponse || (err instanceof Error ? err.message : 'Failed to fetch leaderboard'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [contestId]);

  const currentUserRank = useMemo(() => {
    return leaderboard.find((entry) => entry.user_id === currentUserId);
  }, [leaderboard, currentUserId]);

  return {
    leaderboard,
    contest,
    currentUserRank,
    isLoading,
    error,
    hasStarted,
    totalParticipants: leaderboard.length,
  };
};
