require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require('@prisma/client');
const { subDays } = require('date-fns');

const prisma = new PrismaClient();

// GraphQL schema
const typeDefs = gql`
  type User {
    id: Int!
    name: String!
    email: String!
    role: String!
  }

  type ClockEvent {
    id: Int!
    type: String!
    note: String
    latitude: Float!
    longitude: Float!
    timestamp: String!
    user: User!
  }

  type DailyClockIn {
  date: String!
  count: Int!
  }

  type StaffStats {
    userId: Int!
    name: String!
    totalHoursLastWeek: Float!
    avgDailyHours: Float!
    daysPresent: Int!
  }

  type Setting {
  id: Int!
  name: String!
  value: String!
  }

  type Query {
    users: [User!]!
    clockEvents(userId: Int!): [ClockEvent!]!
    currentlyClockedIn: [User!]!
    dailyClockInCount: [DailyClockIn!]!
    staffClockStats: [StaffStats!]!
    getUserByEmail(email: String!): User
    getSetting(name: String!): Setting
  }

  type Mutation {
    createUser(name: String!, email: String!, role: String!): User!
    updateUserRole(userId: Int!, role: String!): User!
    deleteUser(userId: Int!): Boolean!
    clockIn(userId: Int!, note: String, latitude: Float!, longitude: Float!): ClockEvent!
    clockOut(userId: Int!, note: String, latitude: Float!, longitude: Float!): ClockEvent!
    createUserIfNotExists(name: String!, email: String!): User!
    updateSetting(name: String!, value: String!): Setting!
  }

  type TodayClockIn {
  user: User
  clockInTime: String
  clockOutTime: String
  latitude: Float
  longitude: Float
  }

`;

const resolvers = {
  Query: {
    getSetting: (_, { name }) => prisma.setting.findUnique({ where: { name } }),
    users: () => prisma.user.findMany(),

    clockEvents: (_, { userId }) =>
      prisma.clockEvent.findMany({ where: { userId } }),

    currentlyClockedIn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const users = await prisma.user.findMany({
        include: {
          clockEvents: {
            where: {
              timestamp: { gte: startOfToday },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      const clockedInUsers = users.filter(user => {
        const todayEvents = user.clockEvents;
        return todayEvents.length > 0 && todayEvents[0].type === 'IN';
      });

      return clockedInUsers;
    },

dailyClockInCount: async (_, __, { prisma }) => {
  const result = await prisma.$queryRaw`
    SELECT 
      TO_CHAR((timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date,
      COUNT(DISTINCT "userId")::int AS count
    FROM "ClockEvent"
    WHERE type = 'IN'
      AND (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (CURRENT_DATE - interval '6 days')
    GROUP BY date
    ORDER BY date DESC;
  `;

  // Reverse to show oldest first
  return result.map(r => ({
    date: r.date,
    count: Number(r.count) // ensure it's an actual JS integer
  })).reverse();
},



    staffClockStats: async () => {
      const users = await prisma.user.findMany();
      const today = new Date();
      const weekAgo = subDays(today, 7);

      const stats = [];

      for (const user of users) {
        const events = await prisma.clockEvent.findMany({
          where: {
            userId: user.id,
            timestamp: { gte: weekAgo, lte: today },
          },
          orderBy: { timestamp: 'asc' },
        });

        let totalHours = 0;
        let dailyLogs = {};

        for (let i = 0; i < events.length; i++) {
          if (events[i].type === 'IN' && events[i + 1]?.type === 'OUT') {
            const inTime = new Date(events[i].timestamp);
            const outTime = new Date(events[i + 1].timestamp);
            const hours = (outTime - inTime) / (1000 * 60 * 60);
            totalHours += hours;

            const day = inTime.toISOString().slice(0, 10);
            dailyLogs[day] = (dailyLogs[day] || 0) + hours;
            i++; // skip next OUT event
          }
        }

        stats.push({
          userId: user.id,
          name: user.name,
          totalHoursLastWeek: parseFloat(totalHours.toFixed(2)),
          avgDailyHours: parseFloat((totalHours / Object.keys(dailyLogs).length || 1).toFixed(2)),
          daysPresent: Object.keys(dailyLogs).length,
        });
      }

      return stats;
    },

    getUserByEmail: async (_, { email }) => {
      return prisma.user.findUnique({ where: { email } });
    },
  },

  Mutation: {
    createUserIfNotExists: async (_, { name, email }) => {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return existingUser;

      return prisma.user.create({
        data: {
          name,
          email,
          role: 'careworker',
        },
      });
    },

    createUser: (_, args) => prisma.user.create({ data: args }),

    updateUserRole: async (_, { userId, role }) => {
    return prisma.user.update({
    where: { id: userId },
    data: { role },
    });
  },

    deleteUser: async (_, { userId }) => {
    await prisma.user.delete({ where: { id: userId } });
    return true;
  },

    clockIn: (_, { userId, note, latitude, longitude }) =>
      prisma.clockEvent.create({
        data: { userId, note, type: 'IN', latitude, longitude },
      }),

clockOut: async (_, { userId, note, latitude, longitude }) => {
  console.log(">>> clockOut resolver called with:", { userId, note, latitude, longitude });

  try {
    const result = await prisma.clockEvent.create({
      data: { userId, note, type: 'OUT', latitude, longitude },
    });
    console.log(">>> Clock out success:", result);
    return result;
  } catch (error) {
    console.error("❌ Error during clockOut:", error);
    throw new Error("Failed to clock out.");
  }
},
updateSetting: async (_, { name, value }) => {
    return prisma.setting.upsert({
      where: { name },
      update: { value },
      create: { name, value },
    });
  },

  },

  ClockEvent: {
    user: (parent) => prisma.user.findUnique({ where: { id: parent.userId } }),
  },
};

// Start Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    prisma,
    // You can pass other context like auth user here
  }),
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
