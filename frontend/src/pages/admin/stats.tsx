import {
  Badge,
  Box,
  Button,
  Card,
  Col,
  Grid,
  Group,
  Paper,
  Select,
  Skeleton,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  TbChartBar,
  TbFileDownload,
  TbFileText,
  TbUsers,
} from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import useTranslate from "../../hooks/useTranslate.hook";
import statsService from "../../services/stats.service";
import {
  OverviewStats,
  StatsQueryParams,
  TimeSeriesStats,
  UserStats,
} from "../../types/stats.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";

const Stats = () => {
  const t = useTranslate();

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [interval, setInterval] = useState<"day" | "week" | "month">("day");

  const getStats = async (params?: StatsQueryParams) => {
    setIsLoading(true);
    try {
      const data = await statsService.getStats(params);
      setOverview(data.overview);
      setUserStats(data.userStats);
      setTimeSeries(data.timeSeries);
    } catch (error) {
      toast.axiosError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await statsService.exportCSV();
      toast.success(t("admin.stats.export.success"));
    } catch (error) {
      toast.axiosError(error);
    }
  };

  useEffect(() => {
    getStats({ interval });
  }, [interval]);

  const StatCard = ({
    icon: Icon,
    title,
    value,
    color,
  }: {
    icon: any;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group position="apart" noWrap>
        <Box>
          <Text color="dimmed" size="xs" transform="uppercase" weight={700}>
            {title}
          </Text>
          <Text size="xl" weight={700}>
            {value}
          </Text>
        </Box>
        <Box
          sx={(theme) => ({
            backgroundColor: theme.fn.rgba(color, 0.1),
            borderRadius: theme.radius.md,
            padding: theme.spacing.xs,
          })}
        >
          <Icon size={28} style={{ color }} />
        </Box>
      </Group>
    </Card>
  );

  return (
    <>
      <Meta title={t("admin.stats.title")} />
      <Group position="apart" align="baseline" mb={30}>
        <Title order={3}>
          <FormattedMessage id="admin.stats.title" />
        </Title>
        <Button
          leftIcon={<TbFileDownload size={18} />}
          onClick={handleExportCSV}
          variant="light"
        >
          <FormattedMessage id="admin.stats.button.export" />
        </Button>
      </Group>

      <Grid mb={30}>
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Col key={i} span={6} md={4}>
                <Skeleton height={100} radius="md" />
              </Col>
            ))}
          </>
        ) : (
          <>
            <Col span={6} md={4}>
              <StatCard
                icon={TbUsers}
                title={t("admin.stats.overview.totalUsers")}
                value={overview?.totalUsers || 0}
                color="#228be6"
              />
            </Col>
            <Col span={6} md={4}>
              <StatCard
                icon={TbChartBar}
                title={t("admin.stats.overview.totalShares")}
                value={overview?.totalShares || 0}
                color="#40c057"
              />
            </Col>
            <Col span={6} md={4}>
              <StatCard
                icon={TbFileText}
                title={t("admin.stats.overview.totalFiles")}
                value={overview?.totalFiles || 0}
                color="#fab005"
              />
            </Col>
            <Col span={6} md={4}>
              <StatCard
                icon={TbFileText}
                title={t("admin.stats.overview.totalSize")}
                value={byteToHumanSizeString(overview?.totalSize || 0)}
                color="#f06595"
              />
            </Col>
            <Col span={6} md={4}>
              <StatCard
                icon={TbUsers}
                title={t("admin.stats.overview.anonymousShares")}
                value={overview?.anonymousShares || 0}
                color="#868e96"
              />
            </Col>
            <Col span={6} md={4}>
              <StatCard
                icon={TbChartBar}
                title={t("admin.stats.overview.activeShares")}
                value={overview?.activeShares || 0}
                color="#9775fa"
              />
            </Col>
          </>
        )}
      </Grid>

      <Paper withBorder p="md" mb={30}>
        <Group position="apart" mb="md">
          <Title order={5}>
            <FormattedMessage id="admin.stats.timeSeries.title" />
          </Title>
          <Select
            value={interval}
            onChange={(value) =>
              setInterval(value as "day" | "week" | "month")
            }
            data={[
              { value: "day", label: t("admin.stats.timeSeries.interval.day") },
              { value: "week", label: t("admin.stats.timeSeries.interval.week") },
              {
                value: "month",
                label: t("admin.stats.timeSeries.interval.month"),
              },
            ]}
            style={{ width: 120 }}
          />
        </Group>

        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table verticalSpacing="sm">
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="admin.stats.timeSeries.table.date" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.timeSeries.table.shares" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.timeSeries.table.files" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.timeSeries.table.size" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(7)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                    </tr>
                  ))
                : timeSeries.map((stat) => (
                    <tr key={stat.date}>
                      <td>{stat.date}</td>
                      <td>{stat.totalShares}</td>
                      <td>{stat.totalFiles}</td>
                      <td>{byteToHumanSizeString(stat.totalSize)}</td>
                    </tr>
                  ))}
            </tbody>
          </Table>
        </Box>
      </Paper>

      <Paper withBorder p="md">
        <Title order={5} mb="md">
          <FormattedMessage id="admin.stats.userStats.title" />
        </Title>

        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table verticalSpacing="sm">
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="admin.stats.userStats.table.user" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.userStats.table.shares" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.userStats.table.files" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.userStats.table.size" />
                </th>
                <th>
                  <FormattedMessage id="admin.stats.userStats.table.views" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                    </tr>
                  ))
                : userStats.length === 0
                ? [
                    <tr key="empty">
                      <td colSpan={5}>
                        <Text color="dimmed" align="center">
                          <FormattedMessage id="admin.stats.userStats.empty" />
                        </Text>
                      </td>
                    </tr>,
                  ]
                : userStats.map((stat) => (
                    <tr key={stat.userId || "anonymous"}>
                      <td>
                        {stat.userId === null ? (
                          <Badge color="gray">
                            {t("admin.stats.userStats.anonymous")}
                          </Badge>
                        ) : (
                          <Group>
                            <Text weight={500}>{stat.username}</Text>
                            <Text size="xs" color="dimmed">
                              ({stat.email})
                            </Text>
                          </Group>
                        )}
                      </td>
                      <td>{stat.totalShares}</td>
                      <td>{stat.totalFiles}</td>
                      <td>{byteToHumanSizeString(stat.totalSize)}</td>
                      <td>{stat.totalViews}</td>
                    </tr>
                  ))}
            </tbody>
          </Table>
        </Box>
      </Paper>
    </>
  );
};

export default Stats;
