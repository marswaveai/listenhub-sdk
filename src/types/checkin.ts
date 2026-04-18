export interface CheckinResponse {
  checkinDate: string;
  rewardCredits: number;
}

export interface CheckinStatusResponse {
  status: "checked_in" | "not_checked_in";
  hasCheckedInToday: boolean;
  lastCheckinTime: number;
  monthlyCheckinCount: number;
}
