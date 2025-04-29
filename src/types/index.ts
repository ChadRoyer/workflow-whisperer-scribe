
export interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  sessionId?: string;
}

export interface AISolution {
  id?: string;
  workflow_id: string;
  step_label: string;
  suggestion: string;
  ai_tool: string;
  complexity: string;
  roi_score: number;
  sources?: { title: string; url: string }[];
  created_at?: string;
}
