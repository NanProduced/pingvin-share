import {
  OverviewStats,
  StatsQueryParams,
  StatsResponse,
  TimeSeriesStats,
  UserStats,
} from "../types/stats.type";
import api from "./api.service";

const getStats = async (params?: StatsQueryParams): Promise<StatsResponse> => {
  return (await api.get("stats", { params })).data;
};

const getOverview = async (): Promise<OverviewStats> => {
  return (await api.get("stats/overview")).data;
};

const getUserStats = async (): Promise<UserStats[]> => {
  return (await api.get("stats/users")).data;
};

const getTimeSeries = async (params?: StatsQueryParams): Promise<TimeSeriesStats[]> => {
  return (await api.get("stats/timeseries", { params })).data;
};

const exportCSV = async (): Promise<void> => {
  const response = await api.get("stats/export/csv", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  const now = new Date().toISOString().split("T")[0];
  link.setAttribute("download", `stats_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default {
  getStats,
  getOverview,
  getUserStats,
  getTimeSeries,
  exportCSV,
};
