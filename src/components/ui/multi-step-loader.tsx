"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";

const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={cn("w-6 h-6", className)}
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
};

const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

type LoadingState = {
  text: string;
};

const LoaderCore = ({
  loadingStates,
  value = 0,
}: {
  loadingStates: LoadingState[];
  value?: number;
}) => {
  return (
    <div className="flex relative justify-start max-w-2xl mx-auto flex-col mt-40 px-4">
      <motion.div className="mb-12 w-full">
        <div className="h-1 bg-indigo-200/30 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-indigo-300/40 dark:border-white/20">
          <motion.div
            className="h-full bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 dark:from-indigo-400 dark:via-blue-400 dark:to-indigo-500"
            initial={{ width: "0%" }}
            animate={{ width: `${((value + 1) / loadingStates.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <motion.div
          className="text-xs font-medium text-indigo-700/80 dark:text-white/60 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Step {value + 1} of {loadingStates.length}
        </motion.div>
      </motion.div>

      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.25, 0.3);
        const isActive = index === value;
        const isCompleted = index < value;
        const isUpcoming = index > value;

        return (
          <motion.div
            key={index}
            className={cn(
              "text-left flex items-center gap-4 mb-8 px-6 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden group",
              isActive && "bg-gradient-to-r from-indigo-400/30 via-blue-400/20 to-indigo-500/30 dark:from-indigo-400/15 dark:via-blue-400/10 dark:to-indigo-400/15 backdrop-blur-xl border border-indigo-400/40 dark:border-indigo-500/30 shadow-2xl shadow-indigo-500/20",
              isCompleted && "opacity-70 bg-indigo-100/20 dark:bg-white/5 backdrop-blur-sm border border-indigo-200/30 dark:border-white/10",
              isUpcoming && "opacity-50 bg-indigo-50/10 dark:bg-white/5 backdrop-blur-sm border border-indigo-200/20 dark:border-white/10"
            )}
            initial={{ opacity: 0, x: -30, y: 10 }}
            animate={{ 
              opacity: opacity, 
              x: 0,
              y: 0,
              scale: isActive ? 1.02 : 1
            }}
            transition={{ 
              duration: 0.6, 
              delay: index * 0.05,
              ease: "easeOut" 
            }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/20 dark:via-white/10 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}

            {/* Icon container with enhanced animations */}
            <div className="relative flex-shrink-0">
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative"
                >
                  <CheckFilled className="text-indigo-600 dark:text-indigo-400 drop-shadow-lg" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-indigo-500/30 dark:bg-indigo-400/30"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.8, 0, 0.8],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}
              {isActive && (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative"
                >
                  <CheckFilled className="text-indigo-600 dark:text-indigo-400 drop-shadow-lg" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-indigo-500/30 dark:bg-indigo-400/30"
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-500/50 dark:border-indigo-400/50"
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}
              {!isActive && !isCompleted && (
                <motion.div
                  animate={{
                    scale: isUpcoming ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <CheckIcon className={cn(
                    "text-indigo-300 dark:text-slate-500 transition-colors duration-300",
                    isUpcoming && "text-indigo-400 dark:text-slate-400"
                  )} />
                </motion.div>
              )}
            </div>

            {/* Text content with enhanced styling */}
            <div className="flex-1 relative z-10">
              <motion.span
                className={cn(
                  "text-base font-medium transition-all duration-300 block",
                  isActive && "text-indigo-900 dark:text-white font-semibold text-lg",
                  isCompleted && "text-indigo-600 dark:text-indigo-400",
                  !isActive && !isCompleted && "text-indigo-500 dark:text-slate-400"
                )}
                animate={{
                  letterSpacing: isActive ? "0.5px" : "0px",
                }}
                transition={{ duration: 0.3 }}
              >
                {loadingState.text}
              </motion.span>
              {isActive && (
                <motion.div
                  className="h-0.5 bg-gradient-to-r from-indigo-500 to-transparent dark:from-indigo-400 mt-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              )}
            </div>

            <motion.div
              className="relative flex-shrink-0"
              animate={{
                scale: isActive ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                isActive && "bg-indigo-600 dark:bg-indigo-400 shadow-lg shadow-indigo-500/50",
                isCompleted && "bg-indigo-600 dark:bg-indigo-400",
                !isActive && !isCompleted && "bg-indigo-300/50 dark:bg-slate-500/30"
              )} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
}) => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, loading, loop, loadingStates.length, duration]);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="w-full fixed left-0 right-0 bottom-0 z-[40] flex items-center justify-center"
          style={{ height: 'calc(100vh)' }}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-indigo-100 dark:from-slate-950/98 dark:via-indigo-950/95 dark:to-slate-950/98 backdrop-blur-2xl"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-indigo-600/25 rounded-full blur-3xl"
              animate={{
                x: [0, 120, -60, 0],
                y: [0, 80, -40, 0],
                scale: [1, 1.3, 1.1, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/25 via-blue-500/20 to-indigo-700/30 rounded-full blur-3xl"
              animate={{
                x: [0, -100, 50, 0],
                y: [0, -80, 40, 0],
                scale: [1, 1.2, 1.15, 1],
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
            <motion.div
              className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-gradient-to-br from-blue-400/20 to-indigo-400/25 rounded-full blur-3xl"
              animate={{
                x: [0, 80, -80, 0],
                y: [0, -60, 60, 0],
                scale: [1, 1.15, 1.05, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-indigo-400/40 dark:bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -200, 0],
                  x: [0, Math.random() * 100 - 50, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Main loader content */}
          <div className="h-auto relative z-10">
            <LoaderCore value={currentState} loadingStates={loadingStates} />
          </div>

          <motion.div 
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-indigo-100/80 dark:from-slate-950/95 via-transparent to-transparent pointer-events-none"
            animate={{
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
