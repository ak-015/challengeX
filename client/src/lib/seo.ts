/** Best-effort social tags, set client-side. (Link-preview bots do not run JavaScript; see README.) */
export function setSocialMeta(meta: { title: string; description: string; image?: string | null; url?: string }): () => void {
  const created: HTMLMetaElement[] = [];
  const prev = new Map<HTMLMetaElement, string>();
  const set = (attr: 'property' | 'name', key: string, value: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (el) prev.set(el, el.content);
    else {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
      created.push(el);
    }
    el.content = value;
  };
  set('property', 'og:title', meta.title);
  set('property', 'og:description', meta.description);
  set('property', 'og:type', 'website');
  if (meta.url) set('property', 'og:url', meta.url);
  if (meta.image) {
    set('property', 'og:image', meta.image);
    set('name', 'twitter:card', 'summary_large_image');
    set('name', 'twitter:image', meta.image);
  }
  return () => {
    created.forEach((el) => el.remove());
    prev.forEach((v, el) => (el.content = v));
  };
}
