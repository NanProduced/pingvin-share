import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { StatsService } from "./stats.service";
import { StatsResponseDTO } from "./dto/stats.dto";
import { StatsQueryDto } from "./dto/statsQuery.dto";

@Controller("stats")
@UseGuards(JwtGuard, AdministratorGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  async getStats(
    @Query() query: StatsQueryDto,
  ): Promise<StatsResponseDTO> {
    const overview = await this.statsService.getOverview();
    const userStats = await this.statsService.getUserStats();

    const parsedStartDate = query.startDate
      ? new Date(query.startDate)
      : undefined;
    const parsedEndDate = query.endDate ? new Date(query.endDate) : undefined;
    const timeSeries = await this.statsService.getTimeSeriesStats(
      parsedStartDate,
      parsedEndDate,
      query.interval || "day",
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
  async getTimeSeries(@Query() query: StatsQueryDto) {
    const parsedStartDate = query.startDate
      ? new Date(query.startDate)
      : undefined;
    const parsedEndDate = query.endDate ? new Date(query.endDate) : undefined;
    return await this.statsService.getTimeSeriesStats(
      parsedStartDate,
      parsedEndDate,
      query.interval || "day",
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
