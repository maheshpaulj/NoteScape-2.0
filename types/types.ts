export type User = {
    fullName: string;
    email: string;
    image: string;
}

export type Flag = {
  id: string;
  name: string;
  color: string;
  userId: string;
};


export type Reminder = {
  id: string;
  userId: string;
  message: string;
  reminderTime: Date;
  isDone: boolean;
  flagIds: string[];
  noteId?: string;
  noteTitle?: string;
};
