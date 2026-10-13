import { useEffect, useState } from "react";

// True while the on-screen keyboard covers part of the viewport (used to hide bottom tab bars).
export function useVirtualKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setOpen(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", check);
    check();
    return () => vv.removeEventListener("resize", check);
  }, []);
  return open;
}