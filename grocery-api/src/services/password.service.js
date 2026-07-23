const bcrypt = require("bcryptjs");
const config = require("../config/env");

const hashPassword = async (plainPassword) =>
  bcrypt.hash(plainPassword, config.bcrypt.rounds);

const verifyPassword = async (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

module.exports = { hashPassword, verifyPassword };
