import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll + zoom for wide charts. Uses CSS transform scale + explicit spacer
 * so the scroll region grows with zoom (avoids `zoom` shrinking content to a corner).
 */
export default function ChartZoomWrap({ children, title = "Chart" }) {
  const outerRef = useRef(null);
  const contentRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const drag = useRef({ on: false, x: 0, y: 0, sl: 0, st: 0 });

  const clamp = (z) => Math.min(2.5, Math.max(0.45, Math.round(z * 100) / 100));

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setDims({ w, h });
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [children]);

  const onWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => clamp(z + delta));
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = outerRef.current;
    if (!el) return;
    drag.current = { on: true, x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.setPointerCapture?.(e.pointerId);
    el.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (!d.on) return;
    const el = outerRef.current;
    if (!el) return;
    el.scrollLeft = d.sl - (e.clientX - d.x);
    el.scrollTop = d.st - (e.clientY - d.y);
  }, []);

  const onPointerUp = useCallback((e) => {
    drag.current.on = false;
    const el = outerRef.current;
    if (el) el.style.cursor = zoom > 1.02 ? "grab" : "default";
    try {
      if (e?.pointerId != null) el?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }, [zoom]);

  const zw = Math.max(1, dims.w * zoom);
  const zh = Math.max(1, dims.h * zoom);

  return (
    <div className="chart-zoom-wrap">
      <div className="chart-zoom-toolbar" role="toolbar" aria-label={`${title} zoom`}>
        <span className="mono" style={{ fontSize: 11 }}>Zoom {(zoom * 100).toFixed(0)}%</span>
        <input
          type="range"
          min={45}
          max={250}
          step={5}
          value={Math.round(zoom * 100)}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          aria-label={`${title} zoom level`}
        />
        <button type="button" className="btn xs" onClick={() => setZoom(1)}>
          Reset
        </button>
        <span className="mono muted" style={{ fontSize: 10, marginLeft: "auto" }}>
          Ctrl+wheel · drag to pan
        </span>
      </div>
      <div
        ref={outerRef}
        className="chart-zoom-scroll"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > 1.02 ? "grab" : "default" }}
      >
        <div
          className="chart-zoom-spacer"
          style={{
            width: zw,
            height: zh,
            position: "relative",
            minWidth: "100%",
          }}
        >
          <div
            ref={contentRef}
            className="chart-zoom-inner"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
