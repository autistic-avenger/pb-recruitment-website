import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ContestHeader } from '../components/ContestHeader';
import { useContest } from '../hooks/useContest';

export const ContestLayout = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const hasExitedRef = useRef(false);

  const { contest, isLoading: isContestLoading } = useContest(contestId || '');
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard');

  useEffect(() => {
    hasExitedRef.current = false;
  }, [contestId]);

  useEffect(() => {
    if (!contest) return;

    const checkAndExitIfEnded = () => {
      const now = Date.now();
      const endTime = contest.end_time;
      const startTime = contest.start_time;
      const totalDuration = endTime - startTime;

      // If contest is over and user is in contest problems/testing area
      if (now >= endTime) {
        setTimeRemaining(0);
        setProgress(100);

        if (!hasExitedRef.current && !isLeaderboardPage) {
          hasExitedRef.current = true;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          toast.info("Time is up! The contest has ended.");
          navigate(`/contest/${contestId}`, { replace: true });
        }
        return true;
      }

      // If contest hasn't started yet and user is in problem/test area
      if (now < startTime) {
        setTimeRemaining(Math.max(0, Math.floor((endTime - now) / 1000)));
        setProgress(0);

        if (!hasExitedRef.current && !isLeaderboardPage) {
          hasExitedRef.current = true;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          toast.info("The contest has not started yet.");
          navigate(`/contest/${contestId}`, { replace: true });
        }
        return true;
      }

      const remaining = Math.floor((endTime - now) / 1000); // in seconds
      const elapsed = now - startTime;
      const progressPercentage = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

      setTimeRemaining(Math.max(0, remaining));
      setProgress(Math.min(100, Math.max(0, progressPercentage)));
      return false;
    };

    // Run check immediately
    const exited = checkAndExitIfEnded();
    if (exited) return;

    const interval = setInterval(checkAndExitIfEnded, 1000);

    return () => clearInterval(interval);
  }, [contest, contestId, isLeaderboardPage, navigate]);

  const handleManualExit = () => {
    if (window.confirm("Are you sure you want to exit the contest?")) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate(`/contest/${contestId}`, { replace: true });
    }
  };

  if (!contestId) {
    return (
      <div className="w-full bg-black min-h-screen flex flex-col">
        <ContestHeader 
          timeRemaining={0}
          progress={0}
          contestName="Invalid Contest"
        />
        <div className="px-6 py-6">
          <div className="text-red-400">Invalid contest ID</div>
        </div>
      </div>
    );
  }

  if (isContestLoading) {
    return (
      <div className="w-full bg-black min-h-screen flex flex-col">
        <ContestHeader 
          timeRemaining={0}
          progress={0}
          contestName="Loading..."
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading contest...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen flex flex-col">
      <ContestHeader 
        timeRemaining={timeRemaining}
        progress={progress}
        contestName={contest?.name || 'Contest'}
        onExit={!isLeaderboardPage ? handleManualExit : undefined}
      />
      
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
