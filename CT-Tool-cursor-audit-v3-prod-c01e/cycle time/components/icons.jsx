/* Minimal line-icon set tuned to the industrial UI */
const Icon = ({ name, size = 14, stroke = 1.6, className = "", style = {} }) => {
  const s = { width: size, height: size, ...style };
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style: s,
  };
  const P = (path) => <svg {...common}>{path}</svg>;
  switch (name) {
    case "dashboard": return P(<><rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/></>);
    case "build": return P(<><path d="M3 5h10"/><path d="M3 12h14"/><path d="M3 19h7"/><circle cx="17" cy="5" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="14" cy="19" r="2"/></>);
    case "gantt": return P(<><path d="M4 6h8"/><path d="M7 10h10"/><path d="M10 14h7"/><path d="M5 18h6"/></>);
    case "analytics": return P(<><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20v-4"/><path d="M2 20h22"/></>);
    case "sim": return P(<><circle cx="12" cy="12" r="8"/><path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h4"/><path d="M16 12h4"/><circle cx="12" cy="12" r="2"/></>);
    case "report": return P(<><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7"/><path d="M9 16h5"/></>);
    case "settings": return P(<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.5a7 7 0 0 0-2.1 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.5a7 7 0 0 0 2.1-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></>);
    case "search": return P(<><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>);
    case "bell": return P(<><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 18a2 2 0 0 0 4 0"/></>);
    case "plus": return P(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
    case "export": return P(<><path d="M12 4v12"/><path d="M6 10l6-6 6 6"/><path d="M4 20h16"/></>);
    case "play": return P(<path d="M6 4l14 8-14 8z"/>);
    case "pause": return P(<><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></>);
    case "reset": return P(<><path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/></>);
    case "grip": return P(<><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></>);
    case "alert": return P(<><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></>);
    case "check": return P(<path d="M4 12l5 5L20 6"/>);
    case "chev-down": return P(<path d="M6 9l6 6 6-6"/>);
    case "chev-right": return P(<path d="M9 6l6 6-6 6"/>);
    case "arrow-up": return P(<><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>);
    case "arrow-down": return P(<><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></>);
    case "clock": return P(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
    case "layers": return P(<><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>);
    case "zap": return P(<path d="M13 3L4 14h7l-1 7 9-11h-7z"/>);
    case "cpu": return P(<><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M9 19v3"/><path d="M15 19v3"/><path d="M19 9h3"/><path d="M19 15h3"/><path d="M2 9h3"/><path d="M2 15h3"/></>);
    case "user": return P(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>);
    case "filter": return P(<path d="M3 5h18l-7 9v6l-4-2v-4z"/>);
    case "download": return P(<><path d="M12 3v13"/><path d="M6 11l6 6 6-6"/><path d="M4 21h16"/></>);
    default: return null;
  }
};
window.Icon = Icon;
