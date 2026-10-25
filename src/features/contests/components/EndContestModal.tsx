import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface EndContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contestName?: string;
}

export const EndContestModal: React.FC<EndContestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contestName = 'the contest',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-black border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-['DM_Sans']">
                  End & Submit Contest?
                </h3>
                <p className="text-xs text-gray-400 font-['DM_Sans']">
                  {contestName}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-6 text-sm text-gray-300 font-['DM_Sans']">
              <p>
                Are you sure you want to end your contest now?
              </p>
              <p className="text-gray-400 text-xs">
                • All your submitted answers and code solutions have been saved.
                <br />
                • Once submitted, you will exit the contest and cannot resume taking it.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 font-['DM_Sans']">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Continue Contest
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-semibold shadow-lg shadow-red-600/20"
              >
                Yes, Submit Contest
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
