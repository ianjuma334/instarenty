import { gql } from 'graphql-tag';

const dashboardTypes = gql`
  type DashboardStats {
    totalUsers: Int!
    activePosts: Int!
    totalPosts: Int!
    totalReports: Int!
    pendingReports: Int!
  }
`;

export default dashboardTypes;