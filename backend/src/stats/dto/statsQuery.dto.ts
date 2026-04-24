import { IsDateString, IsIn, IsOptional } from "class-validator";

export class StatsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(["day", "week", "month"])
  interval?: "day" | "week" | "month";
}
