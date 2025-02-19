import { ScrollProgress } from '@/components/ScrollProgress';
import { useLocation } from 'react-router';

export default function Vibe() {
  const location = useLocation();
  const post = location.state?.post;

  return (
    <main className="p-2">
      <ScrollProgress />
      <h1 className="text-3xl">{post.title}</h1>
      <p className="text-lg">{post.content}</p>
    </main>
  );
}
