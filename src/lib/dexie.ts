import Dexie, { type EntityTable } from 'dexie';

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
  createdAt: string;
  isSynced: boolean;
};

export type LikeType = {
  id: string;
  userId: string;
  postId: string;
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
  likes: 'id, userId, postId, createdAt, isSynced',
  bookmarks: 'id, userId, postId, createdAt, isAuthenticated, isSynced'
});

export { db };
