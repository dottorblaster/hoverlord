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
    return this.processes.hasOwnProperty(name);
  }

  getProcess(name) {
    if (this.isNamePresent(name)) {
      return this.processes[name];
    }
  }

  send(name, payload) {
    if (this.isNamePresent(name)) {
      const process = this.getProcess(name);
      process.send(payload);
      return true;
    }
    return false;
  }
}

const createSupervisor = () => new Supervisor();

module.exports = { createSupervisor };
