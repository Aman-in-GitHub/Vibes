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
        gradientColor: 'from-red-500 to-red-600'
      };
    case 'nsfw':
      return {
        font: 'font-nsfw font-bold',
        textColor: 'text-purple-500',
        borderColor: 'border-purple-500',
        backgroundColor: 'bg-purple-950',
        decorationColor: 'decoration-purple-500',
        gradientColor: 'from-purple-500 to-purple-600'
      };
    case 'funny':
      return {
        font: 'font-comic font-bold',
        textColor: 'text-yellow-500',
        borderColor: 'border-yellow-500',
        backgroundColor: 'bg-yellow-950',
        decorationColor: 'decoration-yellow-500',
        gradientColor: 'from-yellow-500 to-yellow-600'
      };
    default:
      return {
        font: 'font-geist font-bold',
        textColor: 'text-green-500',
        borderColor: 'border-green-500',
        backgroundColor: 'bg-green-950',
        decorationColor: 'decoration-green-500',
        gradientColor: 'from-green-500 to-green-600'
      };
  }
}
