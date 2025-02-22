import Dexie, { type EntityTable } from 'dexie';
import { PostType } from '@/pages/feed';

export type ExtendedPostType = PostType & {
  isAuthenticated: boolean;
  isSynced: boolean;
  progress: number;
  isLiked: boolean;
  isBookmarked: boolean;
};

export type UserType = {
  id: string;
  name: string;
  age: number;
  nsfw: boolean;
  isSynced: boolean;
  likedPosts: string[];
  bookmarkedPosts: string[];
};

const db = new Dexie('VibesDatabase') as Dexie & {
  posts: EntityTable<ExtendedPostType, 'id'>;
  users: EntityTable<UserType, 'id'>;
};

db.version(1).stores({
  posts:
    'id, title, content, preview, url, type, author, platform, created_at, scraped_at, tags, isAuthenticated, isSynced, progress, isLiked, isBookmarked',
  users: 'id, name, age, nsfw, likedPosts, bookmarkedPosts'
});

export { db };
