class Supervisor {
  processes = {};

  remove(name) {
    if (this.isNamePresent(name)) {
      const { processes } = this;
      delete processes[name];
    }
    return this.processes;
  }

  store(name, newProcess) {
    const { processes } = this;
    this.processes = {
      ...processes,
      [name]: newProcess,
    };
  }

  isNamePresent(name) {
    return Object.prototype.hasOwnProperty.call(this.processes, name);
  }

  getProcess(name) {
    if (this.isNamePresent(name)) {
      return this.processes[name];
    }
  }

  // TODO
  getProcessByThreadId(id) {
    return id;
  }

  send(recipient, payload) {
    if (typeof recipient === 'number') {
      for (const name in this.processes) {
        if (this.processes[name].threadId === recipient) {
          this.processes[name].postMessage(payload);
          return true;
        }
      }
    }

    if (typeof recipient === 'string' && this.isNamePresent(recipient)) {
      const process = this.getProcess(recipient);
      process.postMessage(payload);
      return true;
    }
    return false;
  }

  shutdown() {
    for (const name in this.processes) {
      this.processes[name].terminate();
    }
  }
}

const createSupervisor = () => new Supervisor();

module.exports = { createSupervisor };
