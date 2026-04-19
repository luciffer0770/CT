import React, { useEffect, useState } from "react";

export default function OnlineIndicator() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: "fixed", left: "50%", bottom: 40, transform: "translateX(-50%)",
      background: "#F59E0B", color: "#411900", padding: "6px 14px",
      borderRadius: 3, fontSize: 12, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 500, fontFamily: "system-ui",
    }}>
      OFFLINE — your changes are still saved to this browser. Nothing syncs to a server.
    </div>
  );
}
