import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { cloneParticipant, MemoryFifo, MpcServer, MpcState, Participant, Transcript } from 'setup-mpc-common';
import { Downloader } from './downloader';
import { Uploader } from './uploader';
import * as fs from 'fs';

// wrapper object for new and contribute processes
class ComputeProcess extends EventEmitter {
  private proc?: ChildProcessWithoutNullStreams;

  constructor() {
    super();
  }

  public startContribute() {
    const binPath = '../setup-tools/contribute';
    console.error(`Computing with: ${binPath}`);
    const proc = spawn(binPath, ['../setup_db/old/params.params', '', '../setup_db/new/params.params', '100']);
    this.proc = proc;
    this.setupListeners();
  }

  private setupListeners() {
    if (this.proc) {
      readline
        .createInterface({
          input: this.proc.stdout,
          terminal: false,
        })
        .on('line', input => {
          this.emit('line', input);
        });

      this.proc.stderr.on('data', data => {
        this.emit('stderr', data);
      });

      this.proc.on('close', code => {
        this.emit('close', code);
      });

      this.proc.on('error', (...args) => {
        this.emit('error', ...args);
      });
    }
  }

  public kill(...args: any[]) {
    if (this.proc) {
      this.proc.kill(...args);
    }
  }
}

export class Compute {
  private setupProc?: ComputeProcess;
  private computeQueue: MemoryFifo<string> = new MemoryFifo();
  private downloader: Downloader;
  private uploader: Uploader;
  private isFirstParticipant: boolean;

  constructor(
    private state: MpcState,
    private myState: Participant,
    server: MpcServer,
    private computeOffline: boolean
  ) {
    const previousParticipant = this.state.participants
      .slice()
      .reverse()
      .find(p => p.state === 'COMPLETE');
    this.isFirstParticipant = !previousParticipant;
    this.downloader = new Downloader(server, this.isFirstParticipant);
    this.uploader = new Uploader(server, myState.address);
  }

  public async start() {
    if (this.computeOffline) {
      this.myState.runningState = 'OFFLINE';
      return;
    } else {
      this.myState.runningState = 'WAITING';
    }

    if (this.myState.runningState === 'WAITING') {
      this.myState.runningState = 'RUNNING';
    }

    await this.populateQueues();

    await Promise.all([this.runDownloader(), this.compute(), this.runUploader()]).catch(err => {
      console.error(err);
      this.cancel();
      throw err;
    });

    this.myState.runningState = 'COMPLETE';
    console.error('Compute ran to completion.');
  }

  public cancel() {
    this.downloader.cancel();
    this.uploader.cancel();
    this.computeQueue.cancel();
    if (this.setupProc) {
      this.setupProc.kill('SIGINT');
    }
  }

  public getParticipant() {
    return cloneParticipant(this.myState);
  }

  private async populateQueues() {
    this.myState.computeProgress = 0;

    this.myState.transcripts.forEach(transcript => {
      // Reset download and upload progress as we are starting over.
      if (!this.downloader.isDownloaded(transcript)) {
        transcript.downloaded = 0;
      }
      transcript.uploaded = 0;

      // Add to downloaded queue regardless of if already downloaded. Will shortcut later in the downloader.
      this.downloader.put(transcript);
    });
  }

  private async runDownloader() {
    this.downloader.on('downloaded', (transcript: Transcript) => {
      this.computeQueue.put(`process`);
    });

    this.downloader.on('progress', (transcript: Transcript, transferred: number) => {
      transcript.downloaded = transferred;
    });

    await this.downloader.run();

    this.computeQueue.end();
  }

  private async runUploader() {
    this.uploader.on('progress', (num: number, transferred: number) => {
      this.myState.transcripts[num].uploaded = transferred;
    });

    await this.uploader.run();
  }

  private async compute() {
    return new Promise(async (resolve, reject) => {
      const setupProcess = new ComputeProcess();
      this.setupProc = setupProcess;

      setupProcess.on('line', this.handleSetupOutput);

      setupProcess.on('stderr', data => {
        console.error(data.toString());
      });

      setupProcess.on('close', code => {
        this.setupProc = undefined;
        this.uploader.end();
        if (code === 0) {
          console.error(`Compute complete.`);
          resolve();
        } else {
          reject(new Error(`setup exited with code ${code}`));
        }
      });

      setupProcess.on('error', reject);

      console.error(`Compute starting...`);
      while (true) {
        const cmd = await this.computeQueue.get();
        if (!cmd) {
          break;
        }
        console.error(`Setup command: ${cmd}`);
        setupProcess.startContribute();
      }
    });
  }

  private handleSetupOutput = (data: Buffer) => {
    console.error('From setup: ', data.toString());
    const params = data
      .toString()
      .replace('\n', '')
      .split(' ');
    const cmd = params.shift()!;
    switch (cmd) {
      case 'starting': {
        // downloading done, starting process
        fs.stat('../setup_db/old/params.params', (_, stats) => {
          this.myState.transcripts[0].size = stats.size;
          this.myState.transcripts[0].downloaded = stats.size;
        });
        break;
      }
      case 'progress': {
        const computedPoints = +params[0];
        const totalPoints = +params[1];
        this.myState.computeProgress += (100 * computedPoints) / totalPoints;
        break;
      }
      case 'wrote': {
        this.uploader.put(0);
        this.myState.computeProgress = 100;
        fs.stat('../setup_db/new/params.params', (_, stats) => {
          // note that there will be a brief interval before this is calculated where transcript.size is stale
          // however we cannot put this.uploader.put(0) in this callback, because the uploader queue gets ended
          // as soon as the process is closed
          this.myState.transcripts[0].size = stats.size;
          this.myState.transcripts[0].downloaded = stats.size; // in case size changed, else terminal won't show 100% downloaded
        });
        break;
      }
    }
  };
}
