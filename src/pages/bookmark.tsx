import Posts from '@/components/Posts';
import { useEffect } from 'react';

export default function Bookmarks() {
  useEffect(() => {
    document.title = 'Bookmarks ~ Vibes';
  }, []);

  return <Posts type="bookmark" />;
}
