import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchRecipes() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/notion/recipes');
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion(recipe) {
    const saved = await api.post('/notion/recipes', recipe);
    setRecipes((prev) => [...prev, saved]);
    return saved;
  }

  async function deleteRecipeById(id) {
    await api.delete(`/notion/recipes/${id}`);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  async function updateRecipe(id, fields) {
    const updated = await api.patch(`/notion/recipes/${id}`, fields);
    setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }

  useEffect(() => { fetchRecipes(); }, []);

  return { recipes, loading, error, refetch: fetchRecipes, saveToNotion, deleteRecipeById, updateRecipe };
}
