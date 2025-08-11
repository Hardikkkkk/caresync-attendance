import { gql } from '@apollo/client';

export const CURRENTLY_CLOCKED_IN = gql`
  query {
    currentlyClockedIn {
      id
      name
      email
    }
  }
`;

export const USER_EVENTS = gql`
  query ClockEvents($userId: Int!) {
    clockEvents(userId: $userId) {
      type
      note
      latitude
      longitude
      timestamp
    }
  }
`;

export const ALL_USERS = gql`
  query {
    users {
      id
      name
      email
      role
    }
  }
`;

export const STAFF_STATS = gql`
  query {
    staffClockStats {
      userId
      name
      totalHoursLastWeek
      avgDailyHours
      daysPresent
    }
  }
`;

export const GET_SETTING = gql`
  query GetSetting($name: String!) {
    getSetting(name: $name) {
      name
      value
    }
  }
`;

export const UPDATE_SETTING = gql`
  mutation UpdateSetting($name: String!, $value: String!) {
    updateSetting(name: $name, value: $value) {
      name
      value
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($name: String!, $email: String!, $role: String!) {
    createUser(name: $name, email: $email, role: $role) {
      id
      name
      email
      role
    }
  }
`;

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: Int!, $role: String!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      name
      role
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($userId: Int!) {
    deleteUser(userId: $userId)
  }
`;

export const DAILY_CLOCKIN_COUNT = gql`
  query {
    dailyClockInCount {
      date
      count
    }
  }
`;

export const TODAY_CLOCK_INS = gql`
  query TodayClockIns {
    todayClockIns {
      id
      user {
        id
        name
      }
      type
      timestamp
      latitude
      longitude
    }
  }
`;
