import { useEffect, useState, useRef } from "react";

export const useTxTimer = () => {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  const startTimer = () => {
    // first set the timer to zero
    setTimerDuration(0);

    startTimeRef.current = Date.now() - timerDuration;
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  };

  useEffect(() => {
    if (isTimerRunning) {
      const updateTimer = () => {
        if (startTimeRef.current) {
          setTimerDuration(Date.now() - startTimeRef.current);
        }
        frameRef.current = requestAnimationFrame(updateTimer);
      };
      frameRef.current = requestAnimationFrame(updateTimer);

      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
      };
    }
  }, [isTimerRunning]);

  return {
    startTimer,
    stopTimer,
    isTimerRunning,
    timerDuration,
  };
};
