export class ListenHubError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(params: { status: number; code: string; message: string; requestId?: string }) {
    super(params.message);
    this.name = "ListenHubError";
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
  }
}
