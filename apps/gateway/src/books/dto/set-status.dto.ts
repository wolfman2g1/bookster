export interface SetUserBookStatusDto {
  userId: string;
  status: number;
  startedAt?: string;
  finishedAt?: string;
}
