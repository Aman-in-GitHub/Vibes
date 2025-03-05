import Posts from '@/components/Posts';
import { useEffect } from 'react';

export default function Feed() {
  useEffect(() => {
    document.title = 'For You ~ Vibes';
  }, []);

  return <Posts type="feed" />;
}
