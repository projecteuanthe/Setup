import moment = require('moment');
import { MpcState } from 'setup-mpc-common';

export function defaultState(latestBlock: number): MpcState {
  return {
    name: 'default',
    sequence: 0,
    statusSequence: 0,
    startSequence: 0,
    ceremonyState: 'PRESELECTION',
    paused: false,
    startTime: moment().add(20, 'seconds'),
    endTime: moment().add(1, 'hour'),
    network: 'ropsten',
    latestBlock,
    selectBlock: latestBlock + 1,
    maxTier2: 0,
    minParticipants: 5,
    invalidateAfter: 180,
    participants: [],
  };
}
