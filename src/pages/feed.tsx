import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router';

const POSTS_PER_PAGE = 10;
const FETCH_THRESHOLD = 4;
const POST_TYPES = ['horror', 'nsfw'];

type PostType = {
  id: string;
  title: string;
  content: string;
  url: string;
  type: (typeof POST_TYPES)[number];
};

async function fetchPosts(): Promise<PostType[]> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { data, error } = await supabase
    .from('raw_posts')
    .select('*')
    .limit(POSTS_PER_PAGE);

  if (error) {
    throw error;
  }

  return data;
}

export default function Feed() {
  const currentPostIndex = useRef(0);
  const lastFetchedAtIndex = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

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
      const newIndex = Math.floor(scrollTop / viewportHeight);

      if (newIndex !== currentPostIndex.current) {
        currentPostIndex.current = newIndex;
        const scrolledPostsSinceLastFetch =
          newIndex - lastFetchedAtIndex.current;

        if (
          scrolledPostsSinceLastFetch >= FETCH_THRESHOLD &&
          !isFetchingNextPage &&
          hasNextPage
        ) {
          lastFetchedAtIndex.current = newIndex;
          fetchNextPage();
        }
      }
    }

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

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
      {posts.map((post) => (
        <section
          key={post.id}
          className="relative flex h-[100dvh] w-full snap-start snap-always flex-col items-center justify-center p-4"
        >
          <div>
            <h2 className="text-5xl font-black">{post.title}</h2>
            <p className="text-lg">
              {post.content.length > 500
                ? post.content.slice(0, 500)
                : post.content}
              {post.content.length > 500 && (
                <button onClick={() => handleReadMore(post)}>... more</button>
              )}
            </p>

            <span>{post.type}</span>
            <br />
            <button onClick={() => handleReadMore(post)}>read more</button>
          </div>
        </section>
      ))}
    </main>
  );
}
