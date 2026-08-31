type Route = { path: string; render: (root: HTMLElement, params: URLSearchParams) => void | Promise<void> };

export function startRouter(routes: Route[], root: HTMLElement, onRendered: () => void) {
  const resolve = async () => {
    const [path, query] = location.hash.slice(1).split('?');
    const route = routes.find((r) => r.path === (path || '/')) ?? routes[0];
    await route.render(root, new URLSearchParams(query));
    onRendered();
  };
  window.addEventListener('hashchange', resolve);
  resolve();
}
