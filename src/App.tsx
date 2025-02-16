import { faker } from '@faker-js/faker';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

const POSTS_PER_PAGE = 10;
const FETCH_THRESHOLD = 6;
const POST_TYPES = ['horror', 'comedy', 'nsfw'];

type PlatformType = 'reddit' | 'wikipedia';

type PostType = {
  id: string;
  title: string;
  description: string;
  link: string;
  type: (typeof POST_TYPES)[number];
};

async function fetchPosts(): Promise<PostType[]> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return Array.from({ length: POSTS_PER_PAGE }, () => ({
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    link: faker.internet.url(),
    type: faker.helpers.arrayElement(POST_TYPES)
  }));
}

function App() {
  const currentPostIndex = useRef(0);
  const lastFetchedAtIndex = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const [platform, _] = useState<PlatformType>('reddit');

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

      // Get the current scroll position
      const scrollTop = mainRef.current.scrollTop;
      const viewportHeight = window.innerHeight;

      // Calculate which post is currently in view
      const newIndex = Math.floor(scrollTop / viewportHeight);

      if (newIndex !== currentPostIndex.current) {
        currentPostIndex.current = newIndex;

        // Check if we've scrolled through FETCH_THRESHOLD posts since last fetch
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

  const posts = data?.pages.flat() ?? [];

  if (status === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main
      ref={mainRef}
      className="h-[100dvh] touch-pan-y snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      style={{
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {posts.map((post) => (
        <section
          key={post.id}
          className="relative flex h-[100dvh] w-full snap-start snap-always flex-col items-center justify-center p-4"
        >
          <h2 className="text-3xl">{post.title}</h2>
          <p>{post.description}</p>
          <span>{post.type.toUpperCase()}</span>
          <span>{platform.toUpperCase()}</span>
          <a href={post.link} target="_blank" rel="noreferrer">
            SOURCE
          </a>
          <button>READ MORE</button>
        </section>
      ))}
    </main>
  );
}

export default App;
