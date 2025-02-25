import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import AuthProvider from '@/context/AuthContext';
import SignIn from '@/pages/auth/signin';
import SignUp from '@/pages/auth/signup';
import Index from '@/pages';
import Feed from '@/pages/feed';
import Vibe from '@/pages/vibe';
import Bookmarks from '@/pages/bookmark';
import Likes from '@/pages/like';
import NotFound from '@/pages/not-found';
import { useIsOnline } from '@/hooks/useIsOnline';
import { toast } from 'sonner';
import { useEffect } from 'react';

function App() {
  const { isOffline, wasOffline } = useIsOnline();

  useEffect(() => {
    if (isOffline) {
      toast.warning(
        'You are currently offline. You can go to your bookmarks to enjoy saved vibes',
        {
          duration: 7500
        }
      );
    }
  }, [isOffline]);

  useEffect(() => {
    if (wasOffline && !isOffline) {
      toast.success(
        'You are back online. All the functionality of Vibes is restored',
        {
          duration: 7500
        }
      );
    }
  }, [wasOffline, isOffline]);

  const authRedirects = [
    {
      from: [
        '/login',
        '/log-in',
        '/signin',
        '/sign-in',
        '/auth',
        '/auth/login',
        '/auth/log-in',
        '/auth/signin'
      ],
      to: '/auth/sign-in'
    },
    {
      from: [
        '/signup',
        '/sign-up',
        '/auth/signup',
        '/auth/sign-up',
        '/register',
        '/auth/register'
      ],
      to: '/auth/create-account'
    },
    {
      from: ['/foryou', '/for-you'],
      to: '/feed'
    },
    {
      from: ['/bookmark', '/saved'],
      to: '/bookmarks'
    },
    {
      from: ['/liked', '/like'],
      to: '/likes'
    }
  ];

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route index element={<Index />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/likes" element={<Likes />} />
          <Route path="/vibe/:id" element={<Vibe />} />

          {/* Authentication redirects */}
          {authRedirects.map(({ from, to }) =>
            from.map((path) => (
              <Route
                key={path}
                path={path}
                element={<Navigate to={to} replace={true} />}
              />
            ))
          )}

          <Route path="/auth/sign-in" element={<SignIn />} />
          <Route path="/auth/create-account" element={<SignUp />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
