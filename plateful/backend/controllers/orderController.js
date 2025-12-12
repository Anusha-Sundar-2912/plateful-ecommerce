import Stripe from 'stripe';
import Order from '../modals/order.js';
import 'dotenv/config';

/* ---------------- STRIPE SAFE INITIALIZER ---------------- */
const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key || typeof key !== 'string' || !key.startsWith('sk_')) {
        console.error('STRIPE_SECRET_KEY missing or invalid');
        return null;
    }

    return new Stripe(key);
};

/* ---------------- CREATE ORDER ---------------- */
export const createOrder = async (req, res) => {
    try {
        const {
            firstName, lastName, phone, email,
            address, city, zipCode,
            paymentMethod, subtotal, tax, total,
            items
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty items array' });
        }

        const orderItems = items.map(({ item, name, price, imageUrl, quantity }) => {
            const base = item || {};
            return {
                item: {
                    name: base.name || name || 'Unknown',
                    price: Number(base.price ?? price) || 0,
                    imageUrl: base.imageUrl || imageUrl || ''
                },
                quantity: Number(quantity) || 0
            };
        });

        const shippingCost = 0;
        let newOrder;

        /* ---------- ONLINE PAYMENT ---------- */
        if (paymentMethod === 'online') {
            const stripe = getStripe();
            if (!stripe) {
                return res.status(500).json({ message: 'Stripe not configured' });
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: orderItems.map(o => ({
                    price_data: {
                        currency: 'inr',
                        product_data: { name: o.item.name },
                        unit_amount: Math.round(o.item.price * 100)
                    },
                    quantity: o.quantity
                })),
                customer_email: email,
                success_url: `${process.env.FRONTEND_URL}/myorder/verify?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/checkout?payment_status=cancel`,
                metadata: { firstName, lastName, email, phone }
            });

            newOrder = new Order({
                user: req.user._id,
                firstName, lastName, phone, email,
                address, city, zipCode,
                paymentMethod, subtotal, tax, total,
                shipping: shippingCost,
                items: orderItems,
                paymentIntentId: session.payment_intent,
                sessionId: session.id,
                paymentStatus: 'pending'
            });

            await newOrder.save();
            return res.status(201).json({ order: newOrder, checkoutUrl: session.url });
        }

        /* ---------- CASH ON DELIVERY ---------- */
        newOrder = new Order({
            user: req.user._id,
            firstName, lastName, phone, email,
            address, city, zipCode,
            paymentMethod, subtotal, tax, total,
            shipping: shippingCost,
            items: orderItems,
            paymentStatus: 'succeeded'
        });

        await newOrder.save();
        res.status(201).json({ order: newOrder, checkoutUrl: null });

    } catch (error) {
        console.error('createOrder error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/* ---------------- CONFIRM PAYMENT ---------------- */
export const confirmPayment = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) {
            return res.status(400).json({ message: 'session_id required' });
        }

        const stripe = getStripe();
        if (!stripe) {
            return res.status(500).json({ message: 'Stripe not configured' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            const order = await Order.findOneAndUpdate(
                { sessionId: session_id },
                { paymentStatus: 'succeeded' },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            return res.json(order);
        }

        res.status(400).json({ message: 'Payment not completed' });

    } catch (error) {
        console.error('confirmPayment error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/* ---------------- GET USER ORDERS ---------------- */
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json(orders);
    } catch (error) {
        console.error('getOrders error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/* ---------------- GET ALL ORDERS (ADMIN) ---------------- */
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .lean();

        res.json(orders);
    } catch (error) {
        console.error('getAllOrders error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/* ---------------- UPDATE ANY ORDER (ADMIN) ---------------- */
export const updateAnyOrder = async (req, res) => {
    try {
        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('updateAnyOrder error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/* ---------------- GET ORDER BY ID ---------------- */
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.user.equals(req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (error) {
        console.error('getOrderById error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/* ---------------- UPDATE ORDER ---------------- */
export const updateOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.user.equals(req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json(updated);
    } catch (error) {
        console.error('updateOrder error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
