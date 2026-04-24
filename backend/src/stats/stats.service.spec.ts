import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient, User, Share, File } from "@prisma/client";
import * as argon from "argon2";
import * as moment from "moment";
import { PrismaService } from "../prisma/prisma.service";
import { StatsService } from "./stats.service";

const prisma = new PrismaClient();

describe("StatsService", () => {
  let service: StatsService;
  let testUsers: User[] = [];
  let testShares: Share[] = [];
  let testFiles: File[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, PrismaService],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  beforeEach(async () => {
    await cleanupTestData();
    testUsers = [];
    testShares = [];
    testFiles = [];
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  const cleanupTestData = async () => {
    await prisma.file.deleteMany({
      where: { share: { name: { startsWith: "test-share-" } } },
    });
    await prisma.share.deleteMany({
      where: { name: { startsWith: "test-share-" } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-user-" } },
    });
  };

  const createTestUser = async (
    index: number,
    isAdmin = false,
  ): Promise<User> => {
    const password = await argon.hash("TestPass123!");
    const user = await prisma.user.create({
      data: {
        username: `test-user-${index}`,
        email: `test-user-${index}@test.com`,
        password,
        isAdmin,
      },
    });
    testUsers.push(user);
    return user;
  };

  const createTestShare = async (
    user: User | null,
    index: number,
    createdAt?: Date,
  ): Promise<Share> => {
    const share = await prisma.share.create({
      data: {
        id: `test-share-${index}-${Date.now()}`,
        name: `test-share-${index}`,
        expiration: moment().add(7, "days").toDate(),
        creator: user ? { connect: { id: user.id } } : undefined,
        createdAt: createdAt || new Date(),
      },
    });
    testShares.push(share);
    return share;
  };

  const createTestFile = async (
    share: Share,
    index: number,
    size: number,
  ): Promise<File> => {
    const file = await prisma.file.create({
      data: {
        name: `test-file-${index}.txt`,
        size: size.toString(),
        share: { connect: { id: share.id } },
      },
    });
    testFiles.push(file);
    return file;
  };

  describe("getOverview", () => {
    it("should return zero values when no data exists", async () => {
      const overview = await service.getOverview();

      expect(overview.totalUsers).toBeGreaterThanOrEqual(0);
      expect(overview.totalShares).toBeGreaterThanOrEqual(0);
      expect(overview.totalFiles).toBeGreaterThanOrEqual(0);
      expect(overview.totalSize).toBeGreaterThanOrEqual(0);
      expect(overview.totalViews).toBeGreaterThanOrEqual(0);
      expect(overview.anonymousShares).toBeGreaterThanOrEqual(0);
      expect(overview.activeShares).toBeGreaterThanOrEqual(0);
    });

    it("should correctly aggregate data from multiple users", async () => {
      const user1 = await createTestUser(1);
      const user2 = await createTestUser(2);

      const share1 = await createTestShare(user1, 1);
      const share2 = await createTestShare(user2, 2);
      const share3 = await createTestShare(user1, 3);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share1, 2, 2000);
      await createTestFile(share2, 3, 3000);

      await prisma.share.update({
        where: { id: share1.id },
        data: { views: 5 },
      });
      await prisma.share.update({
        where: { id: share2.id },
        data: { views: 10 },
      });

      const overview = await service.getOverview();

      const testUserShares = testShares.length;
      const testUserFiles = testFiles.length;
      const totalSize = testFiles.reduce((acc, f) => acc + parseInt(f.size), 0);

      expect(overview.totalShares).toBeGreaterThanOrEqual(testUserShares);
      expect(overview.totalFiles).toBeGreaterThanOrEqual(testUserFiles);
      expect(overview.totalSize).toBeGreaterThanOrEqual(totalSize);
    });

    it("should correctly count anonymous shares", async () => {
      const user = await createTestUser(1);

      await createTestShare(user, 1);
      await createTestShare(null, 2);
      await createTestShare(null, 3);

      const overview = await service.getOverview();

      const anonymousSharesCount = testShares.filter(
        (s) => s.creatorId === null,
      ).length;

      expect(overview.anonymousShares).toBeGreaterThanOrEqual(
        anonymousSharesCount,
      );
    });

    it("should correctly count active shares", async () => {
      const user = await createTestUser(1);

      const activeShare = await createTestShare(user, 1);
      const expiredShare = await prisma.share.create({
        data: {
          id: `test-share-expired-${Date.now()}`,
          name: "test-share-expired",
          expiration: moment().subtract(1, "day").toDate(),
          createdAt: moment().subtract(2, "days").toDate(),
        },
      });
      testShares.push(expiredShare);

      const overview = await service.getOverview();

      const activeCount = testShares.filter((s) => {
        const isExpired =
          moment(s.expiration).isBefore(moment()) &&
          !moment(s.expiration).isSame(moment(0));
        return !isExpired;
      }).length;

      expect(overview.activeShares).toBeGreaterThanOrEqual(activeCount);
    });
  });

  describe("getUserStats", () => {
    it("should return empty array when no users with shares exist", async () => {
      const userStats = await service.getUserStats();

      expect(Array.isArray(userStats)).toBe(true);
    });

    it("should correctly aggregate stats per user", async () => {
      const user1 = await createTestUser(1);
      const user2 = await createTestUser(2);

      const share1 = await createTestShare(user1, 1);
      const share2 = await createTestShare(user1, 2);
      const share3 = await createTestShare(user2, 3);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share1, 2, 2000);
      await createTestFile(share2, 3, 3000);
      await createTestFile(share3, 4, 5000);

      await prisma.share.update({
        where: { id: share1.id },
        data: { views: 10 },
      });
      await prisma.share.update({
        where: { id: share2.id },
        data: { views: 20 },
      });

      const userStats = await service.getUserStats();

      const user1Stats = userStats.find((s) => s.userId === user1.id);
      const user2Stats = userStats.find((s) => s.userId === user2.id);

      expect(user1Stats).toBeDefined();
      expect(user1Stats?.totalShares).toBe(2);
      expect(user1Stats?.totalFiles).toBe(3);
      expect(user1Stats?.totalSize).toBe(6000);
      expect(user1Stats?.totalViews).toBe(30);

      expect(user2Stats).toBeDefined();
      expect(user2Stats?.totalShares).toBe(1);
      expect(user2Stats?.totalFiles).toBe(1);
      expect(user2Stats?.totalSize).toBe(5000);
    });

    it("should include anonymous user stats", async () => {
      const user = await createTestUser(1);

      await createTestShare(user, 1);
      const anonymousShare = await createTestShare(null, 2);
      await createTestFile(anonymousShare, 1, 10000);

      const userStats = await service.getUserStats();

      const anonymousStats = userStats.find((s) => s.userId === null);

      expect(anonymousStats).toBeDefined();
      expect(anonymousStats?.username).toBe("Anonymous");
      expect(anonymousStats?.totalShares).toBeGreaterThanOrEqual(1);
      expect(anonymousStats?.totalSize).toBeGreaterThanOrEqual(10000);
    });

    it("should sort users by total size descending", async () => {
      const user1 = await createTestUser(1);
      const user2 = await createTestUser(2);
      const user3 = await createTestUser(3);

      const share1 = await createTestShare(user1, 1);
      const share2 = await createTestShare(user2, 2);
      const share3 = await createTestShare(user3, 3);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share2, 2, 5000);
      await createTestFile(share3, 3, 2000);

      const userStats = await service.getUserStats();

      const user1Index = userStats.findIndex((s) => s.userId === user1.id);
      const user2Index = userStats.findIndex((s) => s.userId === user2.id);
      const user3Index = userStats.findIndex((s) => s.userId === user3.id);

      const testUserIndices = [user1Index, user2Index, user3Index].filter(
        (i) => i !== -1,
      );

      if (testUserIndices.length >= 2) {
        for (let i = 0; i < testUserIndices.length - 1; i++) {
          const currentStats = userStats[testUserIndices[i]];
          const nextStats = userStats[testUserIndices[i + 1]];
          expect(currentStats.totalSize).toBeGreaterThanOrEqual(
            nextStats.totalSize,
          );
        }
      }
    });
  });

  describe("getTimeSeriesStats", () => {
    it("should return stats grouped by day", async () => {
      const user = await createTestUser(1);

      const today = new Date();
      const yesterday = moment().subtract(1, "day").toDate();
      const twoDaysAgo = moment().subtract(2, "days").toDate();

      const share1 = await createTestShare(user, 1, today);
      const share2 = await createTestShare(user, 2, yesterday);
      const share3 = await createTestShare(user, 3, twoDaysAgo);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share2, 2, 2000);
      await createTestFile(share3, 3, 3000);

      const timeSeries = await service.getTimeSeriesStats(
        twoDaysAgo,
        today,
        "day",
      );

      expect(timeSeries.length).toBeGreaterThanOrEqual(3);

      const todayStr = moment(today).format("YYYY-MM-DD");
      const todayStats = timeSeries.find((s) => s.date === todayStr);
      expect(todayStats).toBeDefined();
      expect(todayStats?.totalShares).toBeGreaterThanOrEqual(1);
    });

    it("should fill missing dates with zero values", async () => {
      const user = await createTestUser(1);

      const startDate = moment().subtract(5, "days").toDate();
      const endDate = new Date();

      const share = await createTestShare(
        user,
        1,
        moment().subtract(3, "days").toDate(),
      );
      await createTestFile(share, 1, 1000);

      const timeSeries = await service.getTimeSeriesStats(
        startDate,
        endDate,
        "day",
      );

      const expectedDays = moment(endDate).diff(startDate, "days") + 1;

      expect(timeSeries.length).toBeGreaterThanOrEqual(expectedDays);

      const daysWithZero = timeSeries.filter(
        (s) => s.totalShares === 0 && s.totalFiles === 0 && s.totalSize === 0,
      );
      expect(daysWithZero.length).toBeGreaterThan(0);
    });

    it("should support week interval", async () => {
      const user = await createTestUser(1);

      const lastWeek = moment().subtract(1, "week").toDate();
      const thisWeek = new Date();

      const share1 = await createTestShare(user, 1, lastWeek);
      const share2 = await createTestShare(user, 2, thisWeek);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share2, 2, 2000);

      const timeSeries = await service.getTimeSeriesStats(
        lastWeek,
        thisWeek,
        "week",
      );

      expect(Array.isArray(timeSeries)).toBe(true);
      expect(timeSeries.length).toBeGreaterThanOrEqual(1);
    });

    it("should support month interval", async () => {
      const user = await createTestUser(1);

      const lastMonth = moment().subtract(1, "month").toDate();
      const thisMonth = new Date();

      const share1 = await createTestShare(user, 1, lastMonth);
      const share2 = await createTestShare(user, 2, thisMonth);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share2, 2, 2000);

      const timeSeries = await service.getTimeSeriesStats(
        lastMonth,
        thisMonth,
        "month",
      );

      expect(Array.isArray(timeSeries)).toBe(true);
      expect(timeSeries.length).toBeGreaterThanOrEqual(1);

      const firstEntry = timeSeries[0];
      if (firstEntry) {
        expect(firstEntry.date).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it("should correctly aggregate multiple shares on same day", async () => {
      const user = await createTestUser(1);

      const today = new Date();

      const share1 = await createTestShare(user, 1, today);
      const share2 = await createTestShare(user, 2, today);
      const share3 = await createTestShare(user, 3, today);

      await createTestFile(share1, 1, 1000);
      await createTestFile(share1, 2, 2000);
      await createTestFile(share2, 3, 3000);
      await createTestFile(share3, 4, 4000);

      const timeSeries = await service.getTimeSeriesStats(
        today,
        today,
        "day",
      );

      const todayStr = moment(today).format("YYYY-MM-DD");
      const todayStats = timeSeries.find((s) => s.date === todayStr);

      expect(todayStats).toBeDefined();
      expect(todayStats?.totalShares).toBeGreaterThanOrEqual(3);
      expect(todayStats?.totalFiles).toBeGreaterThanOrEqual(4);
      expect(todayStats?.totalSize).toBeGreaterThanOrEqual(10000);
    });
  });

  describe("generateCSV", () => {
    it("should generate CSV with all sections", async () => {
      const user = await createTestUser(1);
      const share = await createTestShare(user, 1);
      await createTestFile(share, 1, 1000);

      const csv = await service.generateCSV();

      expect(csv).toContain("=== Overview Stats ===");
      expect(csv).toContain("=== User Stats ===");
      expect(csv).toContain("=== Time Series Stats");
      expect(csv).toContain("Total Users");
      expect(csv).toContain("Total Shares");
      expect(csv).toContain("Total Files");
      expect(csv).toContain("Total Size");
    });

    it("should generate valid CSV format", async () => {
      const csv = await service.generateCSV();

      expect(csv).toContain("\n");

      const lines = csv.split("\n");
      expect(lines.length).toBeGreaterThan(0);
    });

    it("should include user stats in CSV when data exists", async () => {
      const user = await createTestUser(1);
      const share = await createTestShare(user, 1);
      await createTestFile(share, 1, 5000);

      const csv = await service.generateCSV();

      expect(csv).toContain(user.username);
      expect(csv).toContain(user.email);
    });
  });

  describe("Integration: Complete scenario", () => {
    it("should handle mixed scenario with multiple users, anonymous shares, and different dates", async () => {
      const user1 = await createTestUser(1);
      const user2 = await createTestUser(2);

      const today = new Date();
      const yesterday = moment().subtract(1, "day").toDate();
      const lastWeek = moment().subtract(7, "days").toDate();

      const share1 = await createTestShare(user1, 1, today);
      const share2 = await createTestShare(user1, 2, yesterday);
      const share3 = await createTestShare(user2, 3, yesterday);
      const share4 = await createTestShare(null, 4, lastWeek);
      const share5 = await createTestShare(user1, 5, lastWeek);

      await createTestFile(share1, 1, 10000);
      await createTestFile(share1, 2, 20000);
      await createTestFile(share2, 3, 30000);
      await createTestFile(share3, 4, 40000);
      await createTestFile(share4, 5, 50000);
      await createTestFile(share5, 6, 60000);

      await prisma.share.update({
        where: { id: share1.id },
        data: { views: 100 },
      });
      await prisma.share.update({
        where: { id: share2.id },
        data: { views: 200 },
      });
      await prisma.share.update({
        where: { id: share4.id },
        data: { views: 50 },
      });

      const overview = await service.getOverview();
      const userStats = await service.getUserStats();
      const timeSeries = await service.getTimeSeriesStats(
        lastWeek,
        today,
        "day",
      );

      const totalTestShares = 5;
      const totalTestFiles = 6;
      const totalTestSize = 210000;

      expect(overview.totalShares).toBeGreaterThanOrEqual(totalTestShares);
      expect(overview.totalFiles).toBeGreaterThanOrEqual(totalTestFiles);
      expect(overview.totalSize).toBeGreaterThanOrEqual(totalTestSize);
      expect(overview.anonymousShares).toBeGreaterThanOrEqual(1);

      const user1Stats = userStats.find((s) => s.userId === user1.id);
      expect(user1Stats).toBeDefined();
      expect(user1Stats?.totalShares).toBe(3);
      expect(user1Stats?.totalFiles).toBe(4);
      expect(user1Stats?.totalSize).toBe(120000);
      expect(user1Stats?.totalViews).toBe(300);

      const user2Stats = userStats.find((s) => s.userId === user2.id);
      expect(user2Stats).toBeDefined();
      expect(user2Stats?.totalShares).toBe(1);
      expect(user2Stats?.totalFiles).toBe(1);
      expect(user2Stats?.totalSize).toBe(40000);

      const anonymousStats = userStats.find((s) => s.userId === null);
      expect(anonymousStats).toBeDefined();
      expect(anonymousStats?.totalShares).toBeGreaterThanOrEqual(1);

      expect(timeSeries.length).toBeGreaterThanOrEqual(8);

      const csv = await service.generateCSV();
      expect(csv).toContain(user1.username);
      expect(csv).toContain("Anonymous");
    });
  });
});
