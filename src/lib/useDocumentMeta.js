import { useEffect } from "react";

// Updates document.title and <meta name="description"> per route. No
// external dependency (react-helmet-async etc.) — with 3 fixed routes and
// no SSR, directly touching two DOM nodes is simpler than pulling in a
// library built around a context provider.
//
// Caveat: this only helps Google (Googlebot executes JS before indexing).
// It does NOT change what WhatsApp/Instagram/Facebook show in link-preview
// cards — those bots read only the static Open Graph tags in index.html,
// which are the same regardless of route. Differentiating the share
// preview per section would require prerendering, which is deferred (see
// the project plan) until hosting + an admin-panel refresh strategy are
// decided.
export function useDocumentMeta({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
