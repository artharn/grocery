const permissionRepository = require("../repositories/permission.repository");

const hasPermission = async (roleId, permissionCode) =>
  permissionRepository.roleHasPermission(roleId, permissionCode);

module.exports = { hasPermission };
