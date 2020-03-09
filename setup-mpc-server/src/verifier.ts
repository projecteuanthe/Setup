import { ChildProcess, spawn } from 'child_process';
import { MemoryFifo } from 'setup-mpc-common';
import { Address } from 'web3x/address';
import { TranscriptStore } from './transcript-store';

export interface VerifyItem {
  address: Address;
  num: number;
}

export class Verifier {
  private queue: MemoryFifo<VerifyItem> = new MemoryFifo();
  public lastCompleteAddress?: Address;
  public runningAddress?: Address;
  private proc?: ChildProcess;
  private cancelled = false;

  constructor(
    private store: TranscriptStore,
    private cb: (address: Address, num: number, verified: boolean) => Promise<void>
  ) {}

  public async active() {
    return this.proc || (await this.queue.length());
  }

  public async run() {
    console.log('Verifier started...');
    while (true) {
      const item = await this.queue.get();
      if (!item) {
        break;
      }
      const { address, num } = item;
      const transcriptPath = this.store.getUnverifiedTranscriptPath(address, num);

      try {
        if (!this.runningAddress) {
          // If we dequeued an item, someone should be running.
          throw new Error('No running address set.');
        }

        if (!this.runningAddress.equals(address)) {
          // This address is no longer running. Just skip.
          continue;
        }

        if (await this.verifyTranscript(address, num, transcriptPath)) {
          console.log(`Verification succeeded: ${transcriptPath}...`);

          await this.cb(address, num, true);
        } else {
          await this.store.eraseUnverified(address, num);
          if (!this.cancelled) {
            await this.cb(address, num, false);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    console.log('Verifier completed.');
  }

  public put(item: VerifyItem) {
    this.queue.put(item);
  }

  public cancel() {
    this.cancelled = true;
    this.queue.cancel();
    if (this.proc) {
      this.proc.kill();
    }
  }

  private async verifyTranscript(address: Address, transcriptNumber: number, transcriptPath: string) {
    console.log(`Verifiying transcript ${transcriptNumber}...`);
    return new Promise<boolean>(resolve => {
      // call verify_contribution if this is not the first transcript
      const args = [
        'initial/circuit.json',
        this.lastCompleteAddress
          ? this.store.getVerifiedTranscriptPath(this.lastCompleteAddress, 0)
          : this.store.getInitialParametersPath(),
        this.store.getUnverifiedTranscriptPath(address, 0),
        'initial',
      ];
      const binPath = '../setup-tools/verify_contribution';
      const verify = spawn(binPath, args);
      this.proc = verify;

      verify.stdout.on('data', data => {
        console.log(data.toString());
      });

      verify.stderr.on('data', data => {
        console.log(data.toString());
      });

      verify.on('close', code => {
        this.proc = undefined;
        resolve(code === 0);
      });
    });
  }
}
