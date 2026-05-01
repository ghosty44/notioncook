import { useState, useCallback } from 'react';
import api from '../utils/api';

export function useGemini() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuggestions = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { count = 3, excludeNames = [], preferences = '', mealType = '' } = options;
      const data = await api.post('/gemini/suggest-multiple', {
        count,
        excludeNames,
        preferences,
        mealType,
      });
      setSuggestions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const recipe = await api.post('/gemini/suggest', options);
      setSuggestions((prev) => [...prev, recipe]);
      return recipe;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeSuggestion = useCallback((id) => {
    setSuggestions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { suggestions, loading, error, fetchSuggestions, fetchOne, removeSuggestion, setSuggestions };
}
