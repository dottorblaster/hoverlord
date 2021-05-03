const { stopVerdaccio } = require('./verdaccio');
module.exports = async () => {
  console.log(`Stopping verdaccio`);
  await stopVerdaccio();
  console.log(`Verdaccio stopped`);
};
