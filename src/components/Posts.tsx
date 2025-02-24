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
  PiCaretLeft as Left
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

const POSTS_PER_PAGE = 8;
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
      await db.bookmarks.delete(existingBookmark.id);
      await supabase.from('bookmarks').delete().eq('id', existingBookmark.id);
      toast.warning('Deleted vibe from your bookmarks');
      return;
    }

    const id = await db.bookmarks.add({
      id: uuidv4(),
      userId: user.id,
      postId: post.id,
      vibe: post,
      createdAt: new Date().toISOString(),
      isSynced: false
    });

    toast.success('Saved vibe to your bookmarks');

    const { error } = await supabase.from('bookmarks').insert({
      id: id,
      user_id: user.id,
      post_id: post.id,
      added_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    } else {
      await db.bookmarks.update(id, {
        isSynced: true
      });
    }
  } catch (error) {
    console.error('Error handling bookmark:', error);
    toast.error('Error saving vibe to your bookmarks');
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
      await db.likes.delete(existingLike.id);
      await supabase.from('likes').delete().eq('id', existingLike.id);
      return;
    }

    const id = await db.likes.add({
      id: uuidv4(),
      userId: user.id,
      postId: post.id,
      vibe: post,
      createdAt: new Date().toISOString(),
      isSynced: false
    });

    const { error } = await supabase.from('likes').insert({
      id: id,
      user_id: user.id,
      post_id: post.id,
      added_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    } else {
      await db.likes.update(id, {
        isSynced: true
      });
    }
  } catch (error) {
    console.error('Error handling like:', error);
  }
}

export default function Posts({
  type
}: {
  type: 'feed' | 'bookmark' | 'like';
}) {
  const currentPostIndex = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

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
    if (navigationState) {
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
    getNextPageParam: (_, allPages) => allPages.length,
    initialPageParam: 0,
    enabled: type === 'feed'
  });

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

    await new Promise((resolve) => setTimeout(resolve, 1000));

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
  let isLoading = false;

  if (type === 'feed') {
    posts = data?.pages.flat() ?? [];
    isLoading = status === 'pending';
  } else if (type === 'bookmark') {
    posts = bookmarkedPosts;
    isLoading = bookmarkedPosts.length === 0;
  } else if (type === 'like') {
    posts = likedPosts;
    isLoading = likedPosts.length === 0;
  }

  if (isLoading) {
    return (
      <div className="motion-preset-slide-right motion-preset-blur-right flex h-screen flex-col items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error && type === 'feed') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-red-950">
        <h2 className="text-xl text-red-500">{JSON.stringify(error)}</h2>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <main
        ref={mainRef}
        className="motion-opacity-in motion-duration-1000 flex h-[100dvh] items-center justify-center"
      >
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/feed')} />
          <h1 className="text-4xl font-bold">
            {type === 'bookmark'
              ? 'Bookmarks'
              : type === 'like'
                ? 'Your likes'
                : 'Feed'}
          </h1>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-4 w-full text-center">
            {type === 'bookmark' ? (
              <BookmarkLine className="mx-auto text-8xl" />
            ) : (
              type === 'like' && <LikeLine className="mx-auto text-8xl" />
            )}
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
      </main>
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
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/feed')} />
          <h1 className="font-geist text-4xl font-bold">Bookmarks</h1>
        </div>
      )}

      {type === 'like' && (
        <div className="fixed top-0 z-[10000] flex h-20 w-full items-center gap-6 bg-[#111]/30 px-4 backdrop-blur-sm">
          <Left className="text-3xl" onClick={() => navigate('/feed')} />
          <h1 className="font-geist text-4xl font-bold">Your likes</h1>
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
            onClick={() => handleDoubleTap(post)}
            className="motion-opacity-in relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center space-y-4"
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

            <div className="motion-preset-slide-up motion-duration-1000 absolute bottom-8 z-[1000] flex w-full items-center justify-between px-4">
              <button
                onClick={() =>
                  handleShare(
                    post,
                    `https://thevibes.pages.dev/vibe/${post.id}`
                  )
                }
                className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
              >
                <Share className={`${textColor} text-4xl`} />
              </button>

              <button
                onClick={() => {
                  handleBookmark(post);
                }}
                className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
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
                  onClick={() => handleLike(post)}
                  className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
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
    </main>
  );
}
