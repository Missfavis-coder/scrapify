import { env } from "./config/env.js";
import app from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    env: env.NODE_ENV,
  });
});