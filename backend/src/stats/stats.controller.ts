import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { StatsService } from "./stats.service";
import { StatsResponseDTO } from "./dto/stats.dto";

@Controller("stats")
@UseGuards(JwtGuard, AdministratorGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  async getStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("interval") interval?: "day" | "week" | "month",
  ): Promise<StatsResponseDTO> {
    const overview = await this.statsService.getOverview();
    const userStats = await this.statsService.getUserStats();

    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    const timeSeries = await this.statsService.getTimeSeriesStats(
      parsedStartDate,
      parsedEndDate,
      interval || "day",
    );

    return new StatsResponseDTO().from({
      overview,
      userStats,
      timeSeries,
    });
  }

  @Get("overview")
  async getOverview() {
    return await this.statsService.getOverview();
  }

  @Get("users")
  async getUserStats() {
    return await this.statsService.getUserStats();
  }

  @Get("timeseries")
  async getTimeSeries(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("interval") interval?: "day" | "week" | "month",
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    return await this.statsService.getTimeSeriesStats(
      parsedStartDate,
      parsedEndDate,
      interval || "day",
    );
  }

  @Get("export/csv")
  async exportCSV(@Res() res: Response) {
    const csv = await this.statsService.generateCSV();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="stats_${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send("\uFEFF" + csv);
  }
}
