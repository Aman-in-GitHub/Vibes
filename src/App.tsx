import 'tldraw/tldraw.css';
import { Tldraw } from 'tldraw';
import { Navigate, Route, Routes } from 'react-router';
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
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dexie';
import { PostType } from '@/components/Posts';
import useAuth from '@/hooks/useAuth';
import { useUserStore } from '@/context/UserStore';
import { useColorStore } from '@/context/ColorStore';
import { getRandomColor } from '@/utils';
import { isMobile } from 'react-device-detect';

async function syncLocalDatabaseWithSupabase() {
  const setUser = useUserStore.getState().setUser;
  const clearUser = useUserStore.getState().clearUser;
  const clearColor = useColorStore.getState().clearColor;

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return;
    }

    const userId = user.id;
    const localUser = await db.users.get(userId);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', userId)
      .single();

    const isReadPostsSame =
      localUser?.readPosts.length === profileData?.read_posts.length;
    const isScrollPostsSame =
      localUser?.scrolledPosts.length === profileData?.scrolled_posts.length;

    if (
      !localUser ||
      userId !== localUser?.id ||
      !isReadPostsSame ||
      !isScrollPostsSame
    ) {
      if (profileError) {
        console.error('Error fetching profile from Supabase:', profileError);
        throw profileError;
      }

      if (!profileData) {
        return;
      }

      await db.users.clear();
      clearUser();
      clearColor();

      const localUser = {
        id: profileData.auth_id,
        name: profileData.name,
        email: profileData.email,
        age: profileData.age,
        sex: profileData.sex,
        avatarUrl: profileData.avatar_url,
        isNsfw: profileData.is_nsfw,
        scrolledPosts: profileData.scrolled_posts || [],
        readPosts: profileData.read_posts || []
      };

      await db.users.put(localUser);
      setUser(localUser);

      toast.info('Synced your profile with the database');
    }

    const { data: supabaseBookmarks, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select(
        `
        id,
        added_at,
        post_id,
        user_id,
        post:posts!inner(*)
      `
      )
      .eq('user_id', userId);

    if (bookmarkError) {
      console.error('Error fetching bookmarks from Supabase:', bookmarkError);
      throw bookmarkError;
    }

    const localBookmarks = await db.bookmarks.toArray();
    const localBookmarkIds = new Set(localBookmarks.map((b) => b.id));
    const supabaseBookmarkIds = new Set(
      supabaseBookmarks?.map((b) => b.id) || []
    );

    if (
      localBookmarks.length !== supabaseBookmarks?.length ||
      ![...supabaseBookmarkIds].every((id) => localBookmarkIds.has(id))
    ) {
      await db.bookmarks.clear();
      const formattedBookmarks = supabaseBookmarks.map((bookmark: any) => ({
        id: bookmark.id,
        userId: bookmark.user_id as string,
        postId: bookmark.post_id as string,
        vibe: bookmark.post as PostType,
        createdAt: bookmark.added_at as string
      }));

      await db.bookmarks.bulkPut(formattedBookmarks);
      toast.info('Synced your bookmarks with the database');
    }

    const { data: supabaseLikes, error: likeError } = await supabase
      .from('likes')
      .select(
        `
        id,
        added_at,
        post_id,
        user_id,
        post:posts!inner(*)
      `
      )
      .eq('user_id', userId);

    if (likeError) {
      console.error('Error fetching likes from Supabase:', likeError);
      throw likeError;
    }

    const localLikes = await db.likes.toArray();
    const localLikeIds = new Set(localLikes.map((l) => l.id));
    const supabaseLikeIds = new Set(supabaseLikes?.map((l) => l.id) || []);

    if (
      localLikes.length !== supabaseLikes?.length ||
      ![...supabaseLikeIds].every((id) => localLikeIds.has(id))
    ) {
      await db.likes.clear();
      const formattedLikes = supabaseLikes.map((like: any) => ({
        id: like.id,
        userId: like.user_id as string,
        postId: like.post_id as string,
        vibe: like.post as PostType,
        createdAt: like.added_at as string
      }));

      await db.likes.bulkPut(formattedLikes);
      toast.info('Synced your favorites with the database');
    }
  } catch (error) {
    console.error('Error during sync check:', error);
    toast.error('Error syncing with the database');
  }
}

function App() {
  const { isAuthenticated } = useAuth();
  const { isOffline, wasOffline, isOnline } = useIsOnline();
  const color = useColorStore((state) => state.color);
  const setColor = useColorStore((state) => state.setColor);

  if (!isMobile) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-2 bg-white pt-2 text-xl text-black">
        <h1 className="px-4 text-center text-lg">
          <span className="font-lora text-5xl">Vibes</span> is only available on
          mobile devices. <span className="text-xs">(for now*)</span>
        </h1>

        <Tldraw persistenceKey="vibes-tldraw-store" />
      </main>
    );
  }

  useEffect(() => {
    if (isAuthenticated) {
      if (!color) {
        setColor(getRandomColor());
      }
    }

    if (isAuthenticated && isOnline) {
      syncLocalDatabaseWithSupabase();
    }
  }, [isAuthenticated, isOnline]);

  useEffect(() => {
    if (isOffline) {
      toast.warning(
        'You are currently offline. You can go to your bookmarks to enjoy saved vibes',
        {
          duration: 5000
        }
      );
    }
  }, [isOffline]);

  useEffect(() => {
    if (wasOffline && !isOffline) {
      toast.success(
        'You are back online. All the functionality of Vibes is restored',
        {
          duration: 5000
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
      from: ['/foryou', '/for-you', 'feed'],
      to: '/fyp'
    },
    {
      from: ['/bookmark', '/saved'],
      to: '/bookmarks'
    },
    {
      from: ['/liked', '/like', '/likes', 'favorite'],
      to: '/favorites'
    }
  ];

  return (
    <Routes>
      <Route index element={<Index />} />
      <Route path="/fyp" element={<Feed />} />
      <Route path="/bookmarks" element={<Bookmarks />} />
      <Route path="/favorites" element={<Likes />} />
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
  );
}

export default App;
