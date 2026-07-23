const permissionRepository = require("../repositories/permission.repository");

const hasPermission = async (roleId, permissionCode) =>
  permissionRepository.roleHasPermission(roleId, permissionCode);

const listPermissionCodes = async (roleId) => permissionRepository.listCodesForRole(roleId);

module.exports = { hasPermission, listPermissionCodes };
