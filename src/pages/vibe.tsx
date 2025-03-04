import { useLocation, useParams } from 'react-router';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrollProgress } from '@/components/ScrollProgress';
import {
  getCurrentUser,
  getPostTypeStyles,
  splitTextIntoChunks,
  stripMarkdown
} from '@/utils';
import {
  PiHeart as LikeLine,
  PiHeartFill as LikeFill,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill,
  PiPen as Author,
  PiWaveform as Voice,
  PiStop as Stop,
  PiPlay as Play,
  PiX as X
} from 'react-icons/pi';
import { handleBookmark, handleLike, PostType } from '@/components/Posts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, UserType } from '@/lib/dexie';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Loader from '@/components/Loader';
import { toast } from 'sonner';
import { useIsOnline } from '@/hooks/useIsOnline';
import useAuth from '@/hooks/useAuth';
import { useUserStore } from '@/context/UserStore';
import { motion } from 'motion/react';
import AnimatedGradient from '@/components/AnimatedGradient';

export default function Vibe() {
  const { isOffline } = useIsOnline();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { id } = useParams();
  const [post, setPost] = useState<PostType>(location.state?.post ?? null);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [isTTSMode, setTTSMode] = useState(false);

  useEffect(() => {
    function handleBeforeUnload() {
      window.speechSynthesis.cancel();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!post) return;

    const synth = window.speechSynthesis;
    const text = stripMarkdown(post.content);
    const chunks = splitTextIntoChunks(text);

    setTextChunks(chunks);

    setCurrentChunkIndex(0);

    return () => {
      synth.cancel();
    };
  }, [post]);

  function handlePlay() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (textChunks.length === 0) return;

    const synth = window.speechSynthesis;

    const currentChunk = textChunks[currentChunkIndex];
    const u = new SpeechSynthesisUtterance(currentChunk);

    u.lang = 'en-US';
    u.pitch = post.type === 'horror' ? 0.6 : post.type === 'nsfw' ? 1.2 : 1;
    u.rate = post.type === 'horror' ? 0.85 : post.type === 'nsfw' ? 0.9 : 1;
    u.volume = 1;

    u.onend = () => {
      const nextIndex = currentChunkIndex + 1;

      if (nextIndex < textChunks.length) {
        setCurrentChunkIndex(nextIndex);
        const nextChunk = textChunks[nextIndex];
        const nextUtterance = new SpeechSynthesisUtterance(nextChunk);
        nextUtterance.lang = 'en-US';
        nextUtterance.pitch =
          post.type === 'horror' ? 0.6 : post.type === 'nsfw' ? 1.2 : 1;
        nextUtterance.rate =
          post.type === 'horror' ? 0.85 : post.type === 'nsfw' ? 0.9 : 1;
        nextUtterance.volume = 1;

        synth.speak(nextUtterance);
        setIsPlaying(true);
      } else {
        setCurrentChunkIndex(0);
      }
    };

    synth.speak(u);
    setIsPlaying(true);
  }

  function handleStop() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    setCurrentChunkIndex(0);
    setIsPlaying(false);
  }

  useEffect(() => {
    if (!isAuthenticated || !post) return;

    const timeout = setTimeout(async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        if (user?.readPosts?.includes(post.id)) {
          return;
        }

        const updatedReadPosts = [...user.readPosts, post.id];

        await supabase
          .from('profiles')
          .update({ read_posts: updatedReadPosts })
          .eq('auth_id', user.id);

        await db.users.update(user.id, { readPosts: updatedReadPosts });
        const updatedUser = await db.users.get(user.id);
        setUser(updatedUser as UserType);
      } catch (error) {
        console.error('Error updating read posts:', error);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, post]);

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error("Couldn't find the vibe you're looking for");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setPost(data);
    }

    if (!post) {
      fetchPost();
    }
  }, []);

  useEffect(() => {
    if (!post) return;
    document.title = `${post.title}`;
  }, [post]);

  const bookmarkedPosts = useLiveQuery(
    async () => {
      if (!user?.id) return new Set<string>();

      const bookmarks = await db.bookmarks
        .where('userId')
        .equals(user?.id)
        .toArray();

      return new Set(bookmarks.map((b) => b.postId));
    },
    [user?.id],
    new Set<string>()
  );

  const likedPosts = useLiveQuery(
    async () => {
      if (!user?.id) return new Set<string>();

      const likes = await db.likes.where('userId').equals(user?.id).toArray();

      return new Set(likes.map((l) => l.postId));
    },
    [user?.id],
    new Set<string>()
  );

  if (!post) {
    return (
      <section className="motion-preset-slide-right motion-preset-blur-right flex h-[100dvh] flex-col items-center justify-center">
        <Loader />
      </section>
    );
  }

  const {
    font,
    textColor,
    borderColor,
    backgroundColor,
    decorationColor,
    gradientColor,
    colors
  } = getPostTypeStyles(post.type);

  const isBookmarked = bookmarkedPosts?.has(post.id) ?? false;
  const isLiked = likedPosts?.has(post.id) ?? false;

  if (isTTSMode) {
    return (
      <motion.div className="motion-duration-1000 motion-blur-in flex h-[100dvh] flex-col items-center justify-center gap-12">
        <AnimatedGradient colors={colors} speed={0.1} blur="medium" />

        <button
          className={`fixed top-2 right-2 z-[100] flex size-10 items-center justify-center rounded-full bg-[#111] ${borderColor} border-2`}
          onClick={() => {
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            handleStop();
            setTTSMode(!isTTSMode);
          }}
        >
          <X className="text-2xl text-white" />
        </button>
        <button
          className="motion-preset-slide-left-md rounded-full bg-red-950 p-8 duration-500 active:scale-90"
          onClick={() => handleStop()}
        >
          <Stop className="text-8xl text-red-600" />
        </button>
        <button
          className="motion-preset-slide-right-md rounded-full bg-green-950 p-8 duration-500 active:scale-90"
          onClick={() => (isPlaying ? handleStop() : handlePlay())}
        >
          {isPlaying ? (
            <Voice className="text-8xl text-green-600" />
          ) : (
            <Play className="text-8xl text-green-600" />
          )}
        </button>
      </motion.div>
    );
  }

  return (
    <main className="relative">
      {post.content.length < 450 ? (
        <div className="px-4">
          <h1 className={`${font} mt-4 mb-6 text-5xl`}>{post.title}</h1>
          <p className="font-lora mb-3 text-lg">{post.content}</p>
        </div>
      ) : (
        <>
          <ScrollProgress className={`${gradientColor}`} />

          <Markdown
            className="w-full px-4"
            components={{
              // Headings
              h1: ({ node, ...props }) => (
                <h1 {...props} className={`${font} mt-4 mb-6 text-5xl`} />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  {...props}
                  className="font-geist mb-4 text-2xl font-semibold"
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  {...props}
                  className="font-geist mb-3 text-xl font-medium"
                />
              ),

              // Paragraphs
              p: ({ node, ...props }) => (
                <p {...props} className="font-lora mb-3 text-lg" />
              ),

              // Links
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  className={`cursor-pointer underline ${decorationColor} underline-offset-2`}
                />
              ),

              // Lists
              ul: ({ node, ...props }) => (
                <ul {...props} className="mb-4 ml-6 list-disc" />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className="mb-4 ml-6 list-decimal" />
              ),
              li: ({ node, ...props }) => <li {...props} className="mb-2" />,

              // Code
              code: ({ node, ...props }) => (
                <code
                  {...props}
                  className="block overflow-x-auto rounded-lg bg-neutral-900 p-4 font-mono text-sm"
                />
              ),

              // Blockquote
              blockquote: ({ node, ...props }) => (
                <blockquote
                  {...props}
                  className={`my-4 border-l-4 ${borderColor} pl-4 italic`}
                />
              ),

              // Tables
              table: ({ node, ...props }) => (
                <table {...props} className="mb-4 w-full border-collapse" />
              ),
              th: ({ node, ...props }) => (
                <th
                  {...props}
                  className="border bg-neutral-100 p-2 text-left font-semibold"
                />
              ),
              td: ({ node, ...props }) => (
                <td {...props} className="border p-2" />
              ),

              // Images
              img: ({ node, ...props }) => (
                <img {...props} className="my-4 h-auto max-w-full rounded-lg" />
              ),

              // Horizontal Rule
              hr: ({ node, ...props }) => (
                <hr {...props} className="my-6 border-t border-neutral-400" />
              )
            }}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {post.content}
          </Markdown>

          <button
            className={`fixed top-2 right-2 z-[100] flex size-10 items-center justify-center rounded-full bg-[#111] ${borderColor} border-2`}
            onClick={() => {
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
              setTTSMode(!isTTSMode);
            }}
          >
            <Voice className="text-2xl text-white" />
          </button>
        </>
      )}

      <p className={`${font} flex items-center gap-2 px-4 pb-4 text-xl`}>
        <Author /> {post.author.toUpperCase()}
      </p>

      <div className="flex w-full items-center justify-between px-4 pb-4">
        <button
          disabled={isOffline}
          onClick={() => window.open(post.url, '_blank', 'noreferrer')}
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
        >
          <img
            src={`/sources/${post.platform}.png`}
            alt={`Credits: ${post.platform}`}
            className="size-4"
          />
          <span className="flex items-center gap-2">Source</span>
        </button>

        <button
          disabled={isOffline}
          onClick={() => handleBookmark(post)}
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
        >
          {isBookmarked ? (
            <BookmarkFill className="text-xl" />
          ) : (
            <BookmarkLine className="text-xl" />
          )}
          <span className="flex items-center gap-2">
            {isBookmarked ? 'Saved' : 'Save'}
          </span>
        </button>
        <button
          disabled={isOffline}
          onClick={() => handleLike(post)}
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
        >
          {isLiked ? (
            <LikeFill className="text-xl" />
          ) : (
            <LikeLine className="text-xl" />
          )}
          <span className="flex items-center gap-2">
            {isLiked ? 'Liked' : 'Like'}
          </span>
        </button>
      </div>
    </main>
  );
}
