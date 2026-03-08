export interface NoteSection {
  topic: string;
  points: string[];
}

export interface Note {
  id: string;
  title: string;
  sourceUrl?: string;
  sections: NoteSection[];
  createdAt: number;
  color: string;
}

export type ViewMode = 'editor' | 'display';
