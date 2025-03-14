import { memo, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import {
  PiHourglass as Hourglass,
  PiShareFat as Share,
  PiPlay as Play,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill,
  PiHeart as LikeLine,
  PiHeartFill as LikeFill,
  PiCaretLeft as Left,
  PiScroll as Scroll,
  PiArrowUpRight as Link,
  PiWarning as Warning,
  PiWifiSlash as Offline,
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { v4 as uuidv4 } from 'uuid';
import Marquee from 'react-fast-marquee';
import copy from 'copy-to-clipboard';
import { supabase } from '@/lib/supabase';
import {
  calculateReadingTime,
  capitalizeFirstLetter,
  getCurrentUser,
  getPostTypeStyles
} from '@/utils';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import Loader from '@/components/Loader';
import { db, UserType } from '@/lib/dexie';
import { useIsOnline } from '@/hooks/useIsOnline';
import { useInView } from 'react-intersection-observer';
import Confetti from 'react-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { DialogClose } from '@/components/ui/dialog';
import useAuth from '@/hooks/useAuth';
import { useUserStore } from '@/context/UserStore';
import { useColorStore } from '@/context/ColorStore';
import { useTypeStore, VIBE_OPTIONS } from '@/context/TypeStore';
import InstallButton from '@/components/Install';
import { isIOS } from 'react-device-detect';
import { useIsPWA } from '@/hooks/useIsPWA';

const POSTS_PER_PAGE = 12;
const POSTS_BEFORE_FETCH = 6;
const POST_TYPES = ['horror', 'nsfw', 'funny'];

export type PostType = {
  id: string;
  title: string;
  content: string;
  preview: string;
  url: string;
  type: (typeof POST_TYPES)[number];
  author: string;
  platform: string;
  created_at: string;
  scraped_at: string;
  tags: string[];
  isChefsKiss: boolean;
};

export async function handleBookmark(post: PostType) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      toast.error('You must be logged in to a save vibe');
      return;
    }

    const existingBookmark = await db.bookmarks
      .where({
        userId: user.id,
        postId: post.id
      })
      .first();

    if (existingBookmark) {
      await supabase.from('bookmarks').delete().eq('id', existingBookmark.id);
      await db.bookmarks.delete(existingBookmark.id);
      toast.warning('Deleted vibe from your bookmarks');
      return;
    }

    const id = uuidv4();

    const { error } = await supabase.from('bookmarks').insert({
      id: id,
      user_id: user.id,
      post_id: post.id,
      added_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    }

    await db.bookmarks.put({
      id: id,
      userId: user.id,
      postId: post.id,
      vibe: post,
      createdAt: new Date().toISOString()
    });

    toast.success('Saved vibe to your bookmarks');
  } catch (error) {
    console.error('Error handling a bookmark:', error);
    toast.error('Something went wrong while saving your vibe');
  }
}

export async function handleLike(post: PostType) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      toast.error('You must be logged in to like a vibe');
      return;
    }

    const existingLike = await db.likes
      .where({
        userId: user.id,
        postId: post.id
      })
      .first();

    if (existingLike) {
      await supabase.from('likes').delete().eq('id', existingLike.id);
      await db.likes.delete(existingLike.id);
      return;
    }

    const id = uuidv4();

    const { error } = await supabase.from('likes').insert({
      id: id,
      user_id: user.id,
      post_id: post.id,
      added_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    }

    await db.likes.put({
      id: id,
      userId: user.id,
      postId: post.id,
      vibe: post,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error liking a vibe:', error);
    toast.error('Something went wrong while liking the vibe');
  }
}

function usePostViewTracker({
  post,
  delay
}: {
  post: PostType;
  delay: number;
}) {
  const { ref, inView } = useInView({
    threshold: 1,
    triggerOnce: true
  });
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (inView && !hasViewed) {
      timerRef.current = setTimeout(async () => {
        try {
          if (!user) return;

          if (user?.scrolledPosts?.includes(post.id)) {
            return;
          }

          const updatedScrolledPosts = [...user.scrolledPosts, post.id];

          await supabase
            .from('profiles')
            .update({ scrolled_posts: updatedScrolledPosts })
            .eq('auth_id', user.id);

          await db.users.update(user.id, {
            scrolledPosts: updatedScrolledPosts
          });

          const updatedUser = await db.users.get(user.id);
          setUser(updatedUser as UserType);
          setHasViewed(true);
        } catch (error) {
          console.error('Error updating read posts:', error);
        }
      }, delay);
    } else if (!inView && timerRef.current) {
      clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inView, post?.id, delay, hasViewed]);

  return ref;
}

const PostItem = memo(
  ({
    post,
    isOffline,
    isBookmarked,
    isLiked,
    handleDoubleTap,
    handleShare,
    handleReadMore
  }: {
    post: PostType;
    isOffline: boolean;
    isBookmarked: boolean;
    isLiked: boolean;
    handleDoubleTap: (post: PostType) => void;
    handleShare: (post: PostType, url: string) => void;
    handleReadMore: (post: PostType) => void;
  }) => {
    const ref = usePostViewTracker({
      post,
      delay: 3500
    });
    const { font, textColor, backgroundColor } = getPostTypeStyles(post.type);
    const title = capitalizeFirstLetter(post.title);

    return (
      <section
        ref={ref}
        key={post.id}
        className="motion-opacity-in motion-duration-1000 relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center space-y-4"
      >
        <div
          className="flex w-full flex-col justify-center space-y-4"
          onClick={() => handleDoubleTap(post)}
        >
          <div className="-mt-16 px-4">
            <h2 className={`${font} text-3xl`}>
              {title.length > 200 ? title.slice(0, 200) + '...' : title}
            </h2>

            <div className="mt-1 flex items-center gap-2">
              <p className="font-lora flex items-center gap-1 text-sm">
                <Hourglass />
                {calculateReadingTime(post.content)} min
              </p>
              {post.isChefsKiss && (
                <img
                  src="/chefskiss.png"
                  alt="Chef's Kiss"
                  className="motion-opacity-in size-5"
                />
              )}
            </div>
          </div>

          <p className="font-lora px-4">
            {post.content.length > 450
              ? post.preview.slice(0, 350)
              : post.content}
            {post.content.length > 450 && post.preview.length > 350 && (
              <button onClick={() => handleReadMore(post)}>... more</button>
            )}
          </p>

          <div className="motion-opacity-in motion-duration-1000 min-h-6">
            <Marquee
              autoFill={true}
              speed={50}
              gradient={true}
              gradientColor="hsl(0 0% 3.9%)"
              gradientWidth={35}
            >
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={`mr-3 rounded-sm ${backgroundColor} px-2 py-1 ${textColor}`}
                >
                  {tag}
                </span>
              ))}
            </Marquee>
          </div>
        </div>

        <div className="motion-preset-slide-up motion-duration-1000 absolute bottom-8 z-[10] flex w-full items-center justify-between px-4">
          <button
            onClick={() =>
              handleShare(
                post,
                `${import.meta.env.DEV ? 'http://localhost:5173' : 'https://thevibes.pages.dev'}/vibe/${post.id}`
              )
            }
            className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
          >
            <Share className={`${textColor} text-4xl`} />
          </button>

          <button
            disabled={isOffline}
            onClick={() => {
              handleBookmark(post);
            }}
            className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
          >
            {isBookmarked ? (
              <BookmarkFill className={`text-4xl ${textColor}`} />
            ) : (
              <BookmarkLine className={`text-4xl ${textColor}`} />
            )}
          </button>

          {post.content.length > 450 ? (
            <button
              onClick={() => handleReadMore(post)}
              className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
            >
              <Play className={`text-4xl ${textColor}`} />
            </button>
          ) : (
            <button
              disabled={isOffline}
              onClick={() => handleLike(post)}
              className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
            >
              {isLiked ? (
                <LikeFill className={`text-4xl ${textColor}`} />
              ) : (
                <LikeLine className={`text-4xl ${textColor}`} />
              )}
            </button>
          )}
        </div>
      </section>
    );
  },
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isLiked === next.isLiked
);

export default function Posts({
  type
}: {
  type: 'feed' | 'bookmark' | 'like';
}) {
  const currentPostIndex = useRef(0);
  const { isOffline } = useIsOnline();
  const { signOut, isAuthenticated } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const color = useColorStore((state) => state.color);
  const vibeType = useTypeStore((state) => state.vibeType);
  const setVibeType = useTypeStore((state) => state.setVibeType);
  const isPWA = useIsPWA();
  const isPWAInstalled = localStorage.getItem('vibes-pwa-installed') === 'true';
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const { ref: endOfPostsRef, inView: isEndOfPostsVisible } = useInView({
    threshold: 0.75,
    triggerOnce: true
  });

  const bookmarkedPosts = useLiveQuery(
    async () => {
      try {
        setBookmarkLoading(true);
        if (!user || type !== 'bookmark') return [];

        const bookmarks = await db.bookmarks
          .where('userId')
          .equals(user?.id)
          .toArray();

        setBookmarkLoading(false);
        return bookmarks.map((b) => b.vibe);
      } catch (error) {
        console.error('Error fetching bookmarked posts:', error);
        setBookmarkLoading(false);
        return [];
      }
    },
    [user?.id, type],
    []
  );

  const likedPosts = useLiveQuery(
    async () => {
      try {
        setLikeLoading(true);
        if (!user || type !== 'like') return [];

        const likes = await db.likes.where('userId').equals(user?.id).toArray();

        setLikeLoading(false);
        return likes.map((l) => l.vibe);
      } catch (error) {
        console.error('Error fetching liked posts:', error);
        setLikeLoading(false);
        return [];
      }
    },
    [user?.id, type],
    []
  );

  const bookmarkedPostIds = useLiveQuery(
    async () => {
      if (!user) return new Set<string>();

      const bookmarks = await db.bookmarks
        .where('userId')
        .equals(user.id)
        .toArray();

      return new Set(bookmarks.map((b) => b.postId));
    },
    [user?.id],
    new Set<string>()
  );

  const likedPostIds = useLiveQuery(
    async () => {
      if (!user) return new Set<string>();

      const likes = await db.likes.where('userId').equals(user?.id).toArray();

      return new Set(likes.map((l) => l.postId));
    },
    [user?.id],
    new Set<string>()
  );

  useEffect(() => {
    const navigationState = sessionStorage.getItem(
      'vibe-state-navigation-state'
    );

    if (navigationState) {
      if (type === 'bookmark' && bookmarkLoading) return;
      if (type === 'like' && likeLoading) return;

      const { scrollPosition, fromUrl } = JSON.parse(navigationState);
      if (location.pathname === fromUrl) {
        setIsNavigatingBack(true);
        if (mainRef.current) {
          mainRef.current.style.scrollBehavior = 'auto';
          mainRef.current.scrollTop = scrollPosition;
          sessionStorage.removeItem('vibe-state-navigation-state');

          setTimeout(() => {
            if (mainRef.current) {
              mainRef.current.style.scrollBehavior = 'smooth';
            }
          }, 100);
        }
      }
    }
  }, [location.pathname, bookmarkLoading, likeLoading]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage = true,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed', vibeType],
    queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < POSTS_PER_PAGE) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: type === 'feed' && !isOffline
  });

  async function fetchPosts(pageParam = 0): Promise<PostType[]> {
    const from = pageParam * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;
    const readPosts = user?.readPosts || [];
    const scrolledPosts = user?.scrolledPosts || [];

    try {
      let supabaseQuery = supabase
        .from('posts')
        .select('*')
        .range(from, to)
        .not('id', 'in', `(${scrolledPosts.join(',')})`)
        .not('id', 'in', `(${readPosts.join(',')})`);

      if (vibeType === 'random') {
        const isNsfw = user?.isNsfw ?? false;

        if (!isNsfw || !isAuthenticated) {
          supabaseQuery = supabaseQuery.neq('type', 'nsfw');
        }
      } else if (vibeType === 'quickie') {
        const { data, error } = await supabase.rpc('get_short_posts', {
          offset_param: from,
          limit_param: POSTS_PER_PAGE,
          read_posts: readPosts,
          scrolled_posts: scrolledPosts
        });

        if (error) throw error;
        return data || [];
      } else if (vibeType) {
        supabaseQuery = supabaseQuery.eq('type', vibeType);
      }

      const { data, error } = await supabaseQuery.throwOnError();
      if (error) throw error;

      if (data.length === 0 || data.length < POSTS_PER_PAGE / 2) {
        supabaseQuery = supabase
          .from('posts')
          .select('*')
          .range(from, to)
          .not('id', 'in', `(${readPosts.join(',')})`);

        if (vibeType === 'random') {
          const isNsfw = user?.isNsfw ?? false;

          if (!isNsfw || !isAuthenticated) {
            supabaseQuery = supabaseQuery.neq('type', 'nsfw');
          }
        } else if (vibeType) {
          supabaseQuery = supabaseQuery.eq('type', vibeType);
        }

        const { data: secondAttemptData, error: secondAttemptError } =
          await supabaseQuery.throwOnError();

        if (secondAttemptError) throw secondAttemptError;

        return secondAttemptData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }

  useEffect(() => {
    refetch();
  }, [vibeType]);

  useEffect(() => {
    if (!hasNextPage && isEndOfPostsVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [hasNextPage, isEndOfPostsVisible]);

  useEffect(() => {
    function handleScroll() {
      if (!mainRef.current) return;

      const scrollTop = mainRef.current.scrollTop;
      const viewportHeight = window.innerHeight;
      const currentIndex = Math.floor(scrollTop / viewportHeight);

      currentPostIndex.current = currentIndex;

      if (type === 'feed') {
        const totalPosts =
          data?.pages.reduce((acc, page) => acc + page.length, 0) || 0;
        const remainingPosts = totalPosts - (currentIndex + 1);

        if (
          remainingPosts <= POSTS_BEFORE_FETCH &&
          !isFetchingNextPage &&
          hasNextPage
        ) {
          fetchNextPage();
        }
      }
    }

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, data?.pages, type]);

  const handleDoubleTap = useDoubleTap<PostType>((post) => {
    handleBookmark(post);
  }, 300);

  function handleShare(post: PostType, url: string) {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: `${capitalizeFirstLetter(post.title)} - Vibes`,
        url: url
      });
    } else {
      copy(url);
      toast.success('URL copied to your clipboard');
    }
  }

  function handleReadMore(post: PostType) {
    if (mainRef.current) {
      const navigationState = {
        scrollPosition: mainRef.current.scrollTop,
        fromUrl: location.pathname
      };
      sessionStorage.setItem(
        'vibe-state-navigation-state',
        JSON.stringify(navigationState)
      );
    }
    navigate(`/vibe/${post.id}`, { state: { post } });
  }

  let posts: PostType[] = [];

  if (type === 'feed') {
    posts = data?.pages.flat() ?? [];
  } else if (type === 'bookmark') {
    posts = bookmarkedPosts;
  } else if (type === 'like') {
    posts = likedPosts;
  }

  const sortedVibeTypes = [...VIBE_OPTIONS].sort((a, b) => {
    if (a === vibeType) return -1;
    if (b === vibeType) return 1;
    return 0;
  });

  if (isOffline && type === 'feed') {
    return (
      <section className="motion-opacity-in motion-duration-1000 flex h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Offline className="mx-auto text-8xl" />
        <h1 className="font-geist text-4xl font-bold">
          You are currently offline.
        </h1>
        <button
          className="font-lora underline-red-500 w-full text-center text-xl underline underline-offset-2"
          onClick={() => navigate('/bookmarks')}
        >
          Go To Your Saved Vibes
        </button>
      </section>
    );
  }

  if (status === 'pending' && type === 'feed') {
    return (
      <section className="motion-preset-slide-right motion-preset-blur-right flex h-[100dvh] flex-col items-center justify-center">
        <Loader />
      </section>
    );
  }

  if (
    (bookmarkLoading && type === 'bookmark') ||
    (likeLoading && type === 'like')
  ) {
    return (
      <section className="motion-preset-slide-right flex h-[100dvh] flex-col items-center justify-center">
        <Loader />
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex h-[100dvh] items-center justify-center bg-red-950 px-4">
        <h2 className="text-xl text-red-500">{JSON.stringify(error)}</h2>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section
        ref={mainRef}
        className="motion-opacity-in motion-duration-1000 flex h-[100dvh] items-center justify-center"
      >
        {type !== 'feed' && (
          <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 border-b-2 bg-[#111]/30 px-4 backdrop-blur-sm">
            <Left className="text-3xl" onClick={() => navigate('/fyp')} />
            <h1 className="text-4xl font-bold">
              {type === 'bookmark' ? 'Bookmarks' : 'Favorites'}
            </h1>
          </div>
        )}

        <div className="text-center">
          <div className="mx-auto mb-4 w-full text-center">
            {type === 'bookmark' && (
              <BookmarkLine className="mx-auto text-8xl" />
            )}

            {type === 'like' && <LikeLine className="mx-auto text-8xl" />}

            {type === 'feed' && <Scroll className="mx-auto text-8xl" />}
          </div>

          <h2 className="text-2xl font-bold">
            {type === 'bookmark'
              ? 'No bookmarked vibes yet'
              : type === 'like'
                ? 'No liked vibes yet'
                : `No ${vibeType !== 'random' ? vibeType : ''} vibes available`}
          </h2>

          <p className="text-neutral-400">
            {type === 'bookmark'
              ? 'Double-tap on any vibe to bookmark it'
              : type === 'like'
                ? 'Tap the heart icon to like a vibe'
                : 'The world is ending. Try again later'}
          </p>

          {type === 'feed' && vibeType !== 'random' && (
            <p className="absolute bottom-16 left-1/2 w-full -translate-x-1/2 text-lg">
              Change the filter to{' '}
              <span
                className="font-lora underline underline-offset-2"
                onClick={() => {
                  setVibeType('random');
                }}
              >
                random
              </span>
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <main
      ref={mainRef}
      className="h-[100dvh] touch-pan-y snap-y snap-mandatory overflow-y-scroll"
      style={{
        scrollSnapType: 'y mandatory',
        scrollBehavior: isNavigatingBack ? 'auto' : 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {type === 'bookmark' && (
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 border-b-2 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/fyp')} />
          <h1 className="font-geist text-4xl font-bold">Bookmarks</h1>
        </div>
      )}

      {type === 'like' && (
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 border-b-2 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/fyp')} />
          <h1 className="font-geist text-4xl font-bold">Favorites</h1>
        </div>
      )}

      {type === 'feed' && (
        <>
          <Avatar
            className="motion-preset-slide-left motion-preset-blur-left motion-opacity-in fixed top-4 right-4 z-[100] cursor-pointer text-white"
            onClick={() => {
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }

              if (!user) {
                setIsCreateAccountOpen(true);
                return;
              }

              setIsDrawerOpen(true);
            }}
          >
            {user?.avatarUrl && <AvatarImage src={user?.avatarUrl} />}

            <AvatarFallback
              style={{
                backgroundColor: color || '#111111'
              }}
            >
              {user ? user.name.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>

          {!isAuthenticated ||
            !isPWAInstalled ||
            (!isPWA && (
              <button
                className="motion-preset-slide-left motion-preset-blur-left motion-opacity-in fixed top-4 right-20 z-[100] cursor-pointer rounded-full bg-[#111111] p-3"
                onClick={() => {
                  if (navigator.vibrate) {
                    navigator.vibrate(50);
                  }

                  // @ts-expect-error - PWA type error
                  document.getElementById('pwa-install')?.showDialog(true);
                }}
              >
                {isIOS ? (
                  <AppStore className="text-2xl" />
                ) : (
                  <PlayStore className="text-2xl" />
                )}
              </button>
            ))}
        </>
      )}

      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <DrawerContent className="border-0 px-0 outline-0">
          <DrawerHeader>
            <DrawerTitle className="-mb-1 flex items-center justify-center gap-2 text-3xl">
              Settings
            </DrawerTitle>
          </DrawerHeader>
          <DrawerFooter className="gap-0 px-0 py-0">
            <div className="px-2 pb-3">
              <h4 className="font-lora mb-1 text-2xl font-semibold">Filter</h4>
              <div className="flex items-center gap-2 overflow-x-auto text-lg">
                {sortedVibeTypes.map((type) => {
                  const isNsfw = user?.isNsfw ?? false;

                  if (type === 'nsfw' && !isNsfw) {
                    return null;
                  }

                  return (
                    <button
                      key={type}
                      className={`rounded-full ${
                        type === 'random'
                          ? 'bg-pink-600'
                          : type === 'quickie'
                            ? 'bg-emerald-600'
                            : type === 'horror'
                              ? 'bg-red-600'
                              : type === 'nsfw'
                                ? 'bg-purple-600'
                                : type === 'funny'
                                  ? 'bg-orange-600'
                                  : type === 'conspiracy'
                                    ? 'bg-teal-600'
                                    : 'bg-green-600'
                      } px-4 py-2 ${vibeType !== type && 'grayscale'}`}
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setVibeType(type);
                      }}
                    >
                      @{type}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="flex w-full items-center justify-between bg-purple-600 px-4 py-4 text-xl duration-300 active:bg-purple-500"
              onClick={async () => {
                const isUnderAge = Number(user?.age) < 18;
                const isNsfw = user?.isNsfw;

                if (isUnderAge) {
                  toast.error('You are underage for NSFW content');
                  return;
                }

                if (isNsfw) {
                  await supabase
                    .from('profiles')
                    .update({ is_nsfw: false })
                    .eq('auth_id', user.id);

                  await db.users.update(user.id, {
                    isNsfw: false
                  });

                  if (vibeType === 'nsfw') {
                    setVibeType('random');
                  }
                } else {
                  await supabase
                    .from('profiles')
                    .update({ is_nsfw: true })
                    .eq('auth_id', user?.id);

                  // @ts-expect-error - Dexie type error
                  await db.users.update(user?.id, {
                    isNsfw: true
                  });

                  setVibeType('nsfw');
                }

                setIsDrawerOpen(false);
              }}
            >
              Show NSFW
              <span>{user?.isNsfw ? 'On' : 'Off'}</span>
            </button>
            <button
              className="flex w-full items-center justify-between bg-rose-600 px-4 py-4 text-xl duration-300 active:bg-rose-500"
              onClick={() => navigate('/favorites')}
            >
              Your Favorites
              <Link className="text-3xl text-rose-200" />
            </button>
            <button
              className="flex w-full items-center justify-between bg-blue-600 px-4 py-4 text-xl duration-300 active:bg-blue-500"
              onClick={() => navigate('/bookmarks')}
            >
              Your Bookmarks
              <Link className="text-3xl text-blue-200" />
            </button>
            <button
              className="flex w-full items-center justify-between bg-red-950 px-4 py-4 text-xl text-red-500 duration-300"
              onClick={() => setIsDeleteAccountOpen(true)}
            >
              Log out
              <Warning className="text-3xl text-red-500" />
            </button>

            <InstallButton onClick={() => setIsDrawerOpen(false)} />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={isCreateAccountOpen}
        onOpenChange={(open) => setIsCreateAccountOpen(open)}
      >
        <DialogContent className="border-green-900 bg-[#05250a] px-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Log in or Sign up</DialogTitle>
            <DialogDescription>
              Once you log in or create a new account you can like & save vibes.
              NSFW content is also available to logged in users only & you can
              enjoy full gallery of vibes without any limits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="flex items-center justify-between gap-8 outline-0">
              <button className="rounded-xs bg-green-950 px-4 py-2 whitespace-nowrap">
                No, I'm good
              </button>
              <button
                className="rounded-xs bg-green-950 px-4 py-2 whitespace-nowrap text-green-500"
                onClick={() => {
                  setIsCreateAccountOpen(false);
                  navigate('/auth/create-account');
                }}
              >
                Yeah Sure
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteAccountOpen}
        onOpenChange={(open) => setIsDeleteAccountOpen(open)}
      >
        <DialogContent className="border-red-900 bg-[#230606] px-6">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Are you absolutely sure you want to log out of Vibes?
            </DialogTitle>
            <DialogDescription>
              Once you log out you cannot like & save vibes. NSFW content is not
              shown to logged out users & you can only enjoy limited number of
              vibes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="flex items-center justify-between gap-8 outline-0">
              <button className="rounded-xs bg-red-950 px-4 py-2 whitespace-nowrap">
                No, I'm good
              </button>
              <button
                className="rounded-xs bg-red-950 px-4 py-2 whitespace-nowrap text-red-500"
                onClick={async () => {
                  await signOut();
                  setIsDeleteAccountOpen(false);
                  setIsDrawerOpen(false);
                }}
              >
                Yes, log me out
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          isOffline={isOffline}
          isBookmarked={bookmarkedPostIds?.has(post.id) ?? false}
          isLiked={likedPostIds?.has(post.id) ?? false}
          handleDoubleTap={handleDoubleTap}
          handleShare={handleShare}
          handleReadMore={handleReadMore}
        />
      ))}

      {!hasNextPage && (
        <section
          ref={endOfPostsRef}
          className="flex h-[100dvh] snap-start snap-always flex-col items-center justify-center px-4"
        >
          <AnimatePresence>
            {showConfetti && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
              >
                <Confetti
                  width={window.innerWidth}
                  height={window.innerHeight}
                  numberOfPieces={250}
                  gravity={0.1}
                  colors={
                    type === 'feed'
                      ? ['#FFEB3B', '#FFC107', '#FF9800']
                      : type === 'bookmark'
                        ? ['#3f51b5', '#2196f3', '#03a9f4', '#00bcd4']
                        : ['#f44336', '#e91e63', '#FF5722']
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 text-center">
            <h2 className="text-4xl font-bold">You've reached the end</h2>
            <p className="text-lg text-neutral-400">
              {type === 'bookmark'
                ? 'This was all the bookmarks you saved'
                : type === 'like'
                  ? 'This was all of your favorite vibes'
                  : 'Change the filter to see more vibes'}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
