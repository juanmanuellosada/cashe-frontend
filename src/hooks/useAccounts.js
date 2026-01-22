import { useState, useEffect } from 'react';
import { getAccounts } from '../services/sheetsApi';

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAccounts();
        setAccounts(data.accounts || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { accounts, loading, error, refetch };
}
