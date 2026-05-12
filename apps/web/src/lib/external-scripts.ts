const loadedScripts = new Map<string, Promise<void>>();

type WindowWithGlobals = Window & typeof globalThis & Record<string, unknown>;

export async function loadWindowGlobal<T>(src: string, globalName: string): Promise<T> {
  const existing = (window as WindowWithGlobals)[globalName];
  if (existing) return existing as T;

  let loadPromise = loadedScripts.get(src);
  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    loadedScripts.set(src, loadPromise);
  }

  await loadPromise;

  const loaded = (window as WindowWithGlobals)[globalName];
  if (!loaded) {
    throw new Error(`${globalName} did not register on window`);
  }
  return loaded as T;
}
