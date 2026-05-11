import { useState } from 'react';
import api from '../utils/api';

export function useBatch() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generateRecipes(preferences, count = 2) {
    try {
      setLoading(true);
      setError(null);
      const results = await api.post('/gemini/generate', { preferences, count });
      setSuggestions(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateFromImage(imageBase64, mimeType) {
    try {
      setLoading(true);
      setError(null);
      const recipe = await api.post('/gemini/recipe-from-image', { imageBase64, mimeType });
      setSuggestions((prev) => [recipe, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateFromUrl(url) {
    try {
      setLoading(true);
      setError(null);
      const recipe = await api.post('/gemini/recipe-from-url', { url });
      setSuggestions((prev) => [recipe, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { suggestions, loading, error, generateRecipes, generateFromImage, generateFromUrl };
}
