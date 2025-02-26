import Posts from '@/components/Posts';
import { useEffect } from 'react';

export default function Likes() {
  useEffect(() => {
    document.title = 'Favorites - Vibes';
  }, []);

  return <Posts type="like" />;
}
