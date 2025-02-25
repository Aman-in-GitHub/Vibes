import Dexie, { type EntityTable } from 'dexie';
import { PostType } from '@/components/Posts';

export type UserType = {
  id: string;
  name: string;
  email: string;
  age: number;
  sex: 'male' | 'female';
  isNsfw: boolean;
  scrolledPosts: string[];
  readPosts: string[];
};

export type BookmarkType = {
  id: string;
  userId: string;
  postId: string;
  vibe: PostType;
  createdAt: string;
};

export type LikeType = {
  id: string;
  userId: string;
  postId: string;
  vibe: PostType;
  createdAt: string;
};

const db = new Dexie('VibesDatabase') as Dexie & {
  users: EntityTable<UserType, 'id'>;
  likes: EntityTable<LikeType, 'id'>;
  bookmarks: EntityTable<BookmarkType, 'id'>;
};

db.version(1).stores({
  users: 'id, name, isNsfw',
  likes: 'id, userId, postId',
  bookmarks: 'id, userId, postId'
});

export { db };
