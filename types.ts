
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface StoryState {
  image: string | null;
  text: string;
  isGenerating: boolean;
  isNarrating: boolean;
  analysis: string;
}
