import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from 'primereact/button';
import { useHistory } from 'react-router-dom';

const DataProductPage = () => {
  const history = useHistory();
  return (
    <div className="w-min-0">
      <h2 className='mb-5'>
        Data Product
      </h2>
      <Button label="Create" onClick={() => history.push('/dataHub/data-product/create')}></Button>
    </div>
  );
};

export default DataProductPage;
