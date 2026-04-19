import React from "react";

export default function Icon({ name, size = 14, stroke = 1.6, className = "", style = {} }) {
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
  switch (name) {
    case "dashboard":
      return (<svg {...common}><rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/></svg>);
    case "build":
      return (<svg {...common}><path d="M3 5h10"/><path d="M3 12h14"/><path d="M3 19h7"/><circle cx="17" cy="5" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="14" cy="19" r="2"/></svg>);
    case "gantt":
      return (<svg {...common}><path d="M4 6h8"/><path d="M7 10h10"/><path d="M10 14h7"/><path d="M5 18h6"/></svg>);
    case "analytics":
      return (<svg {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20v-4"/><path d="M2 20h22"/></svg>);
    case "sim":
      return (<svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h4"/><path d="M16 12h4"/><circle cx="12" cy="12" r="2"/></svg>);
    case "report":
      return (<svg {...common}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7"/><path d="M9 16h5"/></svg>);
    case "settings":
      return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.5a7 7 0 0 0-2.1 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.5a7 7 0 0 0 2.1-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>);
    case "search":
      return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>);
    case "bell":
      return (<svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 18a2 2 0 0 0 4 0"/></svg>);
    case "plus":
      return (<svg {...common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>);
    case "minus":
      return (<svg {...common}><path d="M5 12h14"/></svg>);
    case "export":
      return (<svg {...common}><path d="M12 4v12"/><path d="M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>);
    case "play":
      return (<svg {...common}><path d="M6 4l14 8-14 8z"/></svg>);
    case "pause":
      return (<svg {...common}><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>);
    case "reset":
      return (<svg {...common}><path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/></svg>);
    case "grip":
      return (<svg {...common}><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>);
    case "alert":
      return (<svg {...common}><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>);
    case "check":
      return (<svg {...common}><path d="M4 12l5 5L20 6"/></svg>);
    case "chev-down":
      return (<svg {...common}><path d="M6 9l6 6 6-6"/></svg>);
    case "chev-right":
      return (<svg {...common}><path d="M9 6l6 6-6 6"/></svg>);
    case "chev-left":
      return (<svg {...common}><path d="M15 6l-6 6 6 6"/></svg>);
    case "arrow-up":
      return (<svg {...common}><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>);
    case "arrow-down":
      return (<svg {...common}><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>);
    case "clock":
      return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case "layers":
      return (<svg {...common}><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></svg>);
    case "zap":
      return (<svg {...common}><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></svg>);
    case "cpu":
      return (<svg {...common}><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M9 19v3"/><path d="M15 19v3"/><path d="M19 9h3"/><path d="M19 15h3"/><path d="M2 9h3"/><path d="M2 15h3"/></svg>);
    case "user":
      return (<svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>);
    case "filter":
      return (<svg {...common}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>);
    case "download":
      return (<svg {...common}><path d="M12 3v13"/><path d="M6 11l6 6 6-6"/><path d="M4 21h16"/></svg>);
    case "upload":
      return (<svg {...common}><path d="M12 21V8"/><path d="M6 14l6-6 6 6"/><path d="M4 3h16"/></svg>);
    case "trash":
      return (<svg {...common}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7v13h12V7"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>);
    case "copy":
      return (<svg {...common}><rect x="9" y="9" width="12" height="12" rx="1"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>);
    case "link":
      return (<svg {...common}><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41"/></svg>);
    case "save":
      return (<svg {...common}><path d="M5 3h11l3 3v15H5z"/><path d="M7 3v7h9V3"/><rect x="7" y="14" width="10" height="7"/></svg>);
    case "history":
      return (<svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l4 2"/></svg>);
    case "shuffle":
      return (<svg {...common}><path d="M16 3h5v5"/><path d="M4 20l17-17"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>);
    case "flame":
      return (<svg {...common}><path d="M12 2s4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 2-4-1-3 2-5 2-5z"/></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="2"/></svg>);
  }
}
