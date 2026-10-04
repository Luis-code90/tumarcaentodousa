import { useEffect } from "react";

// Keeps admin screens out of search results (belt and braces with robots.txt).
export function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    tag.setAttribute("content", "noindex, nofollow");
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);
}
