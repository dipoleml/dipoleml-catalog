const { validateSurface } = require('./validate-surface');

function runDoctor() {
  validateSurface();
  console.log('AI Dev Kit doctor: OK');
}

if (require.main === module) {
  runDoctor();
}

module.exports = { runDoctor };
