"use strict";

const bootstrap = require("./bootstrap");
const { createOrderAdminController } = require("./controller");
const routes = require("./routes");
const { createOrderAdminService } = require("./service");

module.exports = () => ({
  bootstrap,
  controllers: {
    orders: createOrderAdminController,
  },
  routes,
  services: {
    orders: createOrderAdminService,
  },
});
