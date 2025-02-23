import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import {
  PiHourglass as Hourglass,
  PiShareFat as Share,
  PiPlay as Play,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill,
  PiHeart as Like,
  PiHeartFill as LikeFill
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

async function fetchPosts({ pageParam = 0 }): Promise<PostType[]> {
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

async function handleBookmark(post: PostType) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      toast.error('You must be logged in save vibes');
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

async function handleLike(post: PostType) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      toast.error('You must be logged in like a vibe');
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

export default function Feed() {
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

  const likedPosts = useLiveQuery(
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
    queryKey: ['posts'],
    queryFn: fetchPosts,
    getNextPageParam: (_, allPages) => allPages.length,
    initialPageParam: 0
  });

  useEffect(() => {
    function handleScroll() {
      if (!mainRef.current) return;

      const scrollTop = mainRef.current.scrollTop;
      const viewportHeight = window.innerHeight;
      const currentIndex = Math.floor(scrollTop / viewportHeight);

      // Update current post index
      currentPostIndex.current = currentIndex;

      // Calculate total posts loaded and check if we're near the end
      const totalPosts =
        data?.pages.reduce((acc, page) => acc + page.length, 0) || 0;
      const remainingPosts = totalPosts - (currentIndex + 1);

      // Fetch more posts if we're POSTS_BEFORE_FETCH away from the end
      if (
        remainingPosts <= POSTS_BEFORE_FETCH &&
        !isFetchingNextPage &&
        hasNextPage
      ) {
        fetchNextPage();
      }
    }

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, data?.pages]);

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

  const posts = data?.pages.flat() ?? [];

  if (status === 'pending') {
    return (
      <div className="motion-preset-slide-right motion-preset-blur-right flex h-screen flex-col items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-red-950">
        <h2 className="text-xl text-red-500">{JSON.stringify(error)}</h2>
      </div>
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
      {posts.map((post) => {
        const { font, textColor, backgroundColor } = getPostTypeStyles(
          post.type
        );
        const title = capitalizeFirstLetter(post.title);
        const isBookmarked = bookmarkedPosts?.has(post.id) ?? false;
        const isLiked = likedPosts?.has(post.id) ?? false;

        return (
          <section
            key={post.id}
            onClick={() => handleDoubleTap(post)}
            className="motion-opacity-in motion-blur-in relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center space-y-4"
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

            <div className="motion-opacity-in motion-duration-[3s] min-h-6">
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

            <div className="motion-preset-slide-up motion-duration-[1.5s] absolute bottom-8 z-[1000] flex w-full items-center justify-between px-4">
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
                    <Like className={`text-4xl ${textColor}`} />
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
