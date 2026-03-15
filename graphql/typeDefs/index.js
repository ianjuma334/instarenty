import { gql } from 'graphql-tag';

import scalarTypeDefs from './scalar.js';
import queryTypeDefs from './query.js';
import responseTypeDefs from './responses.js';
import enumsTypeDefs from './enums.js';
import inputsTypeDefs from './inputs.js';
import userTypeDefs from './mutation/user.js'
import postTypeDefs from './mutation/post.js';
import systemTypeDefs from './mutation/system.js';
import extrastrucsTypeDefs from './extrastrucs.js';
import usertypesTypeDefs from './types/usertypes.js';
import posttypesTypeDefs from './types/posttypes.js';
import subscriptionTypeDefs from './types/subscriptionTypeDefs.js';
import messageTypeDefs from './types/messageTypeDefs.js'
import moneyFlowTypeDefs from './types/moneyFlowTypes.js';
import dashboardTypeDefs from './types/dashboardTypes.js';
import notificationTypeDefs from './types/notificationTypes.js';
import { typeDefs as mpesaTypeDefs } from '../../mpesa/mpesaSchemasGraph.js';


export default gql`
  ${scalarTypeDefs}
  ${queryTypeDefs}
  ${responseTypeDefs}
  ${enumsTypeDefs}
  ${inputsTypeDefs}
  ${userTypeDefs}
  ${postTypeDefs}
  ${systemTypeDefs}
  ${extrastrucsTypeDefs}
  ${usertypesTypeDefs}
  ${posttypesTypeDefs}
  ${subscriptionTypeDefs}
  ${messageTypeDefs}
  ${moneyFlowTypeDefs}
  ${dashboardTypeDefs}
  ${notificationTypeDefs}
  ${mpesaTypeDefs}

`;
