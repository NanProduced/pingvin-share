import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as moment from "moment";
import { OverviewStatsDTO, TimeSeriesStatsDTO, UserStatsDTO } from "./dto/stats.dto";

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<OverviewStatsDTO> {
    const totalUsers = await this.prisma.user.count();

    const totalShares = await this.prisma.share.count();

    const anonymousShares = await this.prisma.share.count({
      where: { creatorId: null },
    });

    const activeShares = await this.prisma.share.count({
      where: {
        OR: [
          { expiration: { gt: new Date() } },
          { expiration: { equals: moment(0).toDate() } },
        ],
      },
    });

    const allShares = await this.prisma.share.findMany({
      include: { files: true },
    });

    const totalFiles = allShares.reduce((acc, share) => acc + share.files.length, 0);
    const totalSize = allShares.reduce(
      (acc, share) => acc + share.files.reduce((a, f) => a + parseInt(f.size), 0),
      0,
    );
    const totalViews = allShares.reduce((acc, share) => acc + share.views, 0);

    return new OverviewStatsDTO().from({
      totalUsers,
      totalShares,
      totalFiles,
      totalSize,
      totalViews,
      anonymousShares,
      activeShares,
    });
  }

  async getUserStats(): Promise<UserStatsDTO[]> {
    const users = await this.prisma.user.findMany({
      include: {
        shares: {
          include: { files: true },
        },
      },
    });

    const userStats: UserStatsDTO[] = users.map((user) => {
      const totalShares = user.shares.length;
      const totalFiles = user.shares.reduce((acc, share) => acc + share.files.length, 0);
      const totalSize = user.shares.reduce(
        (acc, share) => acc + share.files.reduce((a, f) => a + parseInt(f.size), 0),
        0,
      );
      const totalViews = user.shares.reduce((acc, share) => acc + share.views, 0);

      return new UserStatsDTO().from({
        userId: user.id,
        username: user.username,
        email: user.email,
        totalShares,
        totalFiles,
        totalSize,
        totalViews,
      });
    });

    const anonymousShares = await this.prisma.share.findMany({
      where: { creatorId: null },
      include: { files: true },
    });

    if (anonymousShares.length > 0) {
      const anonymousFiles = anonymousShares.reduce((acc, share) => acc + share.files.length, 0);
      const anonymousSize = anonymousShares.reduce(
        (acc, share) => acc + share.files.reduce((a, f) => a + parseInt(f.size), 0),
        0,
      );
      const anonymousViews = anonymousShares.reduce((acc, share) => acc + share.views, 0);

      userStats.push(
        new UserStatsDTO().from({
          userId: null,
          username: "Anonymous",
          email: "",
          totalShares: anonymousShares.length,
          totalFiles: anonymousFiles,
          totalSize: anonymousSize,
          totalViews: anonymousViews,
        }),
      );
    }

    return userStats.sort((a, b) => b.totalSize - a.totalSize);
  }

  async getTimeSeriesStats(
    startDate?: Date,
    endDate?: Date,
    interval: "day" | "week" | "month" = "day",
  ): Promise<TimeSeriesStatsDTO[]> {
    const now = new Date();
    const defaultEnd = endDate || now;
    const defaultStart = startDate || moment(now).subtract(30, "days").toDate();

    const shares = await this.prisma.share.findMany({
      where: {
        createdAt: {
          gte: defaultStart,
          lte: defaultEnd,
        },
      },
      include: { files: true },
      orderBy: { createdAt: "asc" },
    });

    const statsMap = new Map<string, TimeSeriesStatsDTO>();

    shares.forEach((share) => {
      const dateKey = this.formatDateKey(share.createdAt, interval);

      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, {
          date: dateKey,
          totalFiles: 0,
          totalSize: 0,
          totalShares: 0,
        });
      }

      const stat = statsMap.get(dateKey)!;
      stat.totalShares += 1;
      stat.totalFiles += share.files.length;
      stat.totalSize += share.files.reduce((acc, f) => acc + parseInt(f.size), 0);
    });

    this.fillMissingDates(statsMap, defaultStart, defaultEnd, interval);

    return Array.from(statsMap.values())
      .map((s) => new TimeSeriesStatsDTO().from(s))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private formatDateKey(date: Date, interval: "day" | "week" | "month"): string {
    const m = moment(date);
    switch (interval) {
      case "week":
        return m.startOf("week").format("YYYY-MM-DD");
      case "month":
        return m.format("YYYY-MM");
      case "day":
      default:
        return m.format("YYYY-MM-DD");
    }
  }

  private fillMissingDates(
    statsMap: Map<string, TimeSeriesStatsDTO>,
    startDate: Date,
    endDate: Date,
    interval: "day" | "week" | "month",
  ): void {
    let current = moment(startDate).startOf(interval === "day" ? "day" : interval);
    const end = moment(endDate).endOf(interval === "day" ? "day" : interval);

    while (current.isBefore(end) || current.isSame(end, interval === "month" ? "month" : "day")) {
      const key = this.formatDateKey(current.toDate(), interval);
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          date: key,
          totalFiles: 0,
          totalSize: 0,
          totalShares: 0,
        });
      }
      current.add(1, interval);
    }
  }

  async generateCSV(): Promise<string> {
    const overview = await this.getOverview();
    const userStats = await this.getUserStats();
    const timeSeries = await this.getTimeSeriesStats();

    let csv = "=== Overview Stats ===\n";
    csv += "Metric,Value\n";
    csv += `Total Users,${overview.totalUsers}\n`;
    csv += `Total Shares,${overview.totalShares}\n`;
    csv += `Total Files,${overview.totalFiles}\n`;
    csv += `Total Size (bytes),${overview.totalSize}\n`;
    csv += `Total Views,${overview.totalViews}\n`;
    csv += `Anonymous Shares,${overview.anonymousShares}\n`;
    csv += `Active Shares,${overview.activeShares}\n\n`;

    csv += "=== User Stats ===\n";
    csv += "User ID,Username,Email,Total Shares,Total Files,Total Size (bytes),Total Views\n";
    userStats.forEach((stat) => {
      csv += `${stat.userId || "anonymous"},"${stat.username}","${stat.email}",${stat.totalShares},${stat.totalFiles},${stat.totalSize},${stat.totalViews}\n`;
    });
    csv += "\n";

    csv += "=== Time Series Stats (Last 30 Days) ===\n";
    csv += "Date,Total Shares,Total Files,Total Size (bytes)\n";
    timeSeries.forEach((stat) => {
      csv += `${stat.date},${stat.totalShares},${stat.totalFiles},${stat.totalSize}\n`;
    });

    return csv;
  }
}
