const { startVerdaccio } = require('./verdaccio');

module.exports = async () => {
  console.log(`Starting verdaccio`);
  await startVerdaccio();
  console.log(`Verdaccio ready`);
};
