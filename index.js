const cluster = require('cluster');
const crypto = require('crypto');
const { writeFile } = require('fs');

const { createSupervisor } = require('./supervisor');

const { fork, isMaster, isWorker, setupMaster } = cluster;

const masterSupervisor = isMaster ? createSupervisor() : null;

const isFromWorker = (payload) => Boolean(payload.fromWorker);

const sha256 = (data) =>
  crypto.createHash('sha256').update(data, 'binary').digest('hex');

const createWorkerContent = (jobCode) => `
  import { createRequire } from 'module';
  const require = createRequire('${process.cwd()}/');

  (${jobCode})();
`;

const spawn = (job, name) => {
  const jobCode = job.toString();
  const fileHash = sha256(jobCode);
  const workerPath = `/tmp/${fileHash}.mjs`;
  const workerContent = createWorkerContent(jobCode);
  writeFile(workerPath, workerContent, (err) => {
    if (err) {
      return console.error(`Error in creating ${workerPath}: ${err}`);
    }

    setupMaster({
      exec: workerPath,
      cwd: process.cwd(),
    });

    const child = fork();
    child.on('message', (payload) => {
      if (isFromWorker(payload)) {
        const { recipient, message } = payload;
        masterSupervisor.send(recipient, message);
      }
    });
    masterSupervisor.store(name, child);
  });
};

const receive = (reducer, startState = undefined) => {
  let state = startState;
  process.on('message', (message) => {
    state = reducer(state, message);
  })
};

const send = (recipient, message) => {
  if (isMaster) {
    masterSupervisor.send(recipient, message);
  } else {
    process.send({ fromWorker: true, recipient, message }); 
  }
};

module.exports = { spawn, receive, send, createSupervisor };
