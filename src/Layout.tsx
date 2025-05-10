import * as React from 'react';
import { DataIngestionProvider } from './contexts/dataIngestionContext';

export default ({children}) => {
  return (
    <>
      <DataIngestionProvider>
        {children}
      </DataIngestionProvider>
    </>
  );
};
