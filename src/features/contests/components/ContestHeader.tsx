interface ContestHeaderProps {
  timeRemaining: number;
  progress: number;
  contestName?: string;
  onExit?: () => void;
}

export const ContestHeader = ({ 
  timeRemaining,
  progress,
  contestName = 'Point Blank Recruitment Test 2025',
  onExit,
}: ContestHeaderProps) => {

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getTimeColor = () => {
    if (timeRemaining <= 300) return 'text-red-400'; //5 minutes
    if (timeRemaining <= 900) return 'text-yellow-400'; // 15 minutes
    return 'text-green-400';
  };

  return (
    <div className="w-full bg-black border-b border-gray-700 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white font-['DM_Sans'] flex items-center h-full">{contestName}</h1>
          <div className="flex items-center gap-4">
            <div className="text-right flex flex-col justify-center">
              <div className="text-s text-gray-400 font-['DM_Sans']">Time remaining</div>
              <div className={`text-xl font-['DM_Sans'] font-mono ${getTimeColor()}`}>
                {timeRemaining > 0 ? formatTime(timeRemaining) : 'Time Up!'}
              </div>
            </div>
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-red-500 hover:bg-red-500/20 transition-all font-['DM_Sans'] font-medium"
              >
                Exit Contest
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="w-full bg-green h-1">
        <div 
          className="bg-white h-1 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
