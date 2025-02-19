import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import {
  PiHourglass as Hourglass,
  PiShareFat as Share,
  PiPlay as Play,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill
} from 'react-icons/pi';
import Marquee from 'react-fast-marquee';
import copy from 'copy-to-clipboard';
import supabase from '@/lib/supabase';
import { calculateReadingTime } from '@/utils';
import { toast } from 'sonner';
import { useDoubleTap } from '@/hooks/useDoubleTap';

const POSTS_PER_PAGE = 10;
const POSTS_BEFORE_FETCH = 4;
const POST_TYPES = ['horror', 'nsfw'];

type PostType = {
  id: string;
  title: string;
  content: string;
  url: string;
  type: (typeof POST_TYPES)[number];
  tags: string[];
};

async function fetchPosts({ pageParam = 0 }): Promise<PostType[]> {
  const from = pageParam * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data, error } = await supabase
    .from('raw_posts')
    .select('*')
    .range(from, to)
    .order('title', { ascending: false });

  if (error) {
    throw error;
  }

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
      navigator.share({ url: url, title: post.title });
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
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
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
        const font = post.type === 'horror' ? 'font-horror' : 'font-inter';
        const isBookmarked = bookmarks.some((item) => item.id === post.id);
        return (
          <section
            key={post.id}
            onClick={() => handleDoubleTap(post)}
            className="relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center space-y-4"
          >
            <div className="px-4">
              <h2 className={`${font} text-5xl`}>
                {post.title.length > 75
                  ? post.title.slice(0, 75) + '...'
                  : post.title}
              </h2>

              <p className="font-lora flex items-center gap-1 text-sm">
                <Hourglass />
                {calculateReadingTime(post.content)} min
              </p>
            </div>

            <p className="font-lora px-4 text-lg">
              {post.content.length > 350
                ? post.content.slice(0, 350)
                : post.content}
              {post.content.length > 350 && (
                <button onClick={() => handleReadMore(post)}>... more</button>
              )}
            </p>
            <Marquee
              autoFill={true}
              speed={50}
              gradient={true}
              gradientColor="black"
              gradientWidth={25}
            >
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="mr-3 rounded-sm bg-red-950 px-2 py-1 text-red-400"
                >
                  {tag}
                </span>
              ))}
            </Marquee>

            <div className="absolute bottom-4 z-[1000] flex w-full items-center justify-between px-4">
              <button
                onClick={() =>
                  handleShare(post, `http://localhost:5173/vibe/${post.id}`)
                }
                className="rounded-full bg-red-950 p-4 duration-300 active:scale-90"
              >
                <Share className="text-4xl text-red-500" />
              </button>

              <button
                onClick={() => {
                  handleBookmark(post);
                }}
                className="rounded-full bg-red-950 p-4 duration-300 active:scale-90"
              >
                {isBookmarked ? (
                  <BookmarkFill className="text-4xl text-red-500" />
                ) : (
                  <BookmarkLine className="text-4xl text-red-500" />
                )}
              </button>

              <button
                onClick={() => handleReadMore(post)}
                className="rounded-full bg-red-950 p-4 duration-300 active:scale-90"
              >
                <Play className="text-4xl text-red-500" />
              </button>
            </div>
          </section>
        );
      })}
    </main>
  );
}
