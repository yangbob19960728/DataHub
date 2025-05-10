import { useEffect, useState } from 'react';
import { dataIngestionService } from '../services/dataIngestionService';
import { FieldMapping } from '../contexts/dataIngestionContext';

export function usePreviewData(fieldMappings: FieldMapping[], apiData: any) {
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      try {
        const data = await dataIngestionService.parsePreviewData(apiData, fieldMappings);
        if (isMounted) {
          setPreviewData(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch preview data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchPreview();
    return () => { isMounted = false; };
  }, [apiData, fieldMappings]);

  return { previewData, loading, error };
}
