import moment = require('moment');
import { MpcState } from 'setup-mpc-common';
import { Address } from 'web3x/address';

export function defaultState(latestBlock: number, adminAddress: Address): MpcState {
  return {
    name: 'default',
    adminAddress,
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
