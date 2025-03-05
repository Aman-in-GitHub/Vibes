import { db, UserType } from '@/lib/dexie';

export function calculateReadingTime(
  text: string,
  wordsPerMinute: number = 200
): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getPostTypeStyles(type: string) {
  switch (type) {
    case 'horror':
      return {
        font: 'font-horror',
        textColor: 'text-red-500',
        borderColor: 'border-red-500',
        backgroundColor: 'bg-red-950',
        decorationColor: 'decoration-red-500',
        gradientColor: 'from-red-500 to-red-600',
        colors: ['#ff4d4d', '#cc0000', '#990000']
      };
    case 'nsfw':
      return {
        font: 'font-nsfw font-bold',
        textColor: 'text-purple-500',
        borderColor: 'border-purple-500',
        backgroundColor: 'bg-purple-950',
        decorationColor: 'decoration-purple-500',
        gradientColor: 'from-purple-500 to-purple-600',
        colors: ['#d48cff', '#a855f7', '#7e22ce']
      };
    case 'funny':
      return {
        font: 'font-comic font-bold',
        textColor: 'text-yellow-500',
        borderColor: 'border-yellow-500',
        backgroundColor: 'bg-yellow-950',
        decorationColor: 'decoration-yellow-500',
        gradientColor: 'from-yellow-500 to-yellow-600',
        colors: ['#fff9c4', '#ffb300', '#ffd700']
      };
    case 'conspiracy':
      return {
        font: 'font-conspiracy font-bold',
        textColor: 'text-teal-500',
        borderColor: 'border-teal-500',
        backgroundColor: 'bg-teal-950',
        decorationColor: 'decoration-teal-500',
        gradientColor: 'from-teal-500 to-teal-600',
        colors: ['#66d9e8', '#20c997', '#198f75']
      };
    default:
      return {
        font: 'font-geist font-bold',
        textColor: 'text-green-500',
        borderColor: 'border-green-500',
        backgroundColor: 'bg-green-950',
        decorationColor: 'decoration-green-500',
        gradientColor: 'from-green-500 to-green-600',
        colors: ['#66ff66', '#33cc33', '#009900']
      };
  }
}

export async function getCurrentUser(): Promise<UserType | null> {
  try {
    const users = await db.users.toArray();

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export function getRandomColor() {
  const colors = [
    '#ea76cb',
    '#8839ef',
    '#d20f39',
    '#e64553',
    '#fe640b',
    '#40a02b',
    '#1e66f5'
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/#+\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function splitTextIntoChunks(
  text: string,
  maxLength: number = 3500
): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const words = text.split(/(\s+)/);

  for (const word of words) {
    if (currentChunk.length + word.length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = '';
    }

    currentChunk += word;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
