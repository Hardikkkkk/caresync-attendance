import { gql } from '@apollo/client';

export const CLOCK_IN = gql`
  mutation ClockIn($userId: Int!, $note: String, $latitude: Float!, $longitude: Float!) {
    clockIn(userId: $userId, note: $note, latitude: $latitude, longitude: $longitude) {
      id
      type
      timestamp
    }
  }
`;

export const CLOCK_OUT = gql`
  mutation ClockOut($userId: Int!, $note: String, $latitude: Float!, $longitude: Float!) {
    clockOut(userId: $userId, note: $note, latitude: $latitude, longitude: $longitude) {
      id
      type
      timestamp
    }
  }
`;

export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    getUserByEmail(email: $email) {
      id
      name
      email
      role
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
    clockInTime
    latitude
    longitude
  }
}
`;

export const USER_EVENTS = gql`
  query UserEvents($userId: ID!) {
    clockEvents(userId: $userId) {
      type
      note
      latitude
      longitude
      timestamp
    }
  }
`;