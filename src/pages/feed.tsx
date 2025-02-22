import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import {
  PiHourglass as Hourglass,
  PiShareFat as Share,
  PiPlay as Play,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill,
  PiHeart as Like
  // PiHeartFill as LikeFill
} from 'react-icons/pi';
import Marquee from 'react-fast-marquee';
import copy from 'copy-to-clipboard';
import { supabase } from '@/lib/supabase';
import {
  calculateReadingTime,
  capitalizeFirstLetter,
  getPostTypeStyles
} from '@/utils';
import { toast } from 'sonner';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import Loader from '@/components/Loader';

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

export default function Feed() {
  const currentPostIndex = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [bookmarks, setBookmarks] = useState<PostType[]>([]);

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

  async function handleBookmark(post: PostType) {
    setBookmarks((prevBookmarks) => {
      const isBookmarked = prevBookmarks.some((item) => item.id === post.id);

      if (isBookmarked) {
        toast.warning('Vibe removed from your bookmarks');
        return prevBookmarks.filter((item) => item.id !== post.id);
      } else {
        toast.success('Vibe saved to your bookmarks');
        return [...prevBookmarks, post];
      }
    });
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
        const isBookmarked = bookmarks.some((item) => item.id === post.id);

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
                  className={`rounded-full ${backgroundColor} p-4 duration-300 active:scale-90`}
                >
                  <Like className={`text-4xl ${textColor}`} />
                </button>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
