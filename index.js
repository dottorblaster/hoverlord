const { Worker, isMainThread, parentPort } = require('worker_threads');
const crypto = require('crypto');
const { writeFile } = require('fs');

const { createSupervisor } = require('./supervisor');

const masterSupervisor = isMainThread ? createSupervisor() : null;

const isFromWorker = payload => Boolean(payload.fromWorker);

const sha256 = data =>
  crypto
    .createHash('sha256')
    .update(data, 'binary')
    .digest('hex');

const createWorkerContent = jobCode => `
  import { createRequire } from 'module';
  const require = createRequire('${process.cwd()}/');
  
  (${jobCode})();
`;

const spawn = (job, name) => {
  const jobCode = job.toString();
  const fileHash = sha256(jobCode);
  const workerPath = `/tmp/${fileHash}.mjs`;
  const workerContent = createWorkerContent(jobCode);
  writeFile(workerPath, workerContent, err => {
    if (err) {
      return console.error(`Error in creating ${workerPath}: ${err}`);
    }

    const actor = new Worker(workerPath);
    actor.on('message', payload => {
      if (isFromWorker(payload)) {
        const { recipient, message } = payload;
        masterSupervisor.send(recipient, message);
      }
    });
    masterSupervisor.store(name, actor);
  });
};

const receive = (reducer, startState = undefined) => {
  let state = startState;
  parentPort.on('message', message => {
    state = reducer(state, message);
  });
};

const send = (recipient, message) => {
  if (isMainThread) {
    masterSupervisor.send(recipient, message);
  } else {
    parentPort.postMessage({ fromWorker: true, recipient, message });
  }
};

module.exports = { spawn, receive, send, createSupervisor };
