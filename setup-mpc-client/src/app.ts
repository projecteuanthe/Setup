import moment from 'moment';
import { applyDelta, cloneParticipant, MpcServer, MpcState, Participant } from 'setup-mpc-common';
import { Writable } from 'stream';
import { Account } from 'web3x/account';
import { Compute } from './compute';
import { TerminalInterface } from './terminal-interface';
import { TerminalKit } from './terminal-kit';

export class App {
  private interval!: NodeJS.Timeout;
  private terminalInterface!: TerminalInterface;
  private compute?: Compute;
  private state?: MpcState;

  constructor(
    private server: MpcServer,
    private account: Account | undefined,
    stream: Writable,
    height: number,
    width: number,
    private computeOffline = false
  ) {
    const termKit = new TerminalKit(stream, height, width);
    this.terminalInterface = new TerminalInterface(termKit, this.account);
  }

  public start() {
    this.updateState();
  }

  public stop() {
    clearTimeout(this.interval);
    this.terminalInterface.hideCursor(false);
  }

  public resize(width: number, height: number) {
    this.terminalInterface.resize(width, height);
  }

  private updateState = async () => {
    try {
      // Then get the latest state from the server.
      const remoteStateDelta = await this.server.getState(this.state ? this.state.sequence : undefined);

      if (!this.state) {
        this.state = remoteStateDelta;
      } else if (this.state.startSequence !== remoteStateDelta.startSequence) {
        this.state = await this.server.getState();
      } else {
        this.state = applyDelta(this.state, remoteStateDelta);
      }

      // Start or stop computation.
      await this.processRemoteState(this.state);

      await this.terminalInterface.updateState(this.state);

      // Send any local state changes to the server.
      await this.updateRemoteState();

      this.scheduleUpdate();
    } catch (err) {
      // If we fail to communicate properly with server, we can still update terminal state locally.
      if (this.compute) {
        const myState = this.compute.getParticipant();
        myState.lastUpdate = moment();
        const termState = this.terminalInterface.getParticipant(myState.address);
        this.terminalInterface.updateParticipant(this.mergeLocalAndRemoteParticipantState(myState, termState));
      } else if (this.state) {
        this.terminalInterface.updateState(this.state);
      }

      this.scheduleUpdate();
      console.error(err);
    }
  };

  private scheduleUpdate = () => {
    this.interval = setTimeout(this.updateState, 1000);
  };

  /*
    Given a remote state, this function will trigger or destroy the compute pipeline.
    It will return a new local state, which may differ from the remote state as our local compute state takes priority
    over the servers view of our state.
  */
  private async processRemoteState(remoteState: MpcState) {
    if (!this.account) {
      // We are in spectator mode.
      return;
    }

    const myIndex = remoteState.participants.findIndex(p => p.address.equals(this.account!.address));
    if (myIndex < 0) {
      // We're an unknown participant.
      return;
    }
    const myRemoteState = remoteState.participants[myIndex];

    // Either launch or destroy the computation based on remote state.
    if (myRemoteState.state === 'RUNNING' && !this.compute) {
      // Compute takes a copy of the participants state. It can modify at will, and emits 'update' events as modified.
      this.compute = new Compute(remoteState, cloneParticipant(myRemoteState), this.server, this.computeOffline);

      this.compute.start().catch(err => {
        console.error(`Compute failed: `, err);
      });
    } else if (myRemoteState.state !== 'RUNNING' && this.compute) {
      this.compute.cancel();
      this.compute = undefined;
    }
  }

  private mergeLocalAndRemoteParticipantState(local: Participant, remote: Participant): Participant {
    // Retain mutable fields controlled by server.
    return {
      ...cloneParticipant(local),
      state: remote.state,
      verifyProgress: remote.verifyProgress,
      completedAt: remote.completedAt,
      startedAt: remote.startedAt,
    };
  }

  private updateRemoteState = async () => {
    if (!this.account) {
      return;
    }

    if (this.compute) {
      const myState = this.compute.getParticipant();
      await this.server.updateParticipant(myState);
    } else {
      await this.server.ping(this.account.address);
    }
  };
}
