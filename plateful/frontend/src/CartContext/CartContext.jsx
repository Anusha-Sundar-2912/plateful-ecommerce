import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE_CART':
      return Array.isArray(action.payload)
        ? action.payload
        : Array.isArray(action.payload?.items)
        ? action.payload.items
        : [];
    case 'ADD_ITEM': {
      const { _id, item, quantity } = action.payload;
      const exists = state.find(ci => ci._id === _id);
      if (exists) {
        return state.map(ci =>
          ci._id === _id ? { ...ci, quantity: ci.quantity + quantity } : ci
        );
      }
      return [...state, { _id, item, quantity }];
    }
    case 'UPDATE_ITEM':
      return state.map(ci =>
        ci._id === action.payload._id
          ? { ...ci, quantity: action.payload.quantity }
          : ci
      );
    case 'REMOVE_ITEM':
      return state.filter(ci => ci._id !== action.payload);
    case 'CLEAR_CART':
      return [];
    default:
      return state;
  }
};

const initializer = () => {
  try {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [cartItems, dispatch] = useReducer(cartReducer, [], initializer);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    axios
      .get(`${API_BASE_URL}/api/cart`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => dispatch({ type: 'HYDRATE_CART', payload: res.data }))
      .catch(err => {
        if (err.response?.status !== 401) console.error(err);
      });
  }, []);

  const addToCart = useCallback(async (item, qty) => {
    const token = localStorage.getItem('authToken');
    const res = await axios.post(
      `${API_BASE_URL}/api/cart`,
      { itemId: item._id, quantity: qty },
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: 'ADD_ITEM', payload: res.data });
  }, []);

  const updateQuantity = useCallback(async (_id, qty) => {
    const token = localStorage.getItem('authToken');
    const res = await axios.put(
      `${API_BASE_URL}/api/cart/${_id}`,
      { quantity: qty },
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: 'UPDATE_ITEM', payload: res.data });
  }, []);

  const removeFromCart = useCallback(async _id => {
    const token = localStorage.getItem('authToken');
    await axios.delete(
      `${API_BASE_URL}/api/cart/${_id}`,
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: 'REMOVE_ITEM', payload: _id });
  }, []);

  const clearCart = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    await axios.post(
      `${API_BASE_URL}/api/cart/clear`,
      {},
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const safeCart = Array.isArray(cartItems) ? cartItems : [];

  const totalItems = safeCart.reduce(
    (sum, ci) => sum + (ci?.quantity ?? 0),
    0
  );

  const totalAmount = safeCart.reduce(
    (sum, ci) => sum + (ci?.item?.price ?? 0) * (ci?.quantity ?? 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems: safeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
