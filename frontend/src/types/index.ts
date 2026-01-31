export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface Note {
  id: number;
  title: string;
  subject: string;
  completed: boolean;
}

export interface Assignment {
  id: number;
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

export interface HeatmapData {
  months: string[];
  days: string[];
  data: { [key: string]: number[] };
}