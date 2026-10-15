import React, { useState, useEffect, createContext, useContext } from 'react';

export type AppSurface = 'public' | 'student' | 'admin';

export type StudentRoute =
  | '/dashboard'
  | '/discover'
  | '/programmes'
  | '/matches'
  | '/emails'
  | '/outbox'
  | '/gmail'
  | '/profile'
  | '/settings';

export type AdminRoute =
  | '/admin'
  | '/admin/dashboard'
  | '/admin/students'
  | '/admin/subscriptions'
  | '/admin/discovery-jobs'
  | '/admin/programmes'
  | '/admin/audit-logs'
  | '/admin/settings';

export type PublicRoute =
  | '/'
  | '/features'
  | '/pricing'
  | '/checkout'
  | '/checkout/pending'
  | '/checkout/success'
  | '/terms'
  | '/privacy'
  | '/login';

interface RouterContextType {
  surface: AppSurface;
  path: string;
  navigate: (newPath: string, replace?: boolean) => void;
  setSurface: (surface: AppSurface) => void;
  queryParams: URLSearchParams;
}

const RouterContext = createContext<RouterContextType>({
  surface: 'student',
  path: '/dashboard',
  navigate: () => {},
  setSurface: () => {},
  queryParams: new URLSearchParams(),
});

export function detectSurfaceFromLocation(pathname: string, hostname: string, search: string): AppSurface {
  const params = new URLSearchParams(search);
  const surfaceParam = params.get('surface');
  if (surfaceParam === 'admin') return 'admin';
  if (surfaceParam === 'student' || surfaceParam === 'app') return 'student';
  if (surfaceParam === 'public') return 'public';

  // Check Subdomain
  if (hostname.startsWith('admin.')) return 'admin';
  if (hostname.startsWith('app.')) return 'student';
  if (hostname.includes('adminpath.com') && !hostname.startsWith('admin.') && !hostname.startsWith('app.')) {
    if (pathname.startsWith('/admin')) return 'admin';
    if (['/dashboard', '/discover', '/programmes', '/matches', '/emails', '/outbox', '/gmail', '/profile', '/settings'].some(p => pathname.startsWith(p))) {
      return 'student';
    }
    return 'public';
  }

  // Path Prefix Detection
  if (pathname.startsWith('/admin')) return 'admin';
  if (['/dashboard', '/discover', '/programmes', '/matches', '/emails', '/outbox', '/gmail', '/profile', '/settings'].some(p => pathname.startsWith(p))) {
    return 'student';
  }

  // Root or Public routes
  if (pathname === '/' || pathname === '/pricing' || pathname === '/features' || pathname.startsWith('/checkout') || pathname === '/login' || pathname === '/terms' || pathname === '/privacy') {
    return 'public';
  }

  // Default to student application
  return 'student';
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/dashboard');
  const [queryParams, setQueryParams] = useState<URLSearchParams>(() => new URLSearchParams(window.location.search));
  const [surface, setSurfaceState] = useState<AppSurface>(() =>
    detectSurfaceFromLocation(window.location.pathname, window.location.hostname, window.location.search)
  );

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname || '/';
      setPath(currentPath);
      setQueryParams(new URLSearchParams(window.location.search));
      const detected = detectSurfaceFromLocation(currentPath, window.location.hostname, window.location.search);
      setSurfaceState(detected);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string, replace = false) => {
    const targetUrl = new URL(newPath, window.location.origin);
    const targetPath = targetUrl.pathname;

    if (replace) {
      window.history.replaceState({}, '', newPath);
    } else {
      window.history.pushState({}, '', newPath);
    }

    setPath(targetPath);
    setQueryParams(new URLSearchParams(targetUrl.search));
    const detected = detectSurfaceFromLocation(targetPath, window.location.hostname, targetUrl.search);
    setSurfaceState(detected);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSurface = (newSurface: AppSurface) => {
    setSurfaceState(newSurface);
    if (newSurface === 'public') {
      navigate('/?surface=public');
    } else if (newSurface === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <RouterContext.Provider value={{ surface, path, navigate, setSurface, queryParams }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
