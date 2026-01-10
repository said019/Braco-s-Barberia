import { query } from '../config/database.js';

export const Product = {
  // Obtener todos los productos activos
  async getAll() {
    const sql = `
      SELECT * FROM products
      WHERE is_active = TRUE
      ORDER BY name
    `;
    const result = await query(sql);
    return result.rows;
  },

  // Obtener producto por ID
  async getById(id) {
    const sql = `SELECT * FROM products WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Crear producto (admin)
  async create(productData) {
    const { name, description, price, stock, image_url } = productData;
    const sql = `
      INSERT INTO products (name, description, price, stock, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [name, description, price, stock || 0, image_url || null]);
    return result.rows[0];
  },

  // Actualizar producto
  async update(id, productData) {
    const { name, description, price, stock, is_active, image_url } = productData;
    const sql = `
      UPDATE products
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          stock = COALESCE($5, stock),
          is_active = COALESCE($6, is_active),
          image_url = COALESCE($7, image_url)
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, name, description, price, stock, is_active, image_url]);
    return result.rows[0];
  },

  // Actualizar stock
  async updateStock(id, quantity) {
    const sql = `
      UPDATE products
      SET stock = stock + $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, quantity]);
    return result.rows[0];
  },

  // Verificar stock disponible
  async checkStock(id, quantity) {
    const sql = `SELECT stock FROM products WHERE id = $1`;
    const result = await query(sql, [id]);
    if (!result.rows[0]) return false;
    return result.rows[0].stock >= quantity;
  },

  // Eliminar producto (soft delete)
  async delete(id) {
    const sql = `UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },
};

export default Product;
