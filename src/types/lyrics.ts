export type LyricsTaskStatus = "pending" | "generating" | "success" | "failed";

export interface CreateLyricsParams {
  prompt: string;
}

export interface CreateLyricsTaskResponse {
  taskId: string;
  status: LyricsTaskStatus;
}

export interface LyricsVariant {
  text: string;
  title: string;
  status: "complete" | "failed";
  errorMessage?: string;
}

export interface LyricsTaskDetail {
  id: string;
  provider: string;
  status: LyricsTaskStatus;
  params: {
    prompt: string;
  };
  variants: LyricsVariant[];
  creditCost: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ListLyricsTasksParams {
  page?: number;
  pageSize?: number;
  status?: LyricsTaskStatus;
}

export interface ListLyricsTasksResponse {
  items: LyricsTaskDetail[];
  page: number;
  pageSize: number;
  total: number;
}
