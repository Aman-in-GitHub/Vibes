import { useLocation } from 'react-router';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollProgress } from '@/components/ScrollProgress';
import { getCurrentUser, getPostTypeStyles } from '@/utils';
import {
  PiHeart as LikeLine,
  PiHeartFill as LikeFill,
  PiBookmarkSimple as BookmarkLine,
  PiBookmarkSimpleFill as BookmarkFill,
  PiPen as Author
} from 'react-icons/pi';
import { handleBookmark, handleLike, PostType } from '@/components/Posts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

export default function Vibe() {
  const location = useLocation();
  const post: PostType = location.state.post;

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

  const {
    font,
    textColor,
    borderColor,
    backgroundColor,
    decorationColor,
    gradientColor
  } = getPostTypeStyles(post.type);

  const isBookmarked = bookmarkedPosts?.has(post.id) ?? false;
  const isLiked = likedPosts?.has(post.id) ?? false;

  return (
    <main className="relative">
      <ScrollProgress className={`${gradientColor}`} />

      {post.content.length < 500 ? (
        <div className="px-4">
          <h1 className={`${font} mt-4 mb-6 text-5xl`}>{post.title}</h1>
          <p className="font-lora mb-3 text-lg">{post.content}</p>
        </div>
      ) : (
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
              <h3 {...props} className="font-geist mb-3 text-xl font-medium" />
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
        >
          {post.content}
        </Markdown>
      )}

      <p className={`${font} flex items-center gap-2 px-4 pb-4 text-xl`}>
        <Author /> {post.author.toUpperCase()}
      </p>

      <div className="flex w-full items-center justify-between px-4 pb-4">
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90`}
        >
          <img
            src={`/sources/${post.platform}.png`}
            alt={`Credits: ${post.platform}`}
            className="size-4"
          />
          <span className="flex items-center gap-2">Source</span>
        </a>
        <button
          onClick={() => handleBookmark(post)}
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90`}
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
          onClick={() => handleLike(post)}
          className={`flex items-center gap-2 rounded-full border-2 ${backgroundColor} ${textColor} px-3 py-2 ${borderColor} duration-300 active:scale-90`}
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
