const {
  Worker,
  isMainThread,
  parentPort,
  threadId,
} = require('worker_threads');
const crypto = require('crypto');
const { writeFile } = require('fs');

const { createSupervisor } = require('./supervisor');

const masterSupervisor = isMainThread ? createSupervisor() : null;

const isFromWorker = (payload) => Boolean(payload.fromWorker);

const createFingerprint = () => Math.random().toString(36).substring(2);

const sha256 = (data) =>
  crypto.createHash('sha256').update(data, 'binary').digest('hex');

const createWorkerContent = (jobCode) => `
  import { createRequire } from 'module';
  const require = createRequire('${process.cwd()}/');
  
  (${jobCode})();
`;

const spawn = (job, name) => {
  return new Promise((resolve) => {
    const jobCode = job.toString();
    const fileHash = sha256(jobCode);
    const workerPath = `/tmp/${fileHash}.mjs`;
    const workerContent = createWorkerContent(jobCode);
    writeFile(workerPath, workerContent, (err) => {
      if (err) {
        return console.error(`Error in creating ${workerPath}: ${err}`);
      }

      const actor = new Worker(workerPath);
      actor.on('message', (payload) => {
        if (isFromWorker(payload)) {
          const { recipient } = payload;
          masterSupervisor.send(recipient, payload);
        }
      });
      masterSupervisor.store(name, actor);
      resolve(actor);
    });
  });
};

const receive = (reducer, startState = undefined) => {
  let state = startState;
  parentPort.on('message', (message) => {
    state = reducer(state, message);
  });
};

const send = (recipient, content) => {
  if (isMainThread) {
    masterSupervisor.send(recipient, { content });
  } else {
    parentPort.postMessage({ fromWorker: true, recipient, content });
  }
};

const reply = (request, response) => {
  const { fingerprint: requestFingerprint, sender: requestSender } = request;
  const message = {
    requestSender,
    content: response,
    recipient: requestSender,
    fingerprint: requestFingerprint,
    sender: threadId,
    fromWorker: !isMainThread,
  };

  if (isMainThread) {
    masterSupervisor.send(message);
  } else {
    parentPort.postMessage(message);
  }
};

const call = (recipient, messageContent) => {
  return new Promise((resolve) => {
    const fingerprint = createFingerprint();

    const message = {
      recipient,
      fingerprint,
      content: messageContent,
      sender: threadId,
      fromWorker: !isMainThread,
    };

    if (isMainThread) {
      const actor = masterSupervisor.getProcess(recipient);
      actor.on('message', (payload) => {
        if (payload.fingerprint === fingerprint) {
          resolve(payload);
        }
      });
      masterSupervisor.send(recipient, message);
    } else {
      parentPort.on('message', (payload) => {
        if (payload.fingerprint === fingerprint) {
          resolve(payload);
        }
      });
      parentPort.postMessage(message);
    }
  });
};

const shutdown = (supervisor = masterSupervisor) => {
  supervisor.shutdown();
};

module.exports = {
  spawn,
  receive,
  send,
  call,
  reply,
  shutdown,
  createSupervisor,
  masterSupervisor,
};
