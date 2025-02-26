import { useEffect, useRef, useState } from 'react';
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
  PiScroll as Scroll
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
import { db } from '@/lib/dexie';
import { useIsOnline } from '@/hooks/useIsOnline';
import { useInView } from 'react-intersection-observer';
import Confetti from 'react-confetti';
import { AnimatePresence, motion } from 'motion/react';

const POSTS_PER_PAGE = 12;
const POSTS_BEFORE_FETCH = 4;
const POST_TYPES = ['horror', 'nsfw'];

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

export default function Posts({
  type
}: {
  type: 'feed' | 'bookmark' | 'like';
}) {
  const currentPostIndex = useRef(0);
  const { isOffline } = useIsOnline();
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    const loadedPages = JSON.parse(
      sessionStorage.getItem('vibe-loaded-pages') || '{}'
    );
    return !loadedPages[type];
  });
  const [showConfetti, setShowConfetti] = useState(false);

  const { ref: endOfPostsRef, inView: isEndOfPostsVisible } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });

  const userId = useLiveQuery(async () => {
    const user = await getCurrentUser();
    return user?.id;
  }, []);

  const bookmarkedPosts = useLiveQuery(
    async () => {
      if (!userId) return [];

      const bookmarks = await db.bookmarks
        .where('userId')
        .equals(userId)
        .toArray();

      return bookmarks.map((b) => b.vibe);
    },
    [userId],
    []
  );

  const likedPosts = useLiveQuery(
    async () => {
      if (!userId) return [];

      const likes = await db.likes.where('userId').equals(userId).toArray();

      return likes.map((l) => l.vibe);
    },
    [userId],
    []
  );

  const bookmarkedPostIds = useLiveQuery(
    async () => {
      if (!userId) return new Set<string>();

      const bookmarks = await db.bookmarks
        .where('userId')
        .equals(userId)
        .toArray();

      return new Set(bookmarks.map((b) => b.postId));
    },
    [userId],
    new Set<string>()
  );

  const likedPostIds = useLiveQuery(
    async () => {
      if (!userId) return new Set<string>();

      const likes = await db.likes.where('userId').equals(userId).toArray();

      return new Set(likes.map((l) => l.postId));
    },
    [userId],
    new Set<string>()
  );

  useEffect(() => {
    const navigationState = sessionStorage.getItem(
      'vibe-state-navigation-state'
    );
    if (type === 'feed') {
      if (navigationState) {
        const { scrollPosition, fromUrl } = JSON.parse(navigationState);
        if (location.pathname === fromUrl) {
          const timer = setTimeout(() => {
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
          }, 0);

          return () => clearTimeout(timer);
        }
      }
    } else {
      setTimeout(() => {
        if (navigationState) {
          const { scrollPosition, fromUrl } = JSON.parse(navigationState);
          if (location.pathname === fromUrl) {
            const timer = setTimeout(() => {
              setIsNavigatingBack(true);
              if (mainRef.current) {
                mainRef.current.style.scrollBehavior = 'smooth';
                mainRef.current.scrollTop = scrollPosition;
                sessionStorage.removeItem('vibe-state-navigation-state');
              }
            }, 0);

            return () => clearTimeout(timer);
          }
        }
      }, 250);
    }
  }, [location.pathname]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage = true,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed'],
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
    if (type === 'bookmark' || type === 'like') {
      if (isLoading) {
        const timer = setTimeout(() => {
          setIsLoading(false);

          const loadedPages = JSON.parse(
            sessionStorage.getItem('vibe-loaded-pages') || '{}'
          );
          loadedPages[type] = true;
          sessionStorage.setItem(
            'vibe-loaded-pages',
            JSON.stringify(loadedPages)
          );
        }, 1500);

        return () => clearTimeout(timer);
      }
    } else if (type === 'feed') {
      setIsLoading(status === 'pending');
    }
  }, [type, status, isLoading]);

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

  async function fetchPosts(pageParam = 0): Promise<PostType[]> {
    const from = pageParam * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .range(from, to)
      .order('title', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

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

  if (isOffline && type === 'feed') {
    return (
      <section className="motion-opacity-in motion-duration-1000 flex h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
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

  if (isLoading) {
    return (
      <section className="motion-preset-slide-right motion-preset-blur-right flex h-[100dvh] flex-col items-center justify-center">
        <Loader />
      </section>
    );
  }

  if (error && type === 'feed') {
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
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 border-b-2 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/fyp')} />
          <h1 className="text-4xl font-bold">
            {type === 'bookmark'
              ? 'Bookmarks'
              : type === 'like'
                ? 'Favorites'
                : 'For You'}
          </h1>
        </div>

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
                : 'No vibes available'}
          </h2>
          <p className="text-neutral-400">
            {type === 'bookmark'
              ? 'Double-tap on any vibe to bookmark it'
              : type === 'like'
                ? 'Tap the heart icon to like a vibe'
                : 'The world is ending. Try again later'}
          </p>
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

      {posts.map((post) => {
        const { font, textColor, backgroundColor } = getPostTypeStyles(
          post.type
        );
        const title = capitalizeFirstLetter(post.title);
        const isBookmarked = bookmarkedPostIds?.has(post.id) ?? false;
        const isLiked = likedPostIds?.has(post.id) ?? false;

        return (
          <section
            key={post.id}
            className="motion-opacity-in motion-duration-1000 relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center space-y-4"
          >
            <div
              className="flex w-full flex-col justify-center space-y-4"
              onClick={() => handleDoubleTap(post)}
            >
              <div className="-mt-8 px-4">
                <h2 className={`${font} text-5xl`}>
                  {title.length > 69 ? title.slice(0, 69) + '...' : title}
                </h2>

                <p className="font-lora mt-1 flex items-center gap-1 text-sm">
                  <Hourglass />
                  {calculateReadingTime(post.content)} min
                </p>
              </div>

              <p className="font-lora px-4">
                {post.preview.length > 350
                  ? post.preview.slice(0, 350)
                  : post.preview}
                {post.preview.length > 350 && (
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

            <div className="motion-preset-slide-up motion-duration-1000 absolute bottom-8 z-[1000] flex w-full items-center justify-between px-4">
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

              {post.content.length > 500 ? (
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
      })}

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
                transition={{ duration: 2 }}
              >
                <Confetti
                  width={window.innerWidth}
                  height={window.innerHeight}
                  numberOfPieces={250}
                  gravity={0.1}
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
