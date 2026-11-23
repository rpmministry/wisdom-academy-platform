'use client';

import React, { useEffect, useRef } from 'react';

export interface PazActivityTrackerProps {
  programSlug?: string;
  lessonId?: string;
  classNumber?: number;
  blockNumber?: number;
  isVideoPlaying?: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30000; // cada 30 segundos
const IDLE_THRESHOLD_MS = 120000; // 2 minutos sin interacción = inactivo

export function PazActivityTracker({
  programSlug = 'paz-en-la-mesa',
  lessonId,
  classNumber,
  blockNumber,
  isVideoPlaying = false,
}: PazActivityTrackerProps) {
  const lastInteractionRef = useRef<number>(Date.now());
  const activeSecondsRef = useRef<number>(0);
  const idleSecondsRef = useRef<number>(0);
  const videoSecondsRef = useRef<number>(0);
  const isVideoPlayingRef = useRef<boolean>(isVideoPlaying);

  useEffect(() => {
    isVideoPlayingRef.current = isVideoPlaying;
  }, [isVideoPlaying]);

  useEffect(() => {
    const handleUserActivity = () => {
      lastInteractionRef.current = Date.now();
    };

    // Escuchadores pasivos de interacción real
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Cronómetro de segundo a segundo para discriminar activo / inactivo
    const secondTimer = window.setInterval(() => {
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      if (!isVisible) {
        // Pestaña en segundo plano / oculta: se considera inactiva
        idleSecondsRef.current += 1;
        return;
      }

      const idleDuration = Date.now() - lastInteractionRef.current;
      const isUserActive = idleDuration < IDLE_THRESHOLD_MS;

      if (isUserActive) {
        activeSecondsRef.current += 1;
      } else {
        idleSecondsRef.current += 1;
      }

      if (isVideoPlayingRef.current) {
        videoSecondsRef.current += 1;
      }
    }, 1000);

    // Enviar latido al servidor cada 30 segundos usando fetch nativo con keepalive
    const heartbeatTimer = window.setInterval(() => {
      const activeToSend = activeSecondsRef.current;
      const idleToSend = idleSecondsRef.current;
      const videoToSend = videoSecondsRef.current;

      // Reiniciar acumuladores locales
      activeSecondsRef.current = 0;
      idleSecondsRef.current = 0;
      videoSecondsRef.current = 0;

      if (activeToSend > 0 || videoToSend > 0) {
        fetch('/api/paz/activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            programSlug,
            lessonId,
            classNumber,
            blockNumber,
            activeSeconds: activeToSend,
            idleSeconds: idleToSend,
            videoSeconds: videoToSend,
            isVideoPlaying: isVideoPlayingRef.current,
          }),
        }).catch(() => {
          // Silencioso ante pérdidas temporales de conexión
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.clearInterval(secondTimer);
      window.clearInterval(heartbeatTimer);
    };
  }, [programSlug, lessonId, classNumber, blockNumber]);

  return null;
}

export default PazActivityTracker;
