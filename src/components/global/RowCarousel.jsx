import React, { useRef } from "react";

export default function RowCarousel({ title, children }) {
  const scrollRef = useRef(null);

  function scrollLeft() {
    scrollRef.current.scrollBy({ left: -400, behavior: "smooth" });
  }

  function scrollRight() {
    scrollRef.current.scrollBy({ left: 400, behavior: "smooth" });
  }

  return (
    <section className="row-carousel">
      {title && (
        <div className="row-header">
          <h2>{title}</h2>
        </div>
      )}

      <div className="row-wrapper">
        <button className="row-arrow left" onClick={scrollLeft}>‹</button>

        <div className="row-scroll" ref={scrollRef}>
          {children}
        </div>

        <button className="row-arrow right" onClick={scrollRight}>›</button>
      </div>
    </section>
  );
}
