import { useLocation } from 'react-router';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollProgress } from '@/components/ScrollProgress';

export default function Vibe() {
  const location = useLocation();
  const post = location.state.post;
  const font = post.type === 'horror' ? 'font-horror' : 'font-inter font-black';
  const borderColor =
    post.type === 'horror' ? 'border-red-500' : 'border-blue-500';
  const decorationColor =
    post.type === 'horror' ? 'decoration-red-500' : 'decoration-blue-500';
  const gradient =
    post.type === 'horror'
      ? 'from-red-500 to-red-600'
      : 'from-blue-500 to-blue-600';

  return (
    <main className="motion-opacity-in px-4 duration-300">
      <ScrollProgress className={`${gradient}`} />

      <Markdown
        className="w-full"
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 {...props} className={`${font} mt-4 mb-6 text-5xl`} />
          ),
          h2: ({ node, ...props }) => (
            <h2
              {...props}
              className="font-general mb-4 text-2xl font-semibold"
            />
          ),
          h3: ({ node, ...props }) => (
            <h3 {...props} className="font-general mb-3 text-xl font-medium" />
          ),

          // Paragraphs
          p: ({ node, ...props }) => (
            <p {...props} className="font-lora mb-3 text-lg leading-relaxed" />
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
          td: ({ node, ...props }) => <td {...props} className="border p-2" />,

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
    </main>
  );
}
