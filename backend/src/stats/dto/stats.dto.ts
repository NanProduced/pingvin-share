import { Expose, plainToClass, Type } from "class-transformer";

export class UserStatsDTO {
  @Expose()
  userId: string | null;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  totalFiles: number;

  @Expose()
  totalSize: number;

  @Expose()
  totalShares: number;

  @Expose()
  totalViews: number;

  from(partial: Partial<UserStatsDTO>) {
    return plainToClass(UserStatsDTO, partial, { excludeExtraneousValues: true });
  }

  fromList(partials: Partial<UserStatsDTO>[]) {
    return partials.map((partial) => this.from(partial));
  }
}

export class TimeSeriesStatsDTO {
  @Expose()
  date: string;

  @Expose()
  totalFiles: number;

  @Expose()
  totalSize: number;

  @Expose()
  totalShares: number;

  from(partial: Partial<TimeSeriesStatsDTO>) {
    return plainToClass(TimeSeriesStatsDTO, partial, { excludeExtraneousValues: true });
  }

  fromList(partials: Partial<TimeSeriesStatsDTO>[]) {
    return partials.map((partial) => this.from(partial));
  }
}

export class OverviewStatsDTO {
  @Expose()
  totalUsers: number;

  @Expose()
  totalShares: number;

  @Expose()
  totalFiles: number;

  @Expose()
  totalSize: number;

  @Expose()
  totalViews: number;

  @Expose()
  anonymousShares: number;

  @Expose()
  activeShares: number;

  from(partial: Partial<OverviewStatsDTO>) {
    return plainToClass(OverviewStatsDTO, partial, { excludeExtraneousValues: true });
  }
}

export class StatsResponseDTO {
  @Expose()
  @Type(() => OverviewStatsDTO)
  overview: OverviewStatsDTO;

  @Expose()
  @Type(() => UserStatsDTO)
  userStats: UserStatsDTO[];

  @Expose()
  @Type(() => TimeSeriesStatsDTO)
  timeSeries: TimeSeriesStatsDTO[];

  from(partial: Partial<StatsResponseDTO>) {
    return plainToClass(StatsResponseDTO, partial, { excludeExtraneousValues: true });
  }
}
