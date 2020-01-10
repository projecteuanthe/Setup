import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { cloneParticipant, MemoryFifo, MpcServer, MpcState, Participant, Transcript } from 'setup-mpc-common';
import { Downloader } from './downloader';
import { Uploader } from './uploader';
import { createReadStream, createWriteStream } from 'fs';

// wrapper object for new and contribute processes
class ComputeProcess extends EventEmitter {
  private proc?: ChildProcessWithoutNullStreams;

  constructor() {
    super();
  }

  public startNew() {
    const binPath = '../setup-tools/new';
    console.error(`Computing with: ${binPath}`);
    const proc = spawn(binPath, [process.env.SMALL ? 'circuit_small.json' : 'circuit.json', '../setup_db/new/transcript.dat']);
    this.proc = proc;
    this.setupListeners();
  }

  public startContribute() {
    const binPath = '../setup-tools/contribute';
    console.error(`Computing with: ${binPath}`);
    const proc = spawn(binPath, ['../setup_db/old/transcript.dat', 'asdf', '../setup_db/new/transcript.dat', '100']);
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
        .on('line', input => { this.emit('line', input) });

      this.proc.stderr.on('data', data => { this.emit('stderr', data) });

      this.proc.on('close', code => { this.emit('close', code) });

      this.proc.on('error', (...args) => { this.emit('error', ...args) });
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

  constructor(
    private state: MpcState,
    private myState: Participant,
    server: MpcServer,
    private computeOffline: boolean
  ) {
    this.downloader = new Downloader(server);
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

    const previousParticipant = this.state.participants
      .slice()
      .reverse()
      .find(p => p.state === 'COMPLETE');

    if (previousParticipant) {
      console.error('Previous participant found.');

      this.myState.transcripts.forEach(transcript => {
        // Reset download and upload progress as we are starting over.
        if (!this.downloader.isDownloaded(transcript)) {
          transcript.downloaded = 0;
        }
        transcript.uploaded = 0;

        // Add to downloaded queue regardless of if already downloaded. Will shortcut later in the downloader.
        this.downloader.put(transcript);
      });

      this.downloader.end();
    } else {
      console.error('We are the first participant.');
      this.downloader.end();

      this.myState.transcripts.forEach(transcript => {
        transcript.uploaded = 0;
      });

      this.computeQueue.put(`create`);
      this.computeQueue.end();
    }
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
      this.myState.fast = false;
      const setupProcess = new ComputeProcess();
      this.setupProc = setupProcess;

      setupProcess.on('line', this.handleSetupOutput.bind(this));

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
        if (cmd === 'create') {
          setupProcess.startNew();
        } else if (cmd === 'process') {
          setupProcess.startContribute();
        }
      }
    });
  }

  private async handleSetupOutput(data: Buffer) {
    console.error('From setup: ', data.toString());
    const params = data
      .toString()
      .replace('\n', '')
      .split(' ');
    const cmd = params.shift()!;
    switch (cmd) {
      case 'creating': {
        const transcript = this.myState.transcripts[0];
        transcript.size = 100;
        transcript.downloaded = 100;
        break;
      }
      case 'progress': {
        const computedPoints = +params[0];
        const totalPoints = +params[1];
        this.myState.computeProgress += 100 * computedPoints / totalPoints;
        break;
      }
      case 'wrote': {
        this.myState.computeProgress = 100;
        const transcriptFull = '../setup_db/new/transcript.dat';
        const lines = await this.countLines(transcriptFull);
        await this.splitFile(transcriptFull, '../setup_db/new/transcript', ".dat", lines);
        for (let i = 0; i < this.state.filesPerTranscript; i += 1) {
          this.uploader.put(i);
        }
        break;
      }
    }
  };

  private async splitFile(filenameIn: string, filenameOutPre: string, filenameOutPost: string, lineCount: number) {
    console.error(`splitting ${lineCount} lines`);
    let c = 0;
    const infileName = filenameIn;
    let fileCount = 0;
    let count = 0;
    let outStream : ReturnType<typeof createWriteStream>;
    let outfileName = filenameOutPre + fileCount + filenameOutPost;
    newWriteStream();
    const inStream = createReadStream(infileName);
    const lineReader = readline.createInterface({
      input: inStream
    });
    function newWriteStream(){
      outfileName = filenameOutPre + fileCount + filenameOutPost;
      outStream = createWriteStream(outfileName);
      count = 0;
    }
    lineReader.on('line', (line : string) => {
      count++;
      c++;
      outStream.write(line + '\n');
      console.error(fileCount + ' ' + count.toString() + ' ' + c.toString());
      if (count >= lineCount / this.state.filesPerTranscript) {
        fileCount++;
        console.error('file ', outfileName, count);
        outStream.end();
        newWriteStream();
      }
    });
    lineReader.on('close', () => {
      if (count > 0) {
        console.error('Final close:', outfileName, count);
      }
      inStream.close();
      outStream.end();
      console.error('Done');
    });
  }

  public countLines(filename: string): Promise<number> {
    // function copied from http://stackoverflow.com/questions/12453057/node-js-count-the-number-of-lines-in-a-file
    // with very few modifications
    let i;
    let count = 0;
    return new Promise((resolve, reject) => {
      createReadStream(filename)
        .once('error', e => {
          console.error("Failed to read file, likely too large and need es instead of fs", e);
          reject(-1);
        })
        .on('data', chunk => {
          for (i = 0; i < chunk.length; ++i) {
            if (chunk[i] === 10) {
              count++;
            }
          } // 10 = \n
        })
        .once('end', () => resolve(count));
    });
  };
  /*
  let lineCount = 0;
  await this.countLines(filename, (lineCountBack) => {lineCount = lineCountBack});
  console.error(lineCount, " lines"); // await this.splitFiles(filename, 100);
  await this.splitFiles(filename, "transcript", "idk_man_someone_fix_this.txt", lineCount)
  */

  public concatFiles(filePre: string, filePost: string, num: number) {

  }
}

