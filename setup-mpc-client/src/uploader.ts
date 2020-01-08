import { EventEmitter } from 'events';
import { statSync, unlink, createReadStream, createWriteStream } from 'fs';
import { MemoryFifo, MpcServer } from 'setup-mpc-common';
import { Address } from 'web3x/address';
import * as readline from 'readline';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Uploader extends EventEmitter {
  private cancelled = false;
  private queue: MemoryFifo<number> = new MemoryFifo();

  constructor(private server: MpcServer, private address: Address) {
    super();
  }

  public async run() {
    console.error('Uploader starting...');
    while (true) {
      const num = await this.queue.get();
      console.error('Uploader got num ', num);
      if (num === null) {
        break;
      }
      await this.uploadTranscriptWithRetry(num);
    }
    console.error('Uploader complete.');
  }

  public put(transcriptNum: number) {
    this.queue.put(transcriptNum);
  }

  public cancel() {
    this.cancelled = true;
    this.queue.cancel();
  }

  public end() {
    this.queue.end();
  }

  public async splitFiles(filenameIn: string, filenameOutPre: string, filenameOutPost: string, lineCount: number) {
    var infileName = filenameIn;
    var fileCount = 0;
    var count = 0;
    var outStream : ReturnType<typeof createWriteStream>;
    var outfileName = filenameOutPre + fileCount + filenameOutPost;
    newWriteStream();
    var inStream = createReadStream(infileName);
    var lineReader = readline.createInterface({
        input: inStream
    });
    function newWriteStream(){
        outfileName = filenameOutPre + fileCount + filenameOutPost;
        outStream = createWriteStream(outfileName);
        count = 0;
    }
    lineReader.on('line', function(line : string) { //:string?
        count++;
        outStream.write(line + '\n');
        if (count >= lineCount / 20) {
            fileCount++;
            console.error('file ', outfileName, count);
            outStream.end();
            newWriteStream();
        }
    });
    lineReader.on('close', function() {
        if (count > 0) {
            console.error('Final close:', outfileName, count);
        }
        inStream.close();
        outStream.end();
        console.error('Done');
    });
  }
  
  // public async callbackFn (filename: string, count: number) {  // confusing as fuck
  //   console.log("Line count", count)
  //   await this.splitFiles(filename, count)
  // }

  public async countLines(filename: string, callback: (count: number) => void) {
    // function copied from http://stackoverflow.com/questions/12453057/node-js-count-the-number-of-lines-in-a-file
    // with very few modifications
    let i;
    let count = 0;
    return createReadStream(filename)
        .on('error', e => {
          console.error("Failed to read file, likely too large and need es instead of fs", e);
          callback(-1);
        })
        .on('data', chunk => {
            for (i=0; i < chunk.length; ++i) if (chunk[i] == 10) count++; // 10 = \n
        })
        .on('end', () => callback(count));
  };

  private async uploadTranscriptWithRetry(num: number) {
    const filename = `../setup_db/new/params.params`;
    while (!this.cancelled) {
      try {
        console.error(`Uploading: `, filename);
        const filesizeInMb = statSync(filename).size / 1000000.0;
        console.error(filesizeInMb, " mb", statSync(filename))
        
        let lineCount = 0;
        await this.countLines(filename, (lineCountBack) => {lineCount = lineCountBack});
        console.error(lineCount, " lines"); // await this.splitFiles(filename, 100);
        await this.splitFiles(filename, "transcript", "idk_man_someone_fix_this.txt", lineCount)
        await this.server.uploadData(this.address, num, filename, undefined, transferred => {
          this.emit('progress', num, transferred);
        });
        await new Promise(resolve => unlink(filename, resolve));
        this.emit('uploaded', num);
        break;
      } catch (err) {
        console.error(`Failed to upload transcript ${num}: ${err.message}`);
        await sleep(1000);
      }
    }
  }
}
