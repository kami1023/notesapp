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
  history?: {
    sections: NoteSection[];
    timestamp: number;
    label: string;
  }[];
}

export type ViewMode = 'editor' | 'display';
