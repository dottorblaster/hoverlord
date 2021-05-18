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

  getProcessByName(name) {
    if (this.isNamePresent(name)) {
      return this.processes[name];
    }
  }

  getProcess(recipient) {
    return typeof recipient === 'string'
      ? this.getProcessByName(recipient)
      : this.getProcessByThreadId(recipient);
  }

  getProcessByThreadId(id) {
    for (const name in this.processes) {
      if (this.processes[name].threadId === id) {
        return this.processes[name];
      }
    }
  }

  send(recipient, payload) {
    const process = this.getProcess(recipient);

    if (process) {
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
