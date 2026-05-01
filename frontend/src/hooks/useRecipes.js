import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/notion/recipes');
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const saveToNotion = useCallback(async (recipe) => {
    const saved = await api.post('/notion/recipes', recipe);
    setRecipes((prev) => [...prev, saved]);
    return saved;
  }, []);

  const searchRecipes = useCallback(async (query) => {
    if (!query.trim()) return recipes;
    const results = await api.get(`/notion/recipes/search?q=${encodeURIComponent(query)}`);
    return results;
  }, [recipes]);

  return { recipes, loading, error, refetch: fetchRecipes, saveToNotion, searchRecipes };
}
