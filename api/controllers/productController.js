import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

export const productController = {
    // GET /api/products - Obtener todos los productos
    async getAll(req, res, next) {
        try {
            const products = await Product.getAll();
            res.json({
                success: true,
                data: products,
                count: products.length
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/products/:id - Obtener producto por ID
    async getById(req, res, next) {
        try {
            const product = await Product.getById(req.params.id);
            if (!product) {
                throw new AppError('Producto no encontrado', 404);
            }
            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            next(error);
        }
    }
};

export default productController;
