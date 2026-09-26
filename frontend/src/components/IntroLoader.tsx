import { useCallback, useEffect, useRef, useState } from "react";
import "./IntroLoader.css";

const INTRO_DURATION_MS = 6000;
const INTRO_FAILSAFE_MS = 7000;
const CROSSFADE_MS = 1100;

type BackgroundPhase = "intro" | "crossfade" | "static";

function IntroLoader() {
  const [phase, setPhase] = useState<BackgroundPhase>("intro");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number | undefined>(undefined);
  const durationTimer = useRef<number | undefined>(undefined);
  const fadeTimer = useRef<number | undefined>(undefined);
  const failSafeTimer = useRef<number | undefined>(undefined);
  const transitioning = useRef(false);

  const drawVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (video && canvas && context && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Copy nearby floor pixels over the embedded lower-right mark before display.
      context.drawImage(canvas, 1055, 568, 70, 80, 1113, 568, 70, 80);
    }

    animationFrame.current = window.requestAnimationFrame(drawVideoFrame);
  }, []);

  const showImageFallback = useCallback(() => {
    window.clearTimeout(durationTimer.current);
    window.clearTimeout(fadeTimer.current);
    window.clearTimeout(failSafeTimer.current);
    window.cancelAnimationFrame(animationFrame.current ?? 0);
    transitioning.current = true;
    setPhase("static");
  }, []);

  const completeSequence = useCallback(() => {
    window.clearTimeout(durationTimer.current);
    window.clearTimeout(fadeTimer.current);
    window.clearTimeout(failSafeTimer.current);
    window.cancelAnimationFrame(animationFrame.current ?? 0);
    setPhase("static");
  }, []);

  const beginCrossfade = useCallback(() => {
    if (transitioning.current) return;
    transitioning.current = true;
    window.clearTimeout(durationTimer.current);
    setPhase("crossfade");
    fadeTimer.current = window.setTimeout(completeSequence, CROSSFADE_MS);
  }, [completeSequence]);

  useEffect(() => {
    if (phase !== "intro") return;

    failSafeTimer.current = window.setTimeout(showImageFallback, INTRO_FAILSAFE_MS);
    const video = videoRef.current;
    let effectIsActive = true;

    if (video) {
      video.muted = true;
      video.volume = 0;
      video.play().catch((error: unknown) => {
        if (!effectIsActive) return;
        console.warn("UrbanForma background video autoplay failed:", error);
        showImageFallback();
      });
    }

    return () => {
      effectIsActive = false;
      window.clearTimeout(failSafeTimer.current);
    };
  }, [phase, showImageFallback]);

  useEffect(() => () => {
    videoRef.current?.pause();
    window.cancelAnimationFrame(animationFrame.current ?? 0);
    window.clearTimeout(durationTimer.current);
    window.clearTimeout(fadeTimer.current);
    window.clearTimeout(failSafeTimer.current);
  }, []);

  return (
    <div className="background-container" aria-hidden="true">
      <img className="background-image" src="/intro-final-frame.png" alt="" fetchPriority="high" />
      {phase !== "static" && (
        <video
          ref={videoRef}
          className={`background-video${phase === "crossfade" ? " background-video--hidden" : ""}`}
          src="/intro-video.mp4"
          poster="/intro-final-frame.png"
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlay={() => {
            window.clearTimeout(failSafeTimer.current);
          }}
          onLoadedData={() => console.info("UrbanForma video loaded")}
          onCanPlay={() => console.info("UrbanForma video can play")}
          onPlaying={() => {
            console.info("UrbanForma background video PLAYING");
            if (!animationFrame.current) {
              animationFrame.current = window.requestAnimationFrame(drawVideoFrame);
            }
            if (!durationTimer.current) {
              durationTimer.current = window.setTimeout(beginCrossfade, INTRO_DURATION_MS);
            }
          }}
          onEnded={() => {
            console.info("UrbanForma video ended");
            beginCrossfade();
          }}
          onError={(event) => {
            console.error("UrbanForma background video error:", event.currentTarget.error);
            showImageFallback();
          }}
        />
      )}
      {phase !== "static" && (
        <canvas
          ref={canvasRef}
          className={`background-video-canvas${phase === "crossfade" ? " background-video--hidden" : ""}`}
        />
      )}
      <div className="background-readability" />
    </div>
  );
}

export default IntroLoader;
