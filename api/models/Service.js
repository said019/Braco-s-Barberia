import { query } from '../config/database.js';

export const Service = {
  // Obtener todos los servicios activos
  async getAll() {
    const sql = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.duration_minutes,
        s.price,
        s.display_order,
        s.image_url,
        sc.id as category_id,
        sc.name as category_name
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.is_active = TRUE
      ORDER BY sc.display_order, s.display_order
    `;
    const result = await query(sql);
    return result.rows;
  },

  // Obtener servicios por categoría
  async getByCategory(categoryId) {
    const sql = `
      SELECT * FROM services
      WHERE category_id = $1 AND is_active = TRUE
      ORDER BY display_order
    `;
    const result = await query(sql, [categoryId]);
    return result.rows;
  },

  // Obtener servicio por ID
  async getById(id) {
    const sql = `
      SELECT 
        s.*,
        sc.name as category_name
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Obtener todas las categorías
  async getCategories() {
    const sql = `
      SELECT * FROM service_categories
      WHERE is_active = TRUE
      ORDER BY display_order
    `;
    const result = await query(sql);
    return result.rows;
  },

  // Crear servicio (admin)
  async create(serviceData) {
    const { category_id, name, description, duration_minutes, price, display_order } = serviceData;
    const sql = `
      INSERT INTO services (category_id, name, description, duration_minutes, price, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(sql, [category_id, name, description, duration_minutes, price, display_order || 0]);
    return result.rows[0];
  },

  // Actualizar servicio (admin)
  async update(id, serviceData) {
    const { name, description, duration_minutes, price, is_active } = serviceData;
    const sql = `
      UPDATE services
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          duration_minutes = COALESCE($4, duration_minutes),
          price = COALESCE($5, price),
          is_active = COALESCE($6, is_active)
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, name, description, duration_minutes, price, is_active]);
    return result.rows[0];
  },

  // Eliminar servicio (soft delete)
  async delete(id) {
    const sql = `UPDATE services SET is_active = FALSE WHERE id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },
};

export default Service;
