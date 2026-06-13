import { useState, useEffect, useRef } from "react";
import StageCard from "./StageCard.jsx";

export default function StageCarousel({ cards }) {
  const [rotation, setRotation] = useState(0);
  const [angle, setAngle] = useState(0);
  const [radius, setRadius] = useState(0);
  const [autoTurnEnabled, setAutoTurnEnabled] = useState(true);
  const wheelRef = useRef(null);

  // 1️⃣ Geometry effect (angle + radius)
  useEffect(() => {
    function recalc() {
      const N = cards.length;
      const cardWidth = wheelRef.current?.offsetWidth || 1000;

      const newAngle = 360 / N;
      const newRadius = cardWidth / (2 * Math.tan(Math.PI / N));

      setAngle(newAngle);
      setRadius(newRadius);
    }

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [cards.length]);

  // 2️⃣ Auto-turn effect (separate!)
 useEffect(() => {
  if (!autoTurnEnabled || angle === 0) return;

  const interval = setInterval(() => {
    goNextAuto();
  }, 7000);

  return () => clearInterval(interval);
}, [angle, autoTurnEnabled]);

function goNextUser() {
  setAutoTurnEnabled(false);
  setRotation((prev) => prev - angle);
}

function goPrevUser() {
  setAutoTurnEnabled(false);
  setRotation((prev) => prev + angle);
}

function goNextAuto() {
  setRotation((prev) => prev - angle);
}

  return (
    <div className="stage-carousel">
      <button className="carousel-arrow left" onClick={goPrevUser}>‹</button>
      <button className="carousel-arrow right" onClick={goNextUser}>›</button>

      <div className="carousel-window">
        <div
          className="wheel"
          ref={wheelRef}
          style={{
            transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`
          }}
        >
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="wheel-card"
              style={{
                transform: `
                  rotateY(${i * angle}deg)
                  translateZ(${radius}px)
                `
              }}
            >
              <StageCard card={card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
