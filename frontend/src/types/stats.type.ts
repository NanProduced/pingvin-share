export type OverviewStats = {
  totalUsers: number;
  totalShares: number;
  totalFiles: number;
  totalSize: number;
  totalViews: number;
  anonymousShares: number;
  activeShares: number;
};

export type UserStats = {
  userId: string | null;
  username: string;
  email: string;
  totalFiles: number;
  totalSize: number;
  totalShares: number;
  totalViews: number;
};

export type TimeSeriesStats = {
  date: string;
  totalFiles: number;
  totalSize: number;
  totalShares: number;
};

export type StatsResponse = {
  overview: OverviewStats;
  userStats: UserStats[];
  timeSeries: TimeSeriesStats[];
};

export type StatsQueryParams = {
  startDate?: string;
  endDate?: string;
  interval?: "day" | "week" | "month";
};
