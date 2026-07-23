const pool = require("../../db/database");

const roleHasPermission = async (roleId, permissionCode) => {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1 AND p.code = $2
     ) AS allowed`,
    [roleId, permissionCode]
  );

  return result.rows[0].allowed;
};

const listCodesForRole = async (roleId) => {
  const result = await pool.query(
    `SELECT p.code
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.code ASC`,
    [roleId]
  );

  return result.rows.map((row) => row.code);
};

module.exports = { roleHasPermission, listCodesForRole };
