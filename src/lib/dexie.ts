import Dexie, { type EntityTable } from 'dexie';
import { PostType } from '@/components/Posts';

export type UserType = {
  id: string;
  name: string;
  email: string;
  age: number;
  sex: 'male' | 'female';
  isNsfw: boolean;
  isSynced: boolean;
};

export type BookmarkType = {
  id: string;
  userId: string;
  postId: string;
  vibe: PostType;
  createdAt: string;
  isSynced: boolean;
};

export type LikeType = {
  id: string;
  userId: string;
  postId: string;
  vibe: PostType;
  createdAt: string;
  isSynced: boolean;
};

const db = new Dexie('VibesDatabase') as Dexie & {
  users: EntityTable<UserType, 'id'>;
  likes: EntityTable<LikeType, 'id'>;
  bookmarks: EntityTable<BookmarkType, 'id'>;
};

db.version(1).stores({
  users: 'id, name, email, age, sex, nsfw, isSynced',
  likes: 'id, userId, postId, vibe, createdAt, isSynced',
  bookmarks: 'id, userId, postId, vibe, createdAt, isAuthenticated, isSynced'
});

export { db };
