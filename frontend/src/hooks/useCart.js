import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  async function fetchCart() {
    try { setCartItems(await api.get('/notion/cart')); }
    catch { /* silently fail */ }
    finally { setCartLoading(false); }
  }

  async function addItems(items) {
    const created = await api.post('/notion/cart', { items });
    setCartItems((prev) => [...prev, ...created]);
  }

  async function removeItem(id) {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
    await api.delete(`/notion/cart/${id}`);
  }

  async function clearItems() {
    setCartItems([]);
    await api.delete('/notion/cart');
  }

  useEffect(() => { fetchCart(); }, []);

  return { cartItems, cartLoading, addItems, removeItem, clearItems };
}
