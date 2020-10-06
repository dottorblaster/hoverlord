const cluster = require('cluster');
const crypto = require('crypto');
const { writeFile } = require('fs');

const { fork, isMaster, isWorker, setupMaster } = cluster;

const sha256 = (data) =>
  crypto.createHash('sha256').update(data, 'binary').digest('hex');

const createWorkerContent = (jobCode) => `
  import { createRequire } from 'module';
  const require = createRequire('${process.cwd()}/');

  (${jobCode})();
`;

const spawn = (job) => {
  const jobCode = job.toString();
  const fileHash = sha256(jobCode);
  const workerPath = `/tmp/${fileHash}.mjs`;
  const workerContent = createWorkerContent(jobCode);
  writeFile(workerPath, workerContent, (err) => {
    if (err) {
      return console.log(`Error in creating ${workerPath}: ${err}`);
    }

    setupMaster({
      exec: workerPath,
      cwd: process.cwd(),
    });
    fork();
  });
};

const receive = (reducer, startState = undefined) => {
  let state = startState;
  process.on('message', (message) => {
    state = reducer(state, message);
  })
};

const send = (receiver, message) => {
  if (isMaster) {
    cluster.workers[receiver].send(message);
  } else {
    
  }
};

module.exports = { spawn, receive, send };
