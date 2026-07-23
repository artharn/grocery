const healthRepository = require("../repositories/health.repository");

const checkHealth = async () => {
  const time = await healthRepository.pingDatabase();

  return {
    status: "OK",
    database: "CONNECTED With apply env",
    time,
  };
};

module.exports = { checkHealth };
