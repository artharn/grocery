const config = require("./config/env");
const app = require("./app");

app.listen(config.port, () => {
  console.log(`API Running on port ${config.port}`);
});
