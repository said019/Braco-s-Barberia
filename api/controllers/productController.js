import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
};

function setNoCacheHeaders(res) {
    Object.entries(NO_CACHE_HEADERS).forEach(([header, value]) => {
        res.set(header, value);
    });
}

export const productController = {
    // GET /api/products - Obtener todos los productos
    async getAll(req, res, next) {
        try {
            const products = await Product.getAll();
            setNoCacheHeaders(res);
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
            setNoCacheHeaders(res);
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
