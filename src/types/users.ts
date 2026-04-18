export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  createdAt: number;
  updatedAt: number;
  activeStatus: string;
  registerSource: string;
  provisionStatus: boolean;
  scopes: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration: number;
  platform: string;
  application: string;
  region: string;
}

export interface SubscriptionInfo {
  subscriptionProductId: string;
  subscriptionStatus: string;
  subscriptionStartedAt: number;
  subscriptionExpiresAt: number;
  usageAvailableMonthlyCredits: number;
  usageTotalMonthlyCredits: number;
  usageAvailablePermanentCredits: number;
  usageTotalPermanentCredits: number;
  usageAvailableLimitedTimeCredits: number;
  totalAvailableCredits: number;
  usageAudioGenerateAvailableAmount: number;
  usageAudioGenerateUsedAmount: number;
  resetAt: number;
  platform: string;
  renewStatus: boolean;
  trialStatus: boolean;
  paidStatus: boolean;
  subscriptionPlan: SubscriptionPlan | Record<string, never>;
}
